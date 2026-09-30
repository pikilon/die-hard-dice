import { autoContrast } from './color';
import type { Die, FaceProps, FaceValue, Lang, ResolvedFace } from './types';

export const MAX_FACES = 1000;
export const MAX_GRAPHEMES = 3;

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

export function graphemes(s: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(s), (x) => x.segment);
  return Array.from(s);
}

/** Keeps at most 3 graphemes (so emoji with modifiers count as one). */
export function clampText(s: string): string {
  return graphemes(s.replace(/\s+/g, ' ').trim()).slice(0, MAX_GRAPHEMES).join('');
}

export function formatNumber(n: number): string {
  const r = Math.round(n * 1e6) / 1e6;
  return String(r);
}

export function defaultValue(die: Pick<Die, 'start' | 'step'>, index: number): FaceValue {
  return { t: formatNumber(die.start + (index - 1) * die.step) };
}

export function parseNumeric(v: FaceValue): number | null {
  if (!('t' in v)) return null;
  const s = v.t.trim().replace(',', '.');
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

export function sameValue(a: FaceValue, b: FaceValue): boolean {
  if ('t' in a && 't' in b) return a.t === b.t;
  if ('i' in a && 'i' in b) return a.i === b.i;
  return false;
}

/** Face props before contrast resolution: numbering → ranges (in order) → per-face override. */
export function faceProps(die: Die, index: number): Required<Pick<FaceProps, 'v' | 'bg'>> & { fg?: string } {
  let v: FaceValue = defaultValue(die, index);
  let bg = die.color;
  let fg: string | undefined;
  for (const r of die.ranges) {
    if (index >= r.from && index <= r.to) {
      if (r.v) v = r.v;
      if (r.bg) bg = r.bg;
      if (r.fg) fg = r.fg;
    }
  }
  const o = die.overrides[index];
  if (o) {
    if (o.v) v = o.v;
    if (o.bg) bg = o.bg;
    if (o.fg) fg = o.fg;
  }
  return { v, bg, fg };
}

export function resolveFace(die: Die, index: number): ResolvedFace {
  const p = faceProps(die, index);
  return { index, value: p.v, bg: p.bg, fg: p.fg ?? autoContrast(p.bg), num: parseNumeric(p.v) };
}

export function resolveAllFaces(die: Die): ResolvedFace[] {
  const out: ResolvedFace[] = [];
  for (let i = 1; i <= die.faces; i++) out.push(resolveFace(die, i));
  return out;
}

/** Stable key describing how a face looks (used to group identical results). */
export function faceLookKey(f: ResolvedFace): string {
  const v = 't' in f.value ? `t:${f.value.t}` : `i:${f.value.i}`;
  return `${v}|${f.bg.toLowerCase()}|${f.fg.toLowerCase()}`;
}

export function displayName(item: { name: string; names?: Partial<Record<Lang, string>> }, lang: Lang): string {
  return item.names?.[lang] ?? item.name;
}

/** Removes overrides/ranges pointing at faces that no longer exist and clamps ranges. */
export function normalizeDie(die: Die): Die {
  const faces = Math.max(2, Math.min(MAX_FACES, Math.round(die.faces)));
  const overrides: Record<number, FaceProps> = {};
  for (const [k, v] of Object.entries(die.overrides)) {
    const i = Number(k);
    if (i >= 1 && i <= faces && (v.v || v.bg || v.fg)) overrides[i] = v;
  }
  const ranges = die.ranges
    .map((r) => ({ ...r, from: Math.max(1, Math.min(faces, r.from)), to: Math.max(1, Math.min(faces, r.to)) }))
    .map((r) => (r.from > r.to ? { ...r, from: r.to, to: r.from } : r));
  return { ...die, faces, overrides, ranges };
}
