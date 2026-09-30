import type { MaterialId } from '../model/types';

/**
 * Procedural surface patterns per material. Each pattern is two grayscale masks:
 *  - `dark`: drawn with 'multiply' (white = no change)
 *  - `light`: drawn with 'screen' (black = no change)
 * so veins/grain show up on both light and dark dice.
 */
export interface Pattern {
  dark: HTMLCanvasElement;
  light: HTMLCanvasElement;
}

const SIZE = 256;

function hash(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 17);
    amp *= 0.5;
    freq *= 2;
  }
  return sum;
}

/** Returns -1..1: negative darkens, positive lightens. */
function sample(material: MaterialId, x: number, y: number): number {
  const nx = x / SIZE;
  const ny = y / SIZE;
  switch (material) {
    case 'marble': {
      const t = fbm(nx * 4, ny * 4, 7, 5);
      const vein = Math.abs(Math.sin((nx * 3 + ny * 2 + t * 4.5) * Math.PI));
      const v = 1 - Math.pow(vein, 0.18);
      const cloud = (fbm(nx * 2.5, ny * 2.5, 3) - 0.5) * 0.35;
      return Math.min(1, v * 1.1) * 0.85 + cloud;
    }
    case 'wood': {
      const t = fbm(nx * 3, ny * 12, 5, 4);
      const ring = (Math.sin((ny * 18 + t * 5) * Math.PI) + 1) / 2;
      return -Math.pow(ring, 3) * 0.55 + (fbm(nx * 40, ny * 3, 9, 2) - 0.5) * 0.25;
    }
    case 'metal': {
      const streak = fbm(nx * 2, ny * 90, 11, 3) - 0.5;
      return streak * 0.35;
    }
    case 'stone': {
      const base = (fbm(nx * 6, ny * 6, 13, 5) - 0.5) * 0.6;
      const r = hash(Math.floor(x / 2), Math.floor(y / 2), 5);
      const speck = r > 0.93 ? 0.55 : r < 0.06 ? -0.6 : 0;
      return base + speck;
    }
    case 'plastic':
      return (fbm(nx * 30, ny * 30, 21, 2) - 0.5) * 0.06;
    case 'glass':
      return 0;
  }
}

const cache = new Map<MaterialId, Pattern | null>();

export function getPattern(material: MaterialId): Pattern | null {
  if (cache.has(material)) return cache.get(material)!;
  if (material === 'glass' || typeof document === 'undefined') {
    cache.set(material, null);
    return null;
  }
  const dark = document.createElement('canvas');
  const light = document.createElement('canvas');
  dark.width = dark.height = light.width = light.height = SIZE;
  const dctx = dark.getContext('2d')!;
  const lctx = light.getContext('2d')!;
  const di = dctx.createImageData(SIZE, SIZE);
  const li = lctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const s = Math.max(-1, Math.min(1, sample(material, x, y)));
      const i = (y * SIZE + x) * 4;
      const dv = s < 0 ? Math.round(255 * (1 + s)) : 255;
      const lv = s > 0 ? Math.round(255 * s) : 0;
      di.data[i] = di.data[i + 1] = di.data[i + 2] = dv;
      li.data[i] = li.data[i + 1] = li.data[i + 2] = lv;
      di.data[i + 3] = li.data[i + 3] = 255;
    }
  dctx.putImageData(di, 0, 0);
  lctx.putImageData(li, 0, 0);
  const p = { dark, light };
  cache.set(material, p);
  return p;
}

/** Paints the material pattern over the current clip region of `ctx`. */
export function applyPattern(ctx: CanvasRenderingContext2D, p: Pattern | null, x: number, y: number, w: number, h: number, strength = 1) {
  if (!p) return;
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(p.dark, x, y, w, h);
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(p.light, x, y, w, h);
  ctx.restore();
}
