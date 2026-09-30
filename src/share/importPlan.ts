import { displayName } from '../model/faces';
import { newId } from '../model/ids';
import type { DiceSet, Die, Lang } from '../model/types';
import { uniqueName } from '../model/names';

export type ItemStatus = 'new' | 'same' | 'conflict';
export type Choice = 'overwrite' | 'rename';

export interface PlanItem<T> {
  incoming: T;
  status: ItemStatus;
  /** Local item that is identical (same) or clashes (conflict). */
  local?: T;
  choice: Choice;
  newName: string;
}

export interface ImportPlan {
  dice: PlanItem<Die>[];
  set: PlanItem<DiceSet>;
}

function dieContent(d: Die) {
  return JSON.stringify([d.faces, d.color, d.material, d.start, d.step, d.ranges, d.overrides]);
}

function setContent(s: DiceSet, idMap: (id: string) => string = (x) => x) {
  return JSON.stringify([s.dice.map(idMap), s.background, s.tally, s.description ?? '']);
}

const norm = (s: string) => s.trim().toLowerCase();

function planItem<T extends { id: string; name: string; names?: Die['names'] }>(
  incoming: T,
  locals: T[],
  lang: Lang,
  same: (a: T, b: T) => boolean,
): PlanItem<T> {
  const inName = norm(displayName(incoming, lang));
  const byId = locals.find((l) => l.id === incoming.id);
  const taken = locals.map((l) => displayName(l, lang));
  const renamed = uniqueName(displayName(incoming, lang), taken);
  if (byId && same(byId, incoming)) return { incoming, status: 'same', local: byId, choice: 'overwrite', newName: renamed };
  const twin = locals.find((l) => norm(displayName(l, lang)) === inName && same(l, incoming));
  if (twin) return { incoming, status: 'same', local: twin, choice: 'overwrite', newName: renamed };
  const clash = byId ?? locals.find((l) => norm(displayName(l, lang)) === inName);
  if (clash) return { incoming, status: 'conflict', local: clash, choice: 'rename', newName: renamed };
  return { incoming, status: 'new', choice: 'overwrite', newName: displayName(incoming, lang) };
}

export function planImport(set: DiceSet, dice: Die[], localDice: Die[], localSets: DiceSet[], lang: Lang): ImportPlan {
  const dicePlan = dice.map((d) => planItem(d, localDice, lang, (a, b) => dieContent(a) === dieContent(b)));
  // for the set comparison, map incoming dice ids to the local ids they would reuse
  const reuse = new Map(dicePlan.filter((p) => p.status === 'same').map((p) => [p.incoming.id, p.local!.id]));
  const setPlan = planItem(set, localSets, lang, (a, b) =>
    setContent(a) === setContent(b, (id) => reuse.get(id) ?? id),
  );
  return { dice: dicePlan, set: setPlan };
}

export interface ImportResult {
  dice: Die[]; // dice to save
  set: DiceSet | null; // set to save (null if identical already exists)
  setId: string; // id of the set to open after import
}

function resolveTarget<T extends { id: string; name: string; names?: Die['names']; builtin?: string }>(
  p: PlanItem<T>,
): { item: T | null; id: string } {
  if (p.status === 'same') return { item: null, id: p.local!.id };
  if (p.status === 'conflict' && p.choice === 'overwrite') {
    return { item: { ...p.incoming, id: p.local!.id, name: p.local!.name, names: p.local!.names }, id: p.local!.id };
  }
  if (p.status === 'conflict') {
    const item = { ...p.incoming, id: newId(), name: p.newName.trim() || p.incoming.name };
    delete item.names;
    delete item.builtin;
    return { item, id: item.id };
  }
  return { item: { ...p.incoming }, id: p.incoming.id };
}

export function applyImport(plan: ImportPlan): ImportResult {
  const idMap = new Map<string, string>();
  const dice: Die[] = [];
  for (const p of plan.dice) {
    const { item, id } = resolveTarget(p);
    idMap.set(p.incoming.id, id);
    if (item) dice.push({ ...item, updatedAt: Date.now() });
  }
  const { item, id } = resolveTarget(plan.set);
  const set = item ? { ...item, dice: item.dice.map((d) => idMap.get(d) ?? d), updatedAt: Date.now() } : null;
  return { dice, set, setId: id };
}
