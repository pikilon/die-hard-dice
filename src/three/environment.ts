import { PMREMGenerator, type Texture, type WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const envs = new WeakMap<WebGLRenderer, Texture>();

/** Neutral studio reflections generated locally (no HDR download). */
export function getEnvironment(renderer: WebGLRenderer): Texture {
  const hit = envs.get(renderer);
  if (hit) return hit;
  const pmrem = new PMREMGenerator(renderer);
  const tex = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  pmrem.dispose();
  envs.set(renderer, tex);
  return tex;
}
