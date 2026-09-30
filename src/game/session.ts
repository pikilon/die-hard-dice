import { translate } from '../i18n';
import { displayName } from '../model/faces';
import { newId } from '../model/ids';
import type { DieResult, RollEntry } from '../model/types';
import { useHistory } from '../store/history';
import { useLibrary } from '../store/library';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';
import { toast } from '../ui/feedback';

const lang = () => useSettings.getState().lang;

export function dieOf(dieId: string) {
  return useLibrary.getState().dice[dieId];
}

/** Stores the outcome of a throw in the table runtime and in the history. */
export function commitRoll(results: { uid: string; face: number }[], kind: 'roll' | 'reroll') {
  const table = useTable.getState();
  const lib = useLibrary.getState();
  const set = table.setId ? lib.sets[table.setId] : undefined;
  for (const r of results) table.setRuntime(r.uid, { face: r.face, original: undefined, rerolled: kind === 'reroll' });
  if (kind === 'roll') for (const d of table.dice) if (!results.some((r) => r.uid === d.uid)) table.setRuntime(d.uid, { rerolled: false });

  const toResult = (uid: string, face: number): DieResult => ({ uid, dieId: table.dice.find((d) => d.uid === uid)!.dieId, face });
  const history = useHistory.getState();
  const current = table.entryId ? history.entries.find((e) => e.id === table.entryId) : undefined;

  if (kind === 'reroll' && current) {
    history.update(current.id, (e) => ({
      ...e,
      dice: snapshot(e.dice, results.map((r) => toResult(r.uid, r.face).dieId)),
      rerolls: [...e.rerolls, { at: Date.now(), results: results.map((r) => toResult(r.uid, r.face)) }],
    }));
    return;
  }
  const all = useTable.getState().dice.map((d) => ({ uid: d.uid, face: useTable.getState().rt[d.uid]?.face ?? 1 }));
  const entry: RollEntry = {
    id: newId(),
    at: Date.now(),
    setId: table.setId ?? '',
    setName: set ? displayName(set, lang()) : '',
    dice: snapshot({}, table.dice.map((d) => d.dieId)),
    results: all.map((r) => toResult(r.uid, r.face)),
    rerolls: [],
  };
  history.add(entry);
  table.setEntry(entry.id);
}

function snapshot(existing: RollEntry['dice'], ids: string[]): RollEntry['dice'] {
  const out = { ...existing };
  const lib = useLibrary.getState().dice;
  for (const id of ids) if (!out[id] && lib[id]) out[id] = structuredClone(lib[id]);
  return out;
}

/** Manually changes the value of a die; reflected in tally and history. */
export function alterFace(uid: string, face: number) {
  const table = useTable.getState();
  const rt = table.rt[uid];
  if (!rt) return;
  const original = rt.original ?? rt.face ?? undefined;
  table.setRuntime(uid, { face, original: original === face ? undefined : original });
  const entryId = table.entryId;
  if (!entryId) return;
  useHistory.getState().update(entryId, (e) => {
    const patch = (list: DieResult[]) =>
      list.map((r) => (r.uid === uid ? { ...r, face, original: (r.original ?? r.face) === face ? undefined : (r.original ?? r.face) } : r));
    const lastReroll = [...e.rerolls].reverse().find((rr) => rr.results.some((r) => r.uid === uid));
    if (lastReroll) return { ...e, rerolls: e.rerolls.map((rr) => (rr === lastReroll ? { ...rr, results: patch(rr.results) } : rr)) };
    return { ...e, results: patch(e.results) };
  });
}

function saveTableToSet() {
  const table = useTable.getState();
  const lib = useLibrary.getState();
  const set = table.setId ? lib.sets[table.setId] : undefined;
  if (!set) return;
  lib.saveSet({ ...set, dice: table.dice.map((d) => d.dieId) });
  table.setDirty(false);
  toast(translate(lang(), 'common.saved'));
}

export function removeFromTable(uid: string) {
  const table = useTable.getState();
  const td = table.dice.find((d) => d.uid === uid);
  if (!td) return;
  const die = dieOf(td.dieId);
  table.removeDie(uid);
  table.setDirty(true);
  const l = lang();
  toast(translate(l, 'play.saveRemovedQ', { name: die ? displayName(die, l) : '?' }), [
    { label: translate(l, 'play.onlyThisGame'), onClick: () => undefined },
    { label: translate(l, 'play.saveInSet'), primary: true, onClick: saveTableToSet },
  ]);
}

export function addToTable(dieId: string): string | null {
  const die = dieOf(dieId);
  if (!die) return null;
  const table = useTable.getState();
  const uid = table.addDie(die);
  table.setDirty(true);
  const l = lang();
  toast(translate(l, 'play.saveAddedQ', { name: displayName(die, l) }), [
    { label: translate(l, 'play.onlyThisGame'), onClick: () => undefined },
    { label: translate(l, 'play.saveInSet'), primary: true, onClick: saveTableToSet },
  ]);
  return uid;
}

export { saveTableToSet };
