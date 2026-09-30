import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { solidFor, windowMapping } from '../model/solids';
import type { Die } from '../model/types';
import { getDieMesh } from './dieGeometry';
import { getEnvironment } from './environment';
import { iconsVersion } from './icons';
import { acquireDieMaterial, dieVisualKey, releaseDieMaterial } from './materials';
import { slotDirection } from './solids';

/**
 * One shared offscreen WebGL renderer turns dice into PNG thumbnails for the 2D UI
 * (library cards, pickers, set lists). Results are cached per die look.
 */
const SIZE = 192;
let renderer: WebGLRenderer | null = null;
let scene: Scene;
let camera: PerspectiveCamera;
const cache = new Map<string, string>();
const waiting = new Map<string, { die: Die; resolvers: ((url: string) => void)[] }>();
let scheduled = false;

function setup() {
  if (renderer) return;
  const canvas = document.createElement('canvas');
  renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene = new Scene();
  scene.environment = getEnvironment(renderer);
  camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 3.2, 3.2);
  camera.lookAt(0, 0, 0);
  const key = new DirectionalLight('#fff4e0', 2.2);
  key.position.set(2, 5, 3);
  scene.add(key, new AmbientLight('#ffffff', 0.5));
}

function render(die: Die): string {
  setup();
  const solid = solidFor(die.faces);
  const { geometry, solid: def } = getDieMesh(solid);
  const mapping = windowMapping(die.faces, 1);
  const { key, material } = acquireDieMaterial(die, mapping);
  const mesh = new Mesh(geometry, material);
  // show slot 0 facing the camera, slightly tilted
  // (a d4 is read from its top vertex, so it stands on a face instead)
  const toCam = solid === 'd4' ? new Vector3(0, 1, 0) : camera.position.clone().normalize();
  const q = new Quaternion().setFromUnitVectors(slotDirection(def, 0), toCam);
  const twist = new Quaternion().setFromAxisAngle(toCam, solid === 'd2' ? 0 : solid === 'd4' ? 0.5 : 0.35);
  mesh.quaternion.copy(twist.multiply(q));
  const r = geometry.boundingSphere?.radius ?? 1;
  mesh.scale.setScalar(1.15 / r);
  if (solid === 'd2') mesh.rotateOnWorldAxis(new Vector3(1, 0, 0), -0.25);
  scene.add(mesh);
  renderer!.render(scene, camera);
  const url = renderer!.domElement.toDataURL('image/png');
  scene.remove(mesh);
  releaseDieMaterial(key);
  return url;
}

function flush() {
  scheduled = false;
  const start = performance.now();
  for (const [k, job] of waiting) {
    waiting.delete(k);
    let url = '';
    try {
      const t0 = performance.now();
      url = render(job.die);
      if (import.meta.env.DEV || (window as unknown as { __dhdDebug?: boolean }).__dhdDebug) console.log('[thumb]', job.die.name, Math.round(performance.now() - t0));
    } catch (e) {
      console.error('[thumb]', job.die.name, e);
    }
    cache.set(k, url);
    job.resolvers.forEach((r) => r(url));
    if (performance.now() - start > 12) break; // keep frames smooth
  }
  if (waiting.size) schedule();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(flush);
}

export function thumbKey(die: Die) {
  return `${iconsVersion()}|${dieVisualKey(die)}`;
}

export function cachedThumb(die: Die): string | undefined {
  return cache.get(thumbKey(die));
}

export function dieThumbnail(die: Die): Promise<string> {
  const k = thumbKey(die);
  const hit = cache.get(k);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const job = waiting.get(k);
    if (job) job.resolvers.push(resolve);
    else waiting.set(k, { die, resolvers: [resolve] });
    schedule();
  });
}
