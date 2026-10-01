import { create } from 'zustand';
import { newId } from '../model/ids';
import { windowMapping } from '../model/solids';
import type { Die } from '../model/types';

/** A die on the table (an instance of a library die). */
export interface TableDie {
  uid: string;
  dieId: string;
}

export interface DieRuntime {
  /** Logical face showing (null = not rolled yet). */
  face: number | null;
  /** Face rolled before a manual change. */
  original?: number;
  /** Slot → logical face currently painted on the solid. */
  mapping: number[];
  rerolled?: boolean;
}

export type Phase = 'idle' | 'waiting' | 'gathering' | 'shaking' | 'tilting' | 'pouring' | 'settling';

export interface MenuState {
  uid: string;
  x: number;
  y: number;
}

interface TableState {
  setId: string | null;
  dice: TableDie[];
  rt: Record<string, DieRuntime>;
  selected: string[];
  phase: Phase;
  rolling: string[];
  entryId: string | null;
  menu: MenuState | null;
  /** Accelerometer shaking is active (waiting for a tap/stop). */
  motionShake: boolean;
  /** Changes the user made to the table composition vs the saved set. */
  dirty: boolean;
  /** Last die added mid-game (it is dropped from above instead of laid out). */
  justAdded: string | null;

  load: (setId: string, dice: Die[]) => void;
  addDie: (die: Die) => string;
  removeDie: (uid: string) => void;
  toggleSelect: (uid: string) => void;
  clearSelection: () => void;
  setPhase: (p: Phase) => void;
  setRolling: (uids: string[]) => void;
  setMapping: (uid: string, mapping: number[]) => void;
  setRuntime: (uid: string, patch: Partial<DieRuntime>) => void;
  setEntry: (id: string | null) => void;
  openMenu: (m: MenuState) => void;
  closeMenu: () => void;
  setMotionShake: (v: boolean) => void;
  setDirty: (v: boolean) => void;
}

function runtimeFor(die: Die): DieRuntime {
  return { face: null, mapping: windowMapping(die.faces, 1) };
}

export const useTable = create<TableState>((set) => ({
  setId: null,
  dice: [],
  rt: {},
  selected: [],
  phase: 'idle',
  rolling: [],
  entryId: null,
  menu: null,
  motionShake: false,
  dirty: false,
  justAdded: null,

  load: (setId, dice) => {
    const list = dice.map((d) => ({ uid: newId(8), dieId: d.id }));
    const rt: Record<string, DieRuntime> = {};
    list.forEach((t, i) => (rt[t.uid] = runtimeFor(dice[i])));
    set({ setId, dice: list, rt, selected: [], phase: 'idle', rolling: [], entryId: null, menu: null, motionShake: false, dirty: false, justAdded: null });
  },

  addDie: (die) => {
    const uid = newId(8);
    set((s) => ({ dice: [...s.dice, { uid, dieId: die.id }], rt: { ...s.rt, [uid]: runtimeFor(die) }, justAdded: uid }));
    return uid;
  },

  removeDie: (uid) =>
    set((s) => {
      const rt = { ...s.rt };
      delete rt[uid];
      return {
        dice: s.dice.filter((d) => d.uid !== uid),
        rt,
        selected: s.selected.filter((x) => x !== uid),
        menu: s.menu?.uid === uid ? null : s.menu,
      };
    }),

  toggleSelect: (uid) =>
    set((s) => ({ selected: s.selected.includes(uid) ? s.selected.filter((x) => x !== uid) : [...s.selected, uid] })),
  clearSelection: () => set({ selected: [] }),
  setPhase: (phase) => set({ phase }),
  setRolling: (rolling) => set({ rolling }),
  setMapping: (uid, mapping) => set((s) => (s.rt[uid] ? { rt: { ...s.rt, [uid]: { ...s.rt[uid], mapping } } } : {})),
  setRuntime: (uid, patch) => set((s) => (s.rt[uid] ? { rt: { ...s.rt, [uid]: { ...s.rt[uid], ...patch } } } : {})),
  setEntry: (entryId) => set({ entryId }),
  openMenu: (menu) => set({ menu }),
  closeMenu: () => set({ menu: null }),
  setMotionShake: (motionShake) => set({ motionShake }),
  setDirty: (dirty) => set({ dirty }),
}));
