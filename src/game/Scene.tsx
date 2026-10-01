import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  ConvexHullCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from '@react-three/rapier';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  RingGeometry,
  Vector3,
  AdditiveBlending,
  Plane,
  Raycaster,
  Vector2,
} from 'three';
import { solidFor, windowMapping } from '../model/solids';
import { useLibrary } from '../store/library';
import { useTable } from '../store/table';
import { getDieMesh } from '../three/dieGeometry';
import { getEnvironment } from '../three/environment';
import { slotDirection } from '../three/solids';
import { useDieMaterial } from '../three/useDieMaterial';
import { Cup } from './Cup';
import { GRAVITY, director, type Bounds } from './director';
import { clack } from './sound';

export interface Insets {
  top: number;
  bottom: number;
}

const CAM_DIR = new Vector3(0, 26, 8.5).normalize();
const FOV = 32;

/** Rectangle of the table (at height y) visible inside the safe area of the screen. */
function visibleRect(camera: PerspectiveCamera, ndcTop: number, ndcBottom: number, y: number): Bounds | null {
  const rc = new Raycaster();
  const plane = new Plane(new Vector3(0, 1, 0), -y);
  const hit = (x: number, yy: number) => {
    rc.setFromCamera(new Vector2(x, yy), camera);
    const p = new Vector3();
    return rc.ray.intersectPlane(plane, p) ? p : null;
  };
  const nl = hit(-1, ndcBottom);
  const nr = hit(1, ndcBottom);
  const fl = hit(-1, ndcTop);
  const fr = hit(1, ndcTop);
  if (!nl || !nr || !fl || !fr) return null;
  return {
    minX: Math.max(nl.x, fl.x),
    maxX: Math.min(nr.x, fr.x),
    minZ: Math.max(fl.z, fr.z),
    maxZ: Math.min(nl.z, nr.z),
  };
}

function SceneSetup({ insets, count, onBounds }: { insets: Insets; count: number; onBounds: (b: Bounds) => void }) {
  const { camera, size, gl, scene } = useThree();
  const light = useRef<DirectionalLight>(null);

  useEffect(() => {
    scene.environment = getEnvironment(gl);
    scene.environmentIntensity = 0.55;
  }, [gl, scene]);

  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    cam.fov = FOV;
    cam.aspect = size.width / Math.max(1, size.height);
    const ndcTop = 1 - (2 * insets.top) / Math.max(1, size.height);
    const ndcBottom = -1 + (2 * insets.bottom) / Math.max(1, size.height);
    // Choose the distance so the smaller side of the safe area shows ~E world units.
    const extent = Math.min(19, Math.max(10.5, 7.9 + Math.sqrt(count) * 1.75));
    const probe = 30;
    cam.position.copy(CAM_DIR).multiplyScalar(probe);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const r0 = visibleRect(cam, ndcTop, ndcBottom, 0);
    const minSide = r0 ? Math.min(r0.maxX - r0.minX, r0.maxZ - r0.minZ) : extent;
    const dist = (probe * extent) / Math.max(1, minSide);
    cam.position.copy(CAM_DIR).multiplyScalar(dist);
    cam.near = 1;
    cam.far = dist * 3;
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const r = visibleRect(cam, ndcTop, ndcBottom, 1.2);
    if (r) {
      const m = 0.25;
      const b = { minX: r.minX + m, maxX: r.maxX - m, minZ: r.minZ + m, maxZ: r.maxZ - m };
      onBounds(b);
      const l = light.current;
      if (l) {
        const s = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) * 0.75 + 4;
        l.shadow.camera.left = -s;
        l.shadow.camera.right = s;
        l.shadow.camera.top = s;
        l.shadow.camera.bottom = -s;
        l.shadow.camera.updateProjectionMatrix();
      }
    }
  }, [camera, size.width, size.height, insets.top, insets.bottom, count, onBounds]);

  return (
    <>
      <hemisphereLight args={['#fff1d6', '#2a1a10', 0.7]} />
      <directionalLight
        ref={light}
        position={[7, 22, 9]}
        intensity={2.3}
        color="#fff3df"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
      <directionalLight position={[-10, 8, -6]} intensity={0.55} color="#9ec5ff" />
    </>
  );
}

function StepHooks() {
  useBeforePhysicsStep((world) => director.beforeStep(world.timestep));
  useAfterPhysicsStep((world) => director.afterStep(world.timestep));
  return null;
}

function Table({ bounds }: { bounds: Bounds }) {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxZ - bounds.minZ;
  const H = 18;
  const T = 2;
  return (
    <>
      <RigidBody type="fixed" colliders={false} userData={{ kind: 'table' }}>
        <CuboidCollider args={[80, 1, 80]} position={[0, -1, 0]} friction={0.75} restitution={0.12} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} key={`${cx.toFixed(2)}${cz.toFixed(2)}${w.toFixed(2)}${d.toFixed(2)}`} userData={{ kind: 'wall' }}>
        <CuboidCollider args={[T, H, d / 2 + T * 2]} position={[bounds.minX - T, H, cz]} restitution={0.3} friction={0.2} />
        <CuboidCollider args={[T, H, d / 2 + T * 2]} position={[bounds.maxX + T, H, cz]} restitution={0.3} friction={0.2} />
        <CuboidCollider args={[w / 2 + T * 2, H, T]} position={[cx, H, bounds.minZ - T]} restitution={0.3} friction={0.2} />
        <CuboidCollider args={[w / 2 + T * 2, H, T]} position={[cx, H, bounds.maxZ + T]} restitution={0.3} friction={0.2} />
        <CuboidCollider args={[w / 2 + T * 2, T, d / 2 + T * 2]} position={[cx, H * 2 + T, cz]} />
      </RigidBody>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial transparent opacity={0.42} />
      </mesh>
    </>
  );
}

