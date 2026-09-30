import { CanvasTexture, MeshPhysicalMaterial, SRGBColorSpace, type Texture } from 'three';
import type { Die, MaterialId } from '../model/types';
import { drawAtlas } from './atlas';
import { iconsVersion } from './icons';

interface MatParams {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  bumpScale: number;
  transparent?: boolean;
  envMapIntensity?: number;
  sheen?: number;
}

export const MATERIAL_PARAMS: Record<MaterialId, MatParams> = {
  plastic: { roughness: 0.38, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, bumpScale: 1.4, envMapIntensity: 0.8 },
  marble: { roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, bumpScale: 1.6, envMapIntensity: 1.1 },
  metal: { roughness: 0.3, metalness: 0.92, clearcoat: 0.2, clearcoatRoughness: 0.3, bumpScale: 2.2, envMapIntensity: 1.4 },
  wood: { roughness: 0.62, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5, bumpScale: 2, envMapIntensity: 0.6 },
  glass: { roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, bumpScale: 0, transparent: true, envMapIntensity: 1.5 },
  stone: { roughness: 0.85, metalness: 0, clearcoat: 0, clearcoatRoughness: 1, bumpScale: 2.4, envMapIntensity: 0.5 },
};

export function dieVisualKey(die: Die): string {
  return JSON.stringify([die.faces, die.color, die.material, die.start, die.step, die.ranges, die.overrides]);
}

interface Entry {
  material: MeshPhysicalMaterial;
  textures: Texture[];
  refs: number;
  pending: boolean;
}

const pool = new Map<string, Entry>();

function build(die: Die, mapping: number[]): Entry {
  const { map, bump, pending } = drawAtlas(die, mapping);
  const p = MATERIAL_PARAMS[die.material];
  const tex = new CanvasTexture(map);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  const textures: Texture[] = [tex];
  const material = new MeshPhysicalMaterial({
    map: tex,
    roughness: p.roughness,
    metalness: p.metalness,
    clearcoat: p.clearcoat,
    clearcoatRoughness: p.clearcoatRoughness,
    envMapIntensity: p.envMapIntensity ?? 1,
    transparent: !!p.transparent,
    ior: 1.5,
  });
  if (p.transparent) {
    material.depthWrite = true;
    material.specularIntensity = 1;
  }
  if (bump) {
    const bt = new CanvasTexture(bump);
    textures.push(bt);
    material.bumpMap = bt;
    material.bumpScale = p.bumpScale;
  }
  return { material, textures, refs: 0, pending };
}

/**
 * Shared material for (die look, mapping). Call `release` with the same key when done.
 */
export function acquireDieMaterial(die: Die, mapping: number[]): { key: string; material: MeshPhysicalMaterial; pending: boolean } {
  const key = `${iconsVersion()}|${dieVisualKey(die)}|${mapping.join(',')}`;
  let e = pool.get(key);
  if (!e) {
    e = build(die, mapping);
    pool.set(key, e);
  }
  e.refs++;
  return { key, material: e.material, pending: e.pending };
}

export function releaseDieMaterial(key: string) {
  const e = pool.get(key);
  if (!e) return;
  e.refs--;
  if (e.refs <= 0) {
    // keep a little while so quick re-acquires (StrictMode, re-renders) reuse it
    setTimeout(() => {
      const cur = pool.get(key);
      if (cur && cur.refs <= 0) {
        cur.material.dispose();
        cur.textures.forEach((t) => t.dispose());
        pool.delete(key);
      }
    }, 3000);
  }
}
