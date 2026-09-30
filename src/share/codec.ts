import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { isHexColor } from '../model/color';
import { MAX_FACES } from '../model/faces';
import type { DiceSet, Die, FaceProps, FaceValue, SharePayload } from '../model/types';
import { MATERIALS } from '../model/types';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type Stripped<T> = Omit<T, 'updatedAt'>;

export interface EncodeResult {
  payload: string;
  /** true when a local-only uploaded background had to be replaced. */
  droppedUpload: boolean;
}

export function encodeShare(set: DiceSet, dice: Die[]): EncodeResult {
  let droppedUpload = false;
  const { updatedAt: _s, ...setData } = set;
  void _s;
  if (setData.background.kind === 'upload') {
    setData.background = { kind: 'preset', id: 'felt' };
    droppedUpload = true;
  }
  const unique = new Map(dice.map((d) => [d.id, d]));
  const diceData = [...unique.values()].map(({ updatedAt: _d, ...rest }) => {
    void _d;
    return rest;
  });
  const json = JSON.stringify({ v: 1, set: setData, dice: diceData });
  return { payload: toBase64Url(deflateSync(strToU8(json), { level: 9 })), droppedUpload };
}

export function shareUrl(payload: string): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/import?d=${payload}`;
}

// ---------- decoding with validation (never trust the URL) ----------

const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown, def: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : def);
const color = (v: unknown, def: string): string => (isHexColor(v) ? v : def);
const optColor = (v: unknown): string | undefined => (isHexColor(v) ? v : undefined);

function faceValue(v: unknown): FaceValue | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.t === 'string') return { t: o.t.slice(0, 24) };
  if (typeof o.i === 'string' && /^[a-z0-9-]{1,64}$/.test(o.i)) return { i: o.i };
  return undefined;
}

function faceProps(v: unknown): FaceProps {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const out: FaceProps = {};
  const fv = faceValue(o.v);
  if (fv) out.v = fv;
  const bg = optColor(o.bg);
  if (bg) out.bg = bg;
  const fg = optColor(o.fg);
  if (fg) out.fg = fg;
  return out;
}

function names(v: unknown): Die['names'] {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const out: NonNullable<Die['names']> = {};
  if (typeof o.es === 'string') out.es = o.es.slice(0, 80);
  if (typeof o.en === 'string') out.en = o.en.slice(0, 80);
  return Object.keys(out).length ? out : undefined;
}

export function sanitizeDie(v: unknown): Die | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = str(o.id, 40);
  if (!/^[a-z0-9-]{3,40}$/.test(id)) return null;
  const faces = Math.round(num(o.faces, 6));
  const overrides: Record<number, FaceProps> = {};
  if (o.overrides && typeof o.overrides === 'object')
    for (const [k, fp] of Object.entries(o.overrides as Record<string, unknown>)) {
      const i = Number(k);
      if (Number.isInteger(i) && i >= 1 && i <= MAX_FACES) overrides[i] = faceProps(fp);
    }
  const ranges = Array.isArray(o.ranges)
    ? o.ranges.slice(0, 100).map((r) => {
        const ro = (r ?? {}) as Record<string, unknown>;
        return { from: Math.round(num(ro.from, 1)), to: Math.round(num(ro.to, 1)), ...faceProps(r) };
      })
    : [];
  const die: Die = {
    id,
    name: str(o.name, 80),
    faces: Math.max(2, Math.min(MAX_FACES, faces)),
    color: color(o.color, '#cccccc'),
    material: MATERIALS.includes(o.material as never) ? (o.material as Die['material']) : 'plastic',
    start: num(o.start, 1),
    step: num(o.step, 1),
    ranges,
    overrides,
    updatedAt: Date.now(),
  };
  const n = names(o.names);
  if (n) die.names = n;
  if (typeof o.builtin === 'string') die.builtin = o.builtin.slice(0, 40);
  return die;
}

export function sanitizeSet(v: unknown, knownDice: Set<string>): DiceSet | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = str(o.id, 40);
  if (!/^[a-z0-9-]{3,40}$/.test(id)) return null;
  const bgo = (o.background ?? {}) as Record<string, unknown>;
  let background: DiceSet['background'] = { kind: 'preset', id: 'felt' };
  if (bgo.kind === 'preset' && typeof bgo.id === 'string') background = { kind: 'preset', id: bgo.id.slice(0, 40) };
  else if (bgo.kind === 'url' && typeof bgo.url === 'string' && /^https?:\/\//i.test(bgo.url)) background = { kind: 'url', url: bgo.url.slice(0, 2000) };
  const tally = (o.tally ?? {}) as Record<string, unknown>;
  const set: DiceSet = {
    id,
    name: str(o.name, 80),
    description: str(o.description, 500) || undefined,
    dice: Array.isArray(o.dice) ? o.dice.filter((d): d is string => typeof d === 'string' && knownDice.has(d)).slice(0, 60) : [],
    background,
    tally: { sum: tally.sum !== false, groupNumbers: tally.groupNumbers === true },
    updatedAt: Date.now(),
  };
  const n = names(o.names);
  if (n) set.names = n;
  if (typeof o.builtin === 'string') set.builtin = o.builtin.slice(0, 40);
  return set;
}

export function decodeShare(payload: string): SharePayload {
  const json = strFromU8(inflateSync(fromBase64Url(payload)));
  const raw = JSON.parse(json) as Record<string, unknown>;
  if (raw.v !== 1) throw new Error('unsupported version');
  const dice = (Array.isArray(raw.dice) ? raw.dice : []).map(sanitizeDie).filter((d): d is Die => !!d);
  const set = sanitizeSet(raw.set, new Set(dice.map((d) => d.id)));
  if (!set) throw new Error('invalid set');
  return { v: 1, set, dice };
}

export type { Stripped };