const ringGeo = new RingGeometry(1.05, 1.32, 48);

const PhysicsDie = memo(function PhysicsDie({ uid, dieId, index, count }: { uid: string; dieId: string; index: number; count: number }) {
  const die = useLibrary((s) => s.dice[dieId]);
  const mapping = useTable((s) => s.rt[uid]?.mapping);
  const selected = useTable((s) => s.selected.includes(uid));
  const solidId = solidFor(die.faces);
  const data = getDieMesh(solidId);
  // guard against stale mappings (die edited while on the table, or being removed)
  const safeMapping = mapping && mapping.length === data.solid.slots ? mapping : windowMapping(die.faces, 1);
  const material = useDieMaterial(die, safeMapping);
  const body = useRef<RapierRigidBody>(null);
  const mesh = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const lastSound = useRef(0);

  const rest = useMemo(() => {
    let m = Infinity;
    data.solid.faces.forEach((_, f) => (m = Math.min(m, data.solid.normals[f].dot(data.solid.centers[f]))));
    return m;
  }, [data]);

  // initial pose: tidy grid for a freshly loaded set, dropped from above for dice added later
  const [initial] = useState(() => {
    const dropped = useTable.getState().justAdded === uid;
    const p = dropped ? director.freeSpot() : director.layoutPosition(index, count);
    // keep showing the rolled face when coming back to the table
    const rt = useTable.getState().rt[uid];
    const slot = rt?.face != null ? Math.max(0, rt.mapping.indexOf(rt.face)) : 0;
    const q = new Quaternion().setFromUnitVectors(slotDirection(data.solid, slot), new Vector3(0, 1, 0));
    if (dropped) q.set(Math.random(), Math.random(), Math.random(), Math.random()).normalize();
    return { pos: [p.x, dropped ? 6 : rest + 0.02, p.z] as [number, number, number], quat: q };
  });

  useEffect(() => {
    if (!body.current || !mesh.current) return;
    director.register({ uid, body: body.current, mesh: mesh.current, solid: data.solid, die, rest });
    return () => director.unregister(uid);
  }, [uid, data, die, rest]);

  const ringMat = useMemo(
    () => new MeshBasicMaterial({ color: '#7cc4ff', transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }),
    [],
  );

  useFrame(({ clock }) => {
    const r = ring.current;
    const b = body.current;
    if (!r || !b) return;
    r.visible = selected;
    if (!selected) return;
    const t = b.translation();
    r.position.set(t.x, 0.03, t.z);
    const s = 1 + Math.sin(clock.elapsedTime * 5) * 0.06;
    r.scale.setScalar(s * (data.geometry.boundingSphere?.radius ?? 1));
    ringMat.opacity = 0.6 + Math.sin(clock.elapsedTime * 5) * 0.25;
  });

  return (
    <>
      <RigidBody
        ref={body}
        colliders={false}
        position={initial.pos}
        quaternion={initial.quat}
        ccd
        canSleep
        linearDamping={0.02}
        angularDamping={0.05}
        userData={{ kind: 'die', uid }}
        onCollisionEnter={(e) => {
          const b = body.current;
          if (!b) return;
          const now = performance.now();
          if (now - lastSound.current < 45) return;
          const v = b.linvel();
          const speed = Math.hypot(v.x, v.y, v.z);
          if (speed < 0.6) return;
          lastSound.current = now;
          const kind = (e.other.rigidBodyObject?.userData as { kind?: string } | undefined)?.kind;
          clack(speed * 6, kind === 'die' ? 'die' : kind === 'cup' ? 'cup' : 'table');
        }}
      >
        <ConvexHullCollider args={[data.hull]} restitution={0.2} friction={0.55} density={1.4} />
        <mesh ref={mesh} geometry={data.geometry} material={material} castShadow receiveShadow />
      </RigidBody>
      <mesh ref={ring} geometry={ringGeo} material={ringMat} rotation-x={-Math.PI / 2} visible={false} />
    </>
  );
});

function Dice() {
  const dice = useTable((s) => s.dice);
  const lib = useLibrary((s) => s.dice);
  const present = dice.filter((d) => lib[d.dieId]);
  return (
    <>
      {present.map((d, i) => (
        <PhysicsDie key={d.uid} uid={d.uid} dieId={d.dieId} index={i} count={present.length} />
      ))}
    </>
  );
}

function Bind() {
  const { camera, gl } = useThree();
  useEffect(() => {
    director.camera = camera;
    director.dom = gl.domElement;
  }, [camera, gl]);
  return null;
}

export function GameScene({ insets, paused }: { insets: Insets; paused?: boolean }) {
  const count = useTable((s) => s.dice.length);
  const [bounds, setBounds] = useState<Bounds>(director.bounds);
  const firstBounds = useRef(true);
  const onBounds = useMemo(
    () => (b: Bounds) => {
      director.setBounds(b);
      setBounds(b);
      if (firstBounds.current) {
        firstBounds.current = false;
        // layout computed with default bounds before the real ones were known
        requestAnimationFrame(() => {
          const rt = useTable.getState().rt;
          if (Object.values(rt).every((r) => r.face === null)) director.tidy();
        });
      }
    },
    [],
  );
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, position: CAM_DIR.clone().multiplyScalar(30).toArray(), near: 1, far: 100 }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    >
      <Bind />
      <SceneSetup insets={insets} count={count} onBounds={onBounds} />
      <Physics gravity={[0, -GRAVITY, 0]} timeStep={1 / 60} paused={paused}>
        <StepHooks />
        <Table bounds={bounds} />
        <Cup />
        <Dice />
      </Physics>
    </Canvas>
  );
}
