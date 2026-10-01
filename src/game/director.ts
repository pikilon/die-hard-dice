import type { RapierCollider, RapierRigidBody } from '@react-three/rapier';
import { Euler, Mesh, Plane, Quaternion, Raycaster, Vector2, Vector3, type Camera } from 'three';
import { create } from 'zustand';
import { cryptoRng } from '../model/ids';
import { placeFace, randomMapping } from '../model/solids';
import type { Die } from '../model/types';
import { useTable } from '../store/table';
import { slotDirection, topSlot, type SolidDef } from '../three/solids';
import { commitRoll } from './session';
import { haptic, unlockAudio, whoosh } from './sound';

/** Rapier body types (see RigidBodyType in rapier3d-compat). */
const DYNAMIC = 0;
const FIXED = 1;
const KINEMATIC = 2;

const UP = new Vector3(0, 1, 0);

/** Debug traces: set `window.__dhdDebug = true` before loading. */
const dbg = (...args: unknown[]) => {
  if ((window as unknown as { __dhdDebug?: boolean }).__dhdDebug) console.debug('[dhd]', ...args);
};
const CUP_BASE_Y = 2.7;
const MOTION_GAIN = 0.5; // world units of cup travel per m/s² of device acceleration (shaking the phone moves the cup a lot)
const MOTION_GRAB = 9; // m/s² of linear acceleration that counts as a shake
/**
 * World gravity. One unit is ~1.3 cm (a d6 is ~1.2 units wide), so real gravity would be ~750:
 * low values make the dice float. Throw impulses are scaled with it.
 */
export const GRAVITY = 130;
const G = GRAVITY / 40;
/** The cup moves this many times the pointer's displacement, so shaking needs only small gestures. */
const SHAKE_GAIN = 2.6;

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface DieEntry {
  uid: string;
  body: RapierRigidBody;
  mesh: Mesh;
  solid: SolidDef;
  die: Die;
  /** Distance from centre to the resting face (used to place dice). */
  rest: number;
}

interface Tween {
  from: Vector3;
  fromQ: Quaternion;
  /** Target in cup-local coordinates (gather) or world (hop). */
  to: Vector3;
  toQ: Quaternion;
  t: number;
  dur: number;
  delay: number;
  local: boolean;
  arc: number;
  onDone?: () => void;
}

export interface CupSpec {
  key: number;
  visible: boolean;
  radius: number;
  height: number;
}

/** Visual state of the cup, read by the Cup component every frame. */
export const cupPose = {
  pos: new Vector3(0, CUP_BASE_Y, 4),
  quat: new Quaternion(),
  scale: 0,
  opacity: 1,
};

export const useCup = create<{ spec: CupSpec; setSpec: (s: Partial<CupSpec>) => void }>((set) => ({
  spec: { key: 0, visible: false, radius: 1.8, height: 3 },
  setSpec: (s) => set((st) => ({ spec: { ...st.spec, ...s } })),
}));

type CupPhase = 'hidden' | 'gather' | 'shake' | 'pour' | 'leave';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function randomQuat() {
  return new Quaternion().setFromEuler(new Euler(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2)));
}

class Director {
  dice = new Map<string, DieEntry>();
  bounds: Bounds = { minX: -6, maxX: 6, minZ: -4, maxZ: 4 };
  camera: Camera | null = null;
  dom: HTMLElement | null = null;

  /** Live ref: Rapier may recreate the body behind it (React StrictMode in dev), so never cache the body. */
  cupRef: { current: RapierRigidBody | null } | null = null;
  /** Returns the cup's colliders (walls, base, lid) read live from their refs. */
  cupColliders: () => (RapierCollider | null)[] = () => [];

