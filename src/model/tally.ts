import { faceLookKey, resolveFace } from './faces';
import type { Die, ResolvedFace, TallyOptions } from './types';

export interface TallyInput {
  uid: string;
  die: Die;
  face: number;
}

export interface TallyGroup {
  key: string;
  face: ResolvedFace;
  count: number;
}

export interface Tally {
  chips: { uid: string; die: Die; face: ResolvedFace }[];
  hasNumbers: boolean;
  sum: number;
  groups: TallyGroup[];
}

export function computeTally(items: TallyInput[], opts: TallyOptions): Tally {
  const chips = items.map((it) => ({ uid: it.uid, die: it.die, face: resolveFace(it.die, it.face) }));
  let sum = 0;
  let hasNumbers = false;
  const groups = new Map<string, TallyGroup>();
  for (const c of chips) {
    if (c.face.num !== null) {
      sum += c.face.num;
      hasNumbers = true;
      if (!opts.groupNumbers) continue;
    }
    const key = faceLookKey(c.face);
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { key, face: c.face, count: 1 });
  }
  const sorted = [...groups.values()].sort((a, b) => b.count - a.count || (a.face.num ?? 0) - (b.face.num ?? 0));
  return { chips, hasNumbers, sum: Math.round(sum * 1e6) / 1e6, groups: sorted };
}
