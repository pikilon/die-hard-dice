import { useFrame } from '@react-three/fiber';
import { CuboidCollider, CylinderCollider, RigidBody, type RapierCollider, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, DoubleSide, Group, LatheGeometry, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three';
import { cupPose, director, useCup } from './director';

function leatherTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#3d1d10');
  grad.addColorStop(0.5, '#6b3520');
  grad.addColorStop(1, '#4a2414');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  // pebbled leather
  const img = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i] += n;
    img.data[i + 1] += n * 0.8;
    img.data[i + 2] += n * 0.6;
  }
  g.putImageData(img, 0, 0);
  // tooled gold bands and stitches (v: 0 = bottom, 1 = rim along the profile)
  const band = (y: number, h: number) => {
    const bg = g.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, '#8a6417');
    bg.addColorStop(0.5, '#f2c96a');
    bg.addColorStop(1, '#8a6417');
    g.fillStyle = bg;
    g.fillRect(0, y, c.width, h);
    g.fillStyle = '#5a3d0a';
    for (let x = 0; x < c.width; x += 32) {
      g.beginPath();
      g.moveTo(x, y + h / 2);
      g.lineTo(x + 8, y + 3);
      g.lineTo(x + 16, y + h / 2);
      g.lineTo(x + 8, y + h - 3);
      g.closePath();
      g.fill();
    }
  };
  const stitch = (y: number) => {
    g.strokeStyle = '#e8d3a8';
    g.lineWidth = 3;
    g.setLineDash([14, 10]);
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(c.width, y);
    g.stroke();
    g.setLineDash([]);
  };
  band(c.height * 0.2, 26);
  band(c.height * 0.72, 18);
  stitch(c.height * 0.12);
  stitch(c.height * 0.3);
  stitch(c.height * 0.84);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  t.flipY = false;
  return t;
}

function feltTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6e1420';
  g.fillRect(0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 30;
    img.data[i] += n;
    img.data[i + 1] += n * 0.4;
    img.data[i + 2] += n * 0.4;
  }
  g.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(4, 2);
  return t;
}

const WALLS = 18;

export function Cup() {
  const spec = useCup((s) => s.spec);
  const body = useRef<RapierRigidBody>(null);
  const walls = useRef<(RapierCollider | null)[]>([]);
  const base = useRef<RapierCollider>(null);
  const lid = useRef<RapierCollider>(null);
  const group = useRef<Group>(null);

  const mats = useMemo(() => {
    const outer = new MeshStandardMaterial({ map: leatherTexture(), roughness: 0.62, metalness: 0.05, side: DoubleSide });
    const inner = new MeshStandardMaterial({ map: feltTexture(), roughness: 0.95, side: DoubleSide });
    return { outer, inner };
  }, []);

  const { r, h } = { r: spec.radius, h: spec.height };
  const geoms = useMemo(() => {
    const w = 0.32;
    const outerPts = [
      [0.001, 0],
      [r + w - 0.14, 0],
      [r + w - 0.06, 0.07],
      [r + w, 0.3],
      [r + w + 0.12, h - 0.05],
      [r + w + 0.16, h + 0.06],
      [r + w + 0.06, h + 0.17],
      [r + w * 0.5, h + 0.2],
      [r + 0.04, h + 0.1],
      [r, h - 0.08],
    ].map(([x, y]) => new Vector2(x, y));
    const innerPts = [
      [r, h - 0.08],
      [r, 0.42],
      [r - 0.12, 0.3],
      [0.001, 0.3],
    ].map(([x, y]) => new Vector2(x, y));
    return { outer: new LatheGeometry(outerPts, 64), inner: new LatheGeometry(innerPts, 64) };
  }, [r, h]);

  useEffect(() => () => {
    geoms.outer.dispose();
    geoms.inner.dispose();
  }, [geoms]);

  useEffect(() => {
    director.cupBody = body.current;
    director.cupWalls = [...walls.current.filter((c): c is RapierCollider => !!c), ...(base.current ? [base.current] : []), ...(lid.current ? [lid.current] : [])];
    director.cupLid = lid.current;
    return () => {
      director.cupBody = null;
      director.cupWalls = [];
      director.cupLid = null;
    };
  }, [spec.key, spec.visible]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(cupPose.pos);
    g.quaternion.copy(cupPose.quat);
    g.scale.setScalar(Math.max(0.001, cupPose.scale));
    const o = cupPose.opacity;
    for (const m of [mats.outer, mats.inner]) {
      m.transparent = o < 0.999;
      m.opacity = o;
      m.depthWrite = o > 0.5;
    }
  });

  if (!spec.visible) return null;
  const R = r + 0.18;
  const halfW = R * Math.tan(Math.PI / WALLS) * 1.25;
  return (
    <>
      <RigidBody key={spec.key} ref={body} type="kinematicPosition" colliders={false} position={cupPose.pos.toArray()} userData={{ kind: 'cup' }}>
        <CylinderCollider ref={base} args={[0.15, r + 0.2]} position={[0, 0.15, 0]} friction={0.4} restitution={0.2} />
        {Array.from({ length: WALLS }, (_, i) => {
          const a = (i / WALLS) * Math.PI * 2;
          return (
            <CuboidCollider
              key={i}
              ref={(c) => {
                walls.current[i] = c;
              }}
              args={[halfW, h / 2 + 0.1, 0.18]}
              position={[Math.cos(a) * R, h / 2, Math.sin(a) * R]}
              rotation={[0, Math.PI / 2 - a, 0]}
              friction={0.2}
              restitution={0.25}
            />
          );
        })}
        <CuboidCollider ref={lid} args={[r + 0.5, 0.25, r + 0.5]} position={[0, h + 0.2, 0]} />
      </RigidBody>
      <group ref={group}>
        <mesh geometry={geoms.outer} material={mats.outer} castShadow receiveShadow />
        <mesh geometry={geoms.inner} material={mats.inner} receiveShadow />
      </group>
    </>
  );
}
