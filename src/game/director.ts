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
const CUP_BASE_Y = 2.7;

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
  private cupTarget = new Vector3();
  private shakeEnergy = 0;
  private autoShake = 0;
  private throwDir = new Vector3(0, 0, -1);
  private pourFrom = new Vector3();
  private dragOrigin = new Vector3();
  private cupOrigin = new Vector3();
  private pointerHist: { t: number; p: Vector3 }[] = [];
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
   * Starts a throw: the cup appears at the pointer and the dice fly into it.
   * `uids` = dice to throw (all by default).
   */
  press(clientX: number, clientY: number, uids?: string[], fromButton = false) {
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
    table.setPhase('gathering');

    // cup size grows with the number of dice
    const n = list.length;
    const radius = Math.max(1.6, 1.05 * Math.cbrt(0.85 * n) + 0.45);
    const height = radius * 1.65 + 0.4;
    useCup.getState().setSpec({ key: useCup.getState().spec.key + 1, visible: true, radius, height });

    // the cup starts under the pointer (table drag) or at the near edge of the table (button);
    // afterwards it follows the pointer *relative* to where the press started
    const pointer = this.screenToWorld(clientX, clientY);
    const b = this.bounds;
    const start =
      fromButton || !pointer ? new Vector3((b.minX + b.maxX) / 2, CUP_BASE_Y, (b.minZ + b.maxZ) / 2 + (b.maxZ - b.minZ) * 0.22) : pointer.clone();
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
    this.cupPhase = 'gather';
    this.cupT = 0;
    this.shakeEnergy = 0;
    this.autoShake = 0;
    this.released = false;
    this.pointerHist = [{ t: performance.now(), p: start.clone() }];
    this.motionPeak = 0;
    this.motionQuiet = 0;
    this.nudges.clear();

    // freeze the dice that are not rerolled
    for (const u of this.frozen) this.dice.get(u)?.body.setBodyType(FIXED, true);

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
    const p = this.cupOrigin.clone().add(raw.sub(this.dragOrigin));
    const { radius } = useCup.getState().spec;
    this.clampToBounds(p, radius + 0.2);
    p.y = CUP_BASE_Y;
    this.cupTarget.copy(p);
    const now = performance.now();
    this.pointerHist.push({ t: now, p: p.clone() });
    while (this.pointerHist.length > 2 && now - this.pointerHist[0].t > 140) this.pointerHist.shift();
  }

  /** Device acceleration (m/s², gravity removed) while shaking with the phone. */
  motion(ax: number, ay: number) {
    if (this.cupPhase !== 'gather' && this.cupPhase !== 'shake') return;
    this.motionAcc.set(ax, 0, -ay);
    const m = Math.hypot(ax, ay);
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
    // pour direction from the recent pointer movement, else away from the viewer
    const h = this.pointerHist;
    const v = h.length >= 2 ? h[h.length - 1].p.clone().sub(h[0].p) : new Vector3();
    v.y = 0;
    if (v.length() > 0.6) this.throwDir.copy(v.normalize());
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
        target.addScaledVector(this.motionAcc, 0.09);
        this.motionAcc.multiplyScalar(0.6);
        if (this.motionPeak > 6) this.motionQuiet = 0;
      }
      const acc = target.sub(cupPose.pos).multiplyScalar(k).addScaledVector(this.cupVel, -c);
      this.cupVel.addScaledVector(acc, dt);
      const maxV = 28;
      if (this.cupVel.length() > maxV) this.cupVel.setLength(maxV);
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
      }

      if (this.cupPhase === 'gather' && this.tweens.size === 0) {
        this.cupPhase = 'shake';
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

    if (body && spec.visible && body.isValid()) {
      const bodyPos = cupPose.pos;
      body.setNextKinematicTranslation({ x: bodyPos.x, y: bodyPos.y, z: bodyPos.z });
      body.setNextKinematicRotation(cupPose.quat);
    }
  }

  private setCupEnabled(on: boolean) {
    for (const c of this.cupColliders()) if (c?.isValid()) c.setEnabled(on);
  }

  private startPour() {
    this.cupPhase = 'pour';
    this.cupT = 0;
    this.pourFrom.copy(cupPose.pos);
    this.setCupEnabled(false);
    useTable.getState().setPhase('pouring');
    useTable.getState().setMotionShake(false);
    whoosh();
    haptic(25);
    // fling the dice out with some spin
    setTimeout(() => {
      for (const u of this.rolling) {
        const d = this.dice.get(u);
        if (!d) continue;
        const m = d.body.mass();
        const f = rand(4.5, 7.5) * m;
        d.body.applyImpulse({ x: this.throwDir.x * f, y: rand(0.5, 2) * m, z: this.throwDir.z * f }, true);
        d.body.setAngvel({ x: rand(-16, 16), y: rand(-12, 12), z: rand(-16, 16) }, true);
      }
    }, 140);
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
      if (Math.hypot(lv.x, lv.y, lv.z) > 0.09 || Math.hypot(av.x, av.y, av.z) > 0.2) {
        still = false;
        break;
      }
    }
    this.settleFrames = still ? this.settleFrames + 1 : 0;
    const timeout = this.settleTime > 10;
    if (this.settleFrames < 16 && !timeout) return;

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
          this.nudges.set(u, n + 1);
          const m = d.body.mass();
          d.body.applyImpulse({ x: rand(-1, 1) * m, y: 3.2 * m, z: rand(-1, 1) * m }, true);
          d.body.applyTorqueImpulse({ x: rand(-0.6, 0.6) * m, y: 0, z: rand(-0.6, 0.6) * m }, true);
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
    cupPose.scale = 0;
    useCup.getState().setSpec({ visible: false });
  }
}

export const director = new Director();
export { CUP_BASE_Y };
