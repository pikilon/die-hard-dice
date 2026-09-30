import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Group, Quaternion, Vector3 } from 'three';
import { solidFor } from '../model/solids';
import type { Die } from '../model/types';
import { getDieMesh } from '../three/dieGeometry';
import { getEnvironment } from '../three/environment';
import { slotDirection } from '../three/solids';
import { useDieMaterial } from '../three/useDieMaterial';

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    scene.environment = getEnvironment(gl);
    scene.environmentIntensity = 0.7;
  }, [gl, scene]);
  return null;
}

function Model({ die, mapping, spin, focusSlot }: { die: Die; mapping: number[]; spin: boolean; focusSlot: number | null }) {
  const { geometry, solid } = getDieMesh(solidFor(die.faces));
  const material = useDieMaterial(die, mapping);
  const group = useRef<Group>(null);
  const target = useRef<Quaternion | null>(null);

  useEffect(() => {
    if (focusSlot == null || focusSlot < 0 || focusSlot >= solid.slots) return;
    const dir = slotDirection(solid, focusSlot);
    const toCam = solid.id === 'd4' ? new Vector3(0, 1, 0) : new Vector3(0, 0.55, 1).normalize();
    target.current = new Quaternion().setFromUnitVectors(dir, toCam);
  }, [focusSlot, solid]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (target.current) {
      g.quaternion.slerp(target.current, Math.min(1, dt * 8));
      if (g.quaternion.angleTo(target.current) < 0.01) target.current = null;
    } else if (spin) {
      g.rotateOnWorldAxis(new Vector3(0, 1, 0), dt * 0.6);
      g.rotateOnWorldAxis(new Vector3(1, 0, 0), dt * 0.25);
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry} material={material} castShadow />
    </group>
  );
}

/** Interactive 3D preview of a die (drag to rotate). */
export function DiePreview({ die, mapping, spin = true, focusSlot = null }: { die: Die; mapping: number[]; spin?: boolean; focusSlot?: number | null }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 1.6, 4.4], fov: 32 }} gl={{ alpha: true, antialias: true }} style={{ touchAction: 'none' }}>
      <Env />
      <hemisphereLight args={['#fff4e0', '#302018', 0.8]} />
      <directionalLight position={[3, 6, 4]} intensity={2.2} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#9ec5ff" />
      <Model die={die} mapping={mapping} spin={spin} focusSlot={focusSlot} />
      <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={0.9} />
    </Canvas>
  );
}