  private cupPhase: CupPhase = 'hidden';
  private cupT = 0;
  private cupVel = new Vector3();
  /** Recent peak of the cup velocity (decays over ~0.2 s): what the shot is fired with. */
  private peakVel = new Vector3();
  private cupTarget = new Vector3();
  private shakeEnergy = 0;
  private autoShake = 0;
  private throwDir = new Vector3(0, 0, -1);
  /** Muzzle speed (world units/s) of the dice when the cup is released. */
  private throwSpeed = 14;
  private pourFrom = new Vector3();
  private dragOrigin = new Vector3();
  /** False while the cup waits (dice inside) for the user to grab it after pressing a roll button. */
  private grabbed = true;
  /** The throw was cancelled: the dice fly back to where they were and the cup leaves. */
  private cancelling = false;
  /** Where each die was (and what it showed) when the throw started, to restore it on cancel. */
  private origins = new Map<string, { p: Vector3; q: Quaternion; mapping: number[] }>();
  private cupOrigin = new Vector3();
  private tweens = new Map<string, Tween>();
  private rolling: string[] = [];
  private kind: 'roll' | 'reroll' = 'roll';
  private frozen: string[] = [];
  private settleFrames = 0;
  private settleTime = 0;
  private nudges = new Map<string, number>();
  private released = false;
  private motionAcc = new Vector3();
  private motionPeak = 0;
  private motionQuiet = 0;
  private motionSpeedMax = 0; // recent top cup speed while shaking with the device
  private brakeT = 0; // how long the cup has been braking hard
  private brakeVel = new Vector3(); // cup velocity at the moment the braking started
  private raycaster = new Raycaster();
  private plane = new Plane(new Vector3(0, 1, 0), -CUP_BASE_Y);

  // ------------------------------------------------------------------ registry

  register(e: DieEntry) {
    this.dice.set(e.uid, e);
  }

  unregister(uid: string) {
    this.dice.delete(uid);
    this.tweens.delete(uid);
    this.rolling = this.rolling.filter((u) => u !== uid);
  }

  setBounds(b: Bounds) {
    this.bounds = b;
    this.containDice();
  }

  get busy() {
    return this.cupPhase !== 'hidden' || this.rolling.length > 0;
  }

  /** The cup is ready in the middle of the table, waiting to be grabbed. */
  get waiting() {
    return this.cupPhase === 'gather' && !this.grabbed && !this.cancelling;
  }

  // ------------------------------------------------------------------ helpers

  /** Screen point → world point on the horizontal plane at height y. */
  screenToWorld(clientX: number, clientY: number, y = CUP_BASE_Y): Vector3 | null {
    if (!this.camera || !this.dom) return null;
    const r = this.dom.getBoundingClientRect();
    const ndc = new Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    this.plane.constant = -y;
    const out = new Vector3();
    return this.raycaster.ray.intersectPlane(this.plane, out) ? out : null;
  }

