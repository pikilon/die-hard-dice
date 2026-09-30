import type { Rng } from './ids';
import type { SolidId } from './types';

export const SOLID_FACES: Record<SolidId, number> = { d2: 2, d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
const ORDER: SolidId[] = ['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'];

/** Biggest solid with at most N faces: a physical face is never blank. */
export function solidFor(n: number): SolidId {
  let best: SolidId = 'd2';
  for (const s of ORDER) if (SOLID_FACES[s] <= n) best = s;
  return best;
}

export function slotsFor(n: number): number {
  return SOLID_FACES[solidFor(n)];
}

export function isImpossible(n: number): boolean {
  return slotsFor(n) !== n;
}

/** Mapping slot → logical face (1-based) showing faces start..start+M-1. */
export function windowMapping(n: number, start = 1): number[] {
  const m = slotsFor(n);
  const s = Math.max(1, Math.min(n - m + 1, start));
  return Array.from({ length: m }, (_, i) => s + i);
}

/**
 * Random slice for impossible dice: a uniformly random subset of M logical faces out of N,
 * randomly distributed over the M physical slots. Each logical face ends up face-up with
 * probability (M/N)·(1/M) = 1/N. Regular dice keep their canonical layout.
 */
export function randomMapping(n: number, rng: Rng): number[] {
  const m = slotsFor(n);
  if (m === n) return windowMapping(n, 1);
  const pool = Array.from({ length: n }, (_, i) => i + 1);
  // partial Fisher-Yates: the first m entries are a uniform random ordered sample
  for (let i = 0; i < m; i++) {
    const j = i + rng(n - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, m);
}

/**
 * Returns a mapping in which `face` is shown on `slot`. If the face is already on another slot,
 * the two slots swap; otherwise the face replaces what was on `slot`.
 */
export function placeFace(mapping: number[], slot: number, face: number): number[] {
  const next = mapping.slice();
  const at = next.indexOf(face);
  if (at === slot) return next;
  if (at >= 0) next[at] = next[slot];
  next[slot] = face;
  return next;
}
