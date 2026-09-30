import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BUILTIN_DICE, BUILTIN_SETS } from '../data/presets';
import { displayName, normalizeDie } from '../model/faces';
import { newId } from '../model/ids';
import { uniqueName } from '../model/names';
import type { DiceSet, Die, Lang } from '../model/types';

export interface LibraryState {
  dice: Record<string, Die>;
  sets: Record<string, DiceSet>;
  diceOrder: string[];
  setOrder: string[];
  saveDie: (die: Die) => void;
  deleteDie: (id: string) => void;
  duplicateDie: (id: string, lang: Lang, suffix: string) => Die | null;
  saveSet: (set: DiceSet) => void;
  deleteSet: (id: string) => void;
  cloneSet: (id: string, name: string) => DiceSet | null;
  restoreDefaults: () => void;
  moveSet: (id: string, dir: -1 | 1) => void;
}

const byId = <T extends { id: string }>(items: T[]) => Object.fromEntries(items.map((i) => [i.id, i])) as Record<string, T>;

export function blankDie(partial: Partial<Die> = {}): Die {
  return {
    id: newId(),
    name: '',
    faces: 6,
    color: '#c92a2a',
    material: 'plastic',
    start: 1,
    step: 1,
    ranges: [],
    overrides: {},
    updatedAt: Date.now(),
    ...partial,
  };
}

export function blankSet(partial: Partial<DiceSet> = {}): DiceSet {
  return {
    id: newId(),
    name: '',
    dice: [],
    background: { kind: 'preset', id: 'felt' },
    tally: { sum: true, groupNumbers: false },
    updatedAt: Date.now(),
    ...partial,
  };
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      dice: byId(BUILTIN_DICE),
      sets: byId(BUILTIN_SETS),
      diceOrder: BUILTIN_DICE.map((d) => d.id),
      setOrder: BUILTIN_SETS.map((s) => s.id),

      saveDie: (die) =>
        set((s) => {
          const prev = s.dice[die.id];
          const clean = normalizeDie({ ...die, updatedAt: Date.now() });
          // a renamed factory die stops following the language
          if (prev?.names && prev.name !== clean.name) delete clean.names;
          return {
            dice: { ...s.dice, [die.id]: clean },
            diceOrder: s.diceOrder.includes(die.id) ? s.diceOrder : [...s.diceOrder, die.id],
          };
        }),

      deleteDie: (id) =>
        set((s) => {
          const dice = { ...s.dice };
          delete dice[id];
          const sets = { ...s.sets };
          for (const [sid, st] of Object.entries(sets))
            if (st.dice.includes(id)) sets[sid] = { ...st, dice: st.dice.filter((d) => d !== id), updatedAt: Date.now() };
          return { dice, sets, diceOrder: s.diceOrder.filter((d) => d !== id) };
        }),

      duplicateDie: (id, lang, suffix) => {
        const src = get().dice[id];
        if (!src) return null;
        const names = Object.values(get().dice).map((d) => displayName(d, lang));
        const copy: Die = {
          ...structuredClone(src),
          id: newId(),
          name: uniqueName(`${displayName(src, lang)} ${suffix}`, names),
          names: undefined,
          builtin: undefined,
          updatedAt: Date.now(),
        };
        delete copy.names;
        delete copy.builtin;
        get().saveDie(copy);
        return copy;
      },

      saveSet: (st) =>
        set((s) => {
          const prev = s.sets[st.id];
          const clean = { ...st, updatedAt: Date.now() };
          if (prev?.names && prev.name !== clean.name) delete clean.names;
          return {
            sets: { ...s.sets, [st.id]: clean },
            setOrder: s.setOrder.includes(st.id) ? s.setOrder : [...s.setOrder, st.id],
          };
        }),

      deleteSet: (id) =>
        set((s) => {
          const sets = { ...s.sets };
          delete sets[id];
          return { sets, setOrder: s.setOrder.filter((x) => x !== id) };
        }),

      cloneSet: (id, name) => {
        const src = get().sets[id];
        if (!src) return null;
        const copy: DiceSet = { ...structuredClone(src), id: newId(), name, updatedAt: Date.now() };
        delete copy.names;
        delete copy.builtin;
        get().saveSet(copy);
        return copy;
      },

      restoreDefaults: () =>
        set((s) => {
          const dice = { ...s.dice };
          const sets = { ...s.sets };
          for (const d of BUILTIN_DICE) dice[d.id] = structuredClone(d);
          for (const st of BUILTIN_SETS) sets[st.id] = structuredClone(st);
          const diceOrder = [...BUILTIN_DICE.map((d) => d.id), ...s.diceOrder.filter((id) => !id.startsWith('b-'))];
          const setOrder = [...BUILTIN_SETS.map((d) => d.id), ...s.setOrder.filter((id) => !id.startsWith('b-'))];
          return { dice, sets, diceOrder, setOrder };
        }),

      moveSet: (id, dir) =>
        set((s) => {
          const order = s.setOrder.slice();
          const i = order.indexOf(id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= order.length) return {};
          [order[i], order[j]] = [order[j], order[i]];
          return { setOrder: order };
        }),
    }),
    {
      name: 'dhd.library.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ dice: s.dice, sets: s.sets, diceOrder: s.diceOrder, setOrder: s.setOrder }),
    },
  ),
);

/** Sets that reference a die. */
export function setsUsingDie(sets: Record<string, DiceSet>, dieId: string): DiceSet[] {
  return Object.values(sets).filter((s) => s.dice.includes(dieId));
}

export { uniqueName };