  /** Die under a screen point, if any. */
  pickDie(clientX: number, clientY: number): string | null {
    if (!this.camera || !this.dom) return null;
    const r = this.dom.getBoundingClientRect();
    const ndc = new Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = [...this.dice.values()].map((d) => d.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    for (const d of this.dice.values()) if (d.mesh === hit.object) return d.uid;
    return null;
  }

  private clampToBounds(p: Vector3, margin: number) {
    const b = this.bounds;
    p.x = Math.min(b.maxX - margin, Math.max(b.minX + margin, p.x));
    p.z = Math.min(b.maxZ - margin, Math.max(b.minZ + margin, p.z));
    return p;
  }

  /** Resting pose for a die at (x, z): slot 0 up, random spin around y. */
  restingPose(uid: string, x: number, z: number) {
    const d = this.dice.get(uid);
    if (!d) return null;
    const q = new Quaternion().setFromUnitVectors(slotDirection(d.solid, 0), UP);
    q.premultiply(new Quaternion().setFromAxisAngle(UP, rand(-0.5, 0.5)));
    return { pos: new Vector3(x, d.rest + 0.02, z), quat: q };
  }

  /** Grid layout inside the bounds for the current table order. */
  layoutPosition(index: number, count: number): Vector3 {
    const b = this.bounds;
    const w = b.maxX - b.minX - 2;
    const h = b.maxZ - b.minZ - 2;
    const cols = Math.max(1, Math.min(count, Math.round(Math.sqrt((count * w) / Math.max(h, 1)))));
    const rows = Math.ceil(count / cols);
    const gap = Math.min(2.6, w / cols, h / Math.max(rows, 1));
    const col = index % cols;
    const row = Math.floor(index / cols);
    const inRow = row === rows - 1 ? count - row * cols : cols;
    const x = (col - (inRow - 1) / 2) * gap + (b.minX + b.maxX) / 2;
    const z = (row - (rows - 1) / 2) * gap + (b.minZ + b.maxZ) / 2;
    return new Vector3(x, 0, z);
  }

  /** A free spot for a new die (far from others), dropped from above. */
  freeSpot(): Vector3 {
    const b = this.bounds;
    let best = new Vector3((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
    let bestD = -1;
    for (let i = 0; i < 40; i++) {
      const p = new Vector3(rand(b.minX + 1.2, b.maxX - 1.2), 0, rand(b.minZ + 1.2, b.maxZ - 1.2));
      let dmin = Infinity;
      for (const d of this.dice.values()) {
        const t = d.body.translation();
        dmin = Math.min(dmin, Math.hypot(t.x - p.x, t.z - p.z));
      }
      if (dmin > bestD) {
        bestD = dmin;
        best = p;
      }
    }
    return best;
  }

  /** Teleports dice that ended up outside the walls back inside. */
  containDice() {
    const b = this.bounds;
    for (const d of this.dice.values()) {
      if (this.tweens.has(d.uid)) continue;
      const t = d.body.translation();
      if (t.x < b.minX || t.x > b.maxX || t.z < b.minZ || t.z > b.maxZ || t.y < -1) {
        const p = this.clampToBounds(new Vector3(t.x, 0, t.z), 1.2);
        d.body.setTranslation({ x: p.x, y: 3, z: p.z }, true);
        d.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }

  // ------------------------------------------------------------------ input API

  /**
   * Starts a throw: the dice fly into the cup. `uids` = dice to throw (all by default).
   * By default the cup appears under the pointer and is already held; with `wait` (roll buttons)
   * it appears in the middle of the table and waits until the user grabs it (`grab`).
   */
  press(clientX: number, clientY: number, uids?: string[], wait = false) {
    if (this.busy) return false;
    unlockAudio();
    const table = useTable.getState();
    const all = table.dice.map((d) => d.uid).filter((u) => this.dice.has(u));
    if (!all.length) return false;
    const partial = !!uids && uids.length > 0 && uids.length < all.length && !!table.entryId;
    const list = partial ? uids!.filter((u) => this.dice.has(u)) : all;
    this.kind = partial ? 'reroll' : 'roll';
    this.rolling = list;
    this.frozen = partial ? all.filter((u) => !list.includes(u)) : [];
    table.setRolling(list);
    table.closeMenu();
    table.setPhase(wait ? 'waiting' : 'gathering');
    this.grabbed = !wait;
    this.cancelling = false;

    // cup size grows with the number of dice
    const n = list.length;
    const radius = Math.max(1.6, 1.05 * Math.cbrt(0.85 * n) + 0.45);
    const height = radius * 1.65 + 0.4;
    useCup.getState().setSpec({ key: useCup.getState().spec.key + 1, visible: true, radius, height });

    // the cup starts under the pointer (table drag) or in the middle of the table (button);
    // afterwards it follows the pointer *relative* to where the grab started
    const pointer = this.screenToWorld(clientX, clientY);
    const b = this.bounds;
    const start = wait || !pointer ? new Vector3((b.minX + b.maxX) / 2, CUP_BASE_Y, (b.minZ + b.maxZ) / 2) : pointer.clone();
    this.clampToBounds(start, radius + 0.4);
    start.y = CUP_BASE_Y;
    this.dragOrigin.copy(pointer ?? start);
    this.cupOrigin.copy(start);
    cupPose.pos.copy(start);
    cupPose.quat.identity();
    cupPose.scale = 0.2;
    cupPose.opacity = 1;
    this.cupTarget.copy(start);
    this.cupVel.set(0, 0, 0);
    this.peakVel.set(0, 0, 0);
    this.cupPhase = 'gather';
    this.cupT = 0;
    this.shakeEnergy = 0;
    this.autoShake = 0;
    this.released = false;
    this.motionPeak = 0;
    this.motionQuiet = 0;
    this.motionSpeedMax = 0;
    this.brakeT = 0;
    this.nudges.clear();

    // freeze the dice that are not rerolled
    for (const u of this.frozen) this.dice.get(u)?.body.setBodyType(FIXED, true);

    // remember how the dice were, in case the throw is cancelled
    this.origins.clear();
    for (const u of list) {
      const d = this.dice.get(u)!;
      const t = d.body.translation();
      const r = d.body.rotation();
      this.origins.set(u, { p: new Vector3(t.x, t.y, t.z), q: new Quaternion(r.x, r.y, r.z, r.w), mapping: table.rt[u]?.mapping ?? [] });
    }

    // impossible dice get a fresh random slice of faces before every throw
    for (const u of list) {
      const d = this.dice.get(u)!;
      if (d.die.faces !== d.solid.slots) {
        table.setMapping(u, randomMapping(d.die.faces, cryptoRng));
      }
    }

    // fly into the cup
    const perLayer = Math.max(1, Math.floor(Math.PI * Math.pow(Math.max(0.5, radius - 0.95), 2) / 1.6));
    list.forEach((u, i) => {
      const d = this.dice.get(u)!;
      d.body.setBodyType(KINEMATIC, true);
      const layer = Math.floor(i / perLayer);
      const k = i % perLayer;
      const rr = perLayer === 1 ? 0 : (radius - 1.0) * Math.sqrt((k + 0.5) / perLayer);
      const a = k * 2.39996 + layer;
      const to = new Vector3(Math.cos(a) * rr, 1.0 + layer * 1.35, Math.sin(a) * rr);
      const t = d.body.translation();
      const r = d.body.rotation();
      this.tweens.set(u, {
        from: new Vector3(t.x, t.y, t.z),
        fromQ: new Quaternion(r.x, r.y, r.z, r.w),
        to,
        toQ: randomQuat(),
        t: 0,
        dur: 0.42,
        delay: Math.min(0.35, i * 0.035),
        local: true,
        arc: 2.2,
        onDone: () => {
          d.body.setBodyType(DYNAMIC, true);
          d.body.setLinvel({ x: this.cupVel.x, y: 0, z: this.cupVel.z }, true);
          d.body.setAngvel({ x: rand(-4, 4), y: rand(-4, 4), z: rand(-4, 4) }, true);
        },
      });
    });
    whoosh();
    return true;
  }

  move(clientX: number, clientY: number) {
    if (this.cupPhase !== 'gather' && this.cupPhase !== 'shake') return;
    const raw = this.screenToWorld(clientX, clientY);
    if (!raw) return;
    if (!this.grabbed) return;
    const p = this.cupOrigin.clone().add(raw.sub(this.dragOrigin).multiplyScalar(SHAKE_GAIN));
    const { radius } = useCup.getState().spec;
    const free = p.clone();
    this.clampToBounds(p, radius + 0.2);
    // at the table's edge the pointer keeps going but the cup does not: drop the excess so that
    // reversing the movement brings the cup back at once instead of first "unwinding" it
    this.dragOrigin.x += (free.x - p.x) / SHAKE_GAIN;
    this.dragOrigin.z += (free.z - p.z) / SHAKE_GAIN;
    p.y = CUP_BASE_Y;
    this.cupTarget.copy(p);
  }

  /** Client coordinates of the cup's centre (for overlays), or null before the scene is ready. */
  cupScreen() {
    if (!this.camera || !this.dom) return null;
    const r = this.dom.getBoundingClientRect();
    const v = new Vector3(cupPose.pos.x, cupPose.pos.y + useCup.getState().spec.height * 0.5, cupPose.pos.z).project(this.camera);
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  /** True when a screen point is on (or close to) the cup: a generous target for fingers. */
  hitCup(clientX: number, clientY: number) {
    const { radius, height } = useCup.getState().spec;
    const p = this.screenToWorld(clientX, clientY, CUP_BASE_Y + height * 0.4);
    return !!p && Math.hypot(p.x - cupPose.pos.x, p.z - cupPose.pos.z) < radius + 1.2;
  }

  /** The user grabs the waiting cup at a screen point: from now on it follows the pointer. */
  grab(clientX: number, clientY: number) {
    if (!this.waiting) return false;
    const p = this.screenToWorld(clientX, clientY);
    if (!p) return false;
    this.grabbed = true;
    this.dragOrigin.copy(p);
    this.cupOrigin.copy(this.cupTarget);
    useTable.getState().setPhase('gathering');
    return true;
  }

  /** The accelerometer grabs the waiting cup: from now on the device movement shakes it. */
  private grabMotion() {
    this.grabbed = true;
    this.cupOrigin.copy(this.cupTarget);
    this.motionPeak = 0;
    this.motionQuiet = 0;
    this.motionSpeedMax = 0;
    this.brakeT = 0;
    const table = useTable.getState();
    table.setPhase('gathering');
    table.setMotionShake(true);
  }

  /** Keyboard alternative to grabbing: shake the waiting cup automatically. */
  grabAuto() {
    if (!this.waiting) return false;
    this.grabbed = true;
    this.cupOrigin.copy(this.cupTarget);
    useTable.getState().setPhase('gathering');
    this.auto(0.8);
    return true;
  }

  /** Cancels a throw that is waiting to be grabbed: the dice go back to the table as they were. */
  cancel() {
    if (!this.waiting) return;
    const table = useTable.getState();
    this.cancelling = true;
    this.cupPhase = 'leave';
    this.cupT = 0;
    this.setCupEnabled(false);
    this.rolling.forEach((u, i) => {
      const d = this.dice.get(u);
      const o = this.origins.get(u);
      if (!d || !o) return;
      table.setMapping(u, o.mapping);
      const t = d.body.translation();
      const r = d.body.rotation();
      d.body.setBodyType(KINEMATIC, true);
      this.tweens.set(u, {
        from: new Vector3(t.x, t.y, t.z),
        fromQ: new Quaternion(r.x, r.y, r.z, r.w),
        to: o.p,
        toQ: o.q,
        t: 0,
        dur: 0.4,
        delay: Math.min(0.2, i * 0.02),
        local: false,
        arc: 2,
        onDone: () => d.body.setBodyType(DYNAMIC, true),
      });
    });
    whoosh();
  }

  private finishCancel() {
    const table = useTable.getState();
    for (const u of this.frozen) this.dice.get(u)?.body.setBodyType(DYNAMIC, true);
    this.cancelling = false;
    this.rolling = [];
    this.frozen = [];
    table.setRolling([]);
    table.setPhase('idle');
  }

  /** Device acceleration (m/s², gravity removed) while shaking with the phone. */
  motion(ax: number, ay: number) {
    if (this.cupPhase !== 'gather' && this.cupPhase !== 'shake') return;
    const m = Math.hypot(ax, ay);
    if (this.waiting) {
      // a shake of the device grabs the waiting cup: no need to touch it
      if (m > MOTION_GRAB) this.grabMotion();
      return;
    }
    this.motionAcc.set(ax, 0, -ay);
    this.motionPeak = Math.max(this.motionPeak * 0.95, m);
  }

  /** Quick click without dragging: shake automatically for a moment. */
  auto(duration = 0.75) {
    this.autoShake = duration;
  }

  /** Stop shaking and pour. Safe to call anytime. */
  release() {
    if (this.cupPhase !== 'gather' && this.cupPhase !== 'shake') return;
    this.released = true;
    // the shot leaves with the cup's own velocity (recent peak) at the moment of release (direction and speed)
    const cv = new Vector3(this.peakVel.x, 0, this.peakVel.z);
    const speed = cv.length();
    this.throwSpeed = Math.min(30, Math.max(8, speed));
    dbg('release', { cupSpeed: +speed.toFixed(1), phase: this.cupPhase });
    if (speed > 3) this.throwDir.copy(cv.normalize());
    else {
      const c = new Vector3((this.bounds.minX + this.bounds.maxX) / 2, 0, (this.bounds.minZ + this.bounds.maxZ) / 2);
      const d = c.sub(new Vector3(cupPose.pos.x, 0, cupPose.pos.z));
      this.throwDir.copy(d.length() > 1 ? d.normalize() : new Vector3(rand(-0.4, 0.4), 0, -1).normalize());
    }
  }

  // ------------------------------------------------------------------ frame logic

  /** Called before every physics step (fixed dt). */
  beforeStep(dt: number) {
    this.stepCup(dt);
    this.stepTweens(dt);
    if (this.cancelling && this.tweens.size === 0) this.finishCancel();
  }

  private cupLocalToWorld(local: Vector3) {
    return local.clone().applyQuaternion(cupPose.quat).add(cupPose.pos);
  }

  private stepTweens(dt: number) {
    for (const [uid, tw] of this.tweens) {
      const d = this.dice.get(uid);
      if (!d) {
        this.tweens.delete(uid);
        continue;
      }
      if (tw.delay > 0) {
        tw.delay -= dt;
        continue;
      }
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const e = ease(tw.t);
      const target = tw.local ? this.cupLocalToWorld(tw.to) : tw.to;
      const p = tw.from.clone().lerp(target, e);
      p.y += Math.sin(Math.PI * tw.t) * tw.arc;
      const q = tw.fromQ.clone().slerp(tw.toQ, e);
      d.body.setNextKinematicTranslation(p);
      d.body.setNextKinematicRotation(q);
      if (tw.t >= 1) {
        this.tweens.delete(uid);
        d.body.setTranslation(p, true);
        d.body.setRotation(q, true);
        tw.onDone?.();
      }
    }
  }

  /**
   * Keeps the dice inside the cup while it is shaken. The kinematic walls are thin and move fast,
   * so dice can tunnel through them (sideways or through the lid): whatever ends up outside is
   * put back, moving along with the cup.
   */
  private confineDice() {
    const { radius, height } = useCup.getState().spec;
    const inv = cupPose.quat.clone().invert();
    const maxR = Math.max(0.3, radius - 0.3);
    const minY = 0.5;
    const maxY = height - 0.2;
    for (const u of this.rolling) {
      const d = this.dice.get(u);
      if (!d || this.tweens.has(u)) continue;
      const t = d.body.translation();
      const local = new Vector3(t.x, t.y, t.z).sub(cupPose.pos).applyQuaternion(inv);
      const r = Math.hypot(local.x, local.z);
      if (r <= maxR && local.y >= minY && local.y <= maxY) continue;
      dbg('die escaped the cup, put back', { uid: u, r: +r.toFixed(2), y: +local.y.toFixed(2), maxR: +maxR.toFixed(2), maxY: +maxY.toFixed(2), cupSpeed: +this.cupVel.length().toFixed(1) });
      if (r > maxR) {
        local.x *= maxR / r;
        local.z *= maxR / r;
      }
      local.y = Math.min(maxY, Math.max(minY, local.y));
      d.body.setTranslation(local.applyQuaternion(cupPose.quat).add(cupPose.pos), true);
      d.body.setLinvel({ x: this.cupVel.x, y: 0, z: this.cupVel.z }, true);
    }
  }

  private stepCup(dt: number) {
    if (this.cupPhase === 'hidden') return;
    this.cupT += dt;
    const body = this.cupRef?.current;
    const spec = useCup.getState().spec;

    if (this.cupPhase === 'gather' || this.cupPhase === 'shake') {
      cupPose.scale = Math.min(1, cupPose.scale + dt * 5);
      // follow the target with a critically damped spring
      const k = 90;
      const c = 2 * Math.sqrt(k);
      const target = this.cupTarget.clone();
      // automatic / accelerometer shake add oscillations
      if (this.autoShake > 0) {
        this.autoShake -= dt;
        const w = this.cupT * 26;
        target.x += Math.sin(w) * 0.9;
        target.z += Math.cos(w * 1.3) * 0.6;
        if (this.autoShake <= 0) this.release();
      }
      if (this.motionAcc.lengthSq() > 0) {
        target.addScaledVector(this.motionAcc, MOTION_GAIN);
        this.clampToBounds(target, useCup.getState().spec.radius + 0.4);
        this.motionAcc.multiplyScalar(0.6);
        if (this.motionPeak > 6) this.motionQuiet = 0;
      }
      const acc = target.sub(cupPose.pos).multiplyScalar(k).addScaledVector(this.cupVel, -c);
      this.cupVel.addScaledVector(acc, dt);
      const maxV = 28;
      if (this.cupVel.length() > maxV) this.cupVel.setLength(maxV);
      this.peakVel.multiplyScalar(Math.pow(0.06, dt));
      if (this.cupVel.lengthSq() >= this.peakVel.lengthSq()) this.peakVel.copy(this.cupVel);
      cupPose.pos.addScaledVector(this.cupVel, dt);
      cupPose.pos.y = CUP_BASE_Y;
      // lean into the movement
      const lean = new Vector3(this.cupVel.z, 0, -this.cupVel.x).multiplyScalar(0.018);
      const lq = new Quaternion().setFromAxisAngle(lean.clone().normalize(), Math.min(0.35, lean.length()));
      if (lean.lengthSq() > 1e-6) cupPose.quat.slerp(lq, 0.3);
      else cupPose.quat.slerp(new Quaternion(), 0.2);
      this.shakeEnergy = this.shakeEnergy * 0.92 + this.cupVel.length() * 0.08;

      // accelerometer mode: pour once the shaking stops after a good shake
      if (useTable.getState().motionShake && this.motionPeak > 0) {
        if (this.motionPeak < 3) this.motionQuiet += dt;
        if (this.motionQuiet > 0.6 && this.cupT > 1) this.release();
        // hard braking after a fast shake: the dice fly out with the speed the cup had just before stopping
        const speed = this.cupVel.length();
        this.motionSpeedMax = Math.max(this.motionSpeedMax * Math.pow(0.5, dt), speed);
        if (this.cupT > 0.8 && this.motionSpeedMax > 10 && speed < this.motionSpeedMax * 0.35) {
          if (this.brakeT === 0) this.brakeVel.copy(this.peakVel);
          this.brakeT += dt;
          if (this.brakeT > 0.1) {
            this.peakVel.copy(this.brakeVel);
            this.release();
          }
        } else if (speed > this.motionSpeedMax * 0.5) this.brakeT = 0;
      }

      this.confineDice();

      if (this.cupPhase === 'gather' && this.grabbed && this.tweens.size === 0) {
        this.cupPhase = 'shake';
        dbg('shake start', { dice: this.rolling.length });
        useTable.getState().setPhase('shaking');
      }
      if (this.released && this.cupPhase === 'shake') this.startPour();
    } else if (this.cupPhase === 'pour') {
      const T = 0.5;
      const t = Math.min(1, this.cupT / T);
      const e = easeOut(t);
      const axis = new Vector3().crossVectors(UP, this.throwDir).normalize();
      cupPose.quat.setFromAxisAngle(axis, e * 2.25);
      cupPose.pos.copy(this.pourFrom).addScaledVector(this.throwDir, e * 1.6);
      cupPose.pos.y = CUP_BASE_Y + e * 1.1;
      if (t >= 1) {
        this.cupPhase = 'leave';
        this.cupT = 0;
      }
    } else if (this.cupPhase === 'leave') {
      const t = Math.min(1, this.cupT / 0.55);
      cupPose.pos.addScaledVector(this.throwDir, -dt * 7);
      cupPose.pos.y += dt * (6 + t * 10);
      cupPose.opacity = 1 - t;
      if (t > 0.25) this.setCupEnabled(false);
      if (t >= 1) {
        this.cupPhase = 'hidden';
        useCup.getState().setSpec({ visible: false });
      }
    }

    if (body && spec.visible && body.isValid() && this.cupPhase !== 'pour' && this.cupPhase !== 'leave') {
      const bodyPos = cupPose.pos;
      body.setNextKinematicTranslation({ x: bodyPos.x, y: bodyPos.y, z: bodyPos.z });
      body.setNextKinematicRotation(cupPose.quat);
    }
  }

  private setCupEnabled(on: boolean) {
    for (const c of this.cupColliders()) if (c?.isValid()) c.setEnabled(on);
    // park the body away from the table: otherwise the leaving cup still carries the dice up with it
    // (only the visual cup keeps animating)
    const body = this.cupRef?.current;
    if (!on && body?.isValid()) body.setTranslation({ x: 0, y: -500, z: 0 }, true);
  }

  private startPour() {
    this.cupPhase = 'pour';
    dbg('pour', { dir: this.throwDir.toArray().map((n) => +n.toFixed(2)), speed: +this.throwSpeed.toFixed(1) });
    this.cupT = 0;
    this.pourFrom.copy(cupPose.pos);
    this.setCupEnabled(false);
    useTable.getState().setPhase('pouring');
    useTable.getState().setMotionShake(false);
    whoosh();
    haptic(25);
    // cannon shot: open the cup and fire the dice along the last gesture, aimed slightly down so they
    // hit the table right away instead of drifting down from the cup
    const side = new Vector3(-this.throwDir.z, 0, this.throwDir.x);
    for (const u of this.rolling) {
      const d = this.dice.get(u);
      if (!d) continue;
      const sp = this.throwSpeed * rand(0.8, 1.2);
      const lat = rand(-0.2, 0.2) * sp;
      d.body.setLinvel({ x: this.throwDir.x * sp + side.x * lat, y: -rand(2, 8), z: this.throwDir.z * sp + side.z * lat }, true);
      d.body.setAngvel({ x: rand(-30, 30), y: rand(-20, 20), z: rand(-30, 30) }, true);
    }
    this.settleFrames = 0;
    this.settleTime = 0;
  }

  /** Called after every physics step: detects when the throw has settled. */
  afterStep(dt: number) {
    if (!this.rolling.length || this.tweens.size) return;
    const phase = useTable.getState().phase;
    if (phase !== 'pouring' && phase !== 'settling') return;
    this.settleTime += dt;
    if (phase === 'pouring' && this.cupPhase === 'hidden') useTable.getState().setPhase('settling');
    if (this.cupPhase === 'pour') return;

    let still = true;
    for (const u of this.rolling) {
      const d = this.dice.get(u);
      if (!d) continue;
      if (d.body.isSleeping()) continue;
      const lv = d.body.linvel();
      const av = d.body.angvel();
      if (Math.hypot(lv.x, lv.y, lv.z) > 0.15 || Math.hypot(av.x, av.y, av.z) > 0.4) {
        still = false;
        break;
      }
    }
    this.settleFrames = still ? this.settleFrames + 1 : 0;
    const timeout = this.settleTime > 10;
    if (this.settleFrames < 16 && !timeout) return;

    dbg('settled', { timeout, time: +this.settleTime.toFixed(1) });
    this.containDice();
    // cocked dice get a nudge
    if (!timeout) {
      for (const u of this.rolling) {
        const d = this.dice.get(u);
        if (!d) continue;
        const q = d.body.rotation();
        const quat = new Quaternion(q.x, q.y, q.z, q.w);
        const { alignment } = topSlot(d.solid, (v) => v.applyQuaternion(quat));
        const n = this.nudges.get(u) ?? 0;
        if (alignment < 0.93 && n < 3) {
          dbg('nudge cocked die', { uid: u, faces: d.die.faces, alignment: +alignment.toFixed(2), n: n + 1 });
          this.nudges.set(u, n + 1);
          const m = d.body.mass();
          const push = 1 + n * 0.7; // each retry kicks harder
          d.body.applyImpulse({ x: rand(-1.5, 1.5) * push * m, y: 3.2 * Math.sqrt(G) * push * m, z: rand(-1.5, 1.5) * push * m }, true);
          d.body.applyTorqueImpulse({ x: rand(-0.8, 0.8) * push * m, y: 0, z: rand(-0.8, 0.8) * push * m }, true);
          this.settleFrames = 0;
          return;
        }
      }
    }
    this.finish();
  }

  private finish() {
    const table = useTable.getState();
    const results: { uid: string; face: number }[] = [];
    for (const u of this.rolling) {
      const d = this.dice.get(u);
      const rt = table.rt[u];
      if (!d || !rt) continue;
      const q = d.body.rotation();
      const quat = new Quaternion(q.x, q.y, q.z, q.w);
      const { slot } = topSlot(d.solid, (v) => v.applyQuaternion(quat));
      results.push({ uid: u, face: rt.mapping[slot] });
    }
    for (const u of this.frozen) this.dice.get(u)?.body.setBodyType(DYNAMIC, true);
    const kind = this.kind;
    this.rolling = [];
    this.frozen = [];
    table.setRolling([]);
    table.setPhase('idle');
    table.clearSelection();
    commitRoll(results, kind);
    haptic(10);
  }

  // ------------------------------------------------------------------ manual changes

  /** Shows `face` on top of a die: rotates it if the face is painted, else repaints the top slot. */
  showFace(uid: string, face: number) {
    const d = this.dice.get(uid);
    const table = useTable.getState();
    const rt = table.rt[uid];
    if (!d || !rt || this.busy) return;
    const slot = rt.mapping.indexOf(face);
    const r = d.body.rotation();
    const cur = new Quaternion(r.x, r.y, r.z, r.w);
    if (slot < 0) {
      const { slot: top } = topSlot(d.solid, (v) => v.applyQuaternion(cur));
      table.setMapping(uid, placeFace(rt.mapping, top, face));
      return;
    }
    const worldDir = slotDirection(d.solid, slot).applyQuaternion(cur);
    const target = new Quaternion().setFromUnitVectors(worldDir, UP).multiply(cur);
    const t = d.body.translation();
    d.body.setBodyType(KINEMATIC, true);
    this.tweens.set(uid, {
      from: new Vector3(t.x, t.y, t.z),
      fromQ: cur,
      to: new Vector3(t.x, d.rest + 0.02, t.z),
      toQ: target,
      t: 0,
      dur: 0.45,
      delay: 0,
      local: false,
      arc: 1.6,
      onDone: () => d.body.setBodyType(DYNAMIC, true),
    });
  }

  /** Places a die resting at a position (used on spawn / layout). */
  place(uid: string, x: number, z: number, drop = false) {
    const pose = this.restingPose(uid, x, z);
    const d = this.dice.get(uid);
    if (!pose || !d) return;
    if (drop) {
      pose.pos.y = 5;
      pose.quat.copy(randomQuat());
    }
    d.body.setTranslation(pose.pos, true);
    d.body.setRotation(pose.quat, true);
    d.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    d.body.setAngvel(drop ? { x: rand(-3, 3), y: rand(-3, 3), z: rand(-3, 3) } : { x: 0, y: 0, z: 0 }, true);
  }

  /** Re-arranges all dice in a tidy grid (after load). */
  tidy() {
    const table = useTable.getState();
    const list = table.dice.filter((d) => this.dice.has(d.uid));
    list.forEach((d, i) => {
      const p = this.layoutPosition(i, list.length);
      this.place(d.uid, p.x, p.z);
    });
  }

  reset() {
    this.tweens.clear();
    this.rolling = [];
    this.frozen = [];
    this.cupPhase = 'hidden';
    this.grabbed = true;
    this.cancelling = false;
    cupPose.scale = 0;
    useCup.getState().setSpec({ visible: false });
  }
}

export const director = new Director();
export { CUP_BASE_Y };
