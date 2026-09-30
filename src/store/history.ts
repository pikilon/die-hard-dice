import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { RollEntry } from '../model/types';

const MAX = 200;

interface HistoryState {
  entries: RollEntry[];
  add: (e: RollEntry) => void;
  update: (id: string, fn: (e: RollEntry) => RollEntry) => void;
  clear: (setId?: string) => void;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      add: (e) => set((s) => ({ entries: [e, ...s.entries].slice(0, MAX) })),
      update: (id, fn) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? fn(e) : e)) })),
      clear: (setId) => set((s) => ({ entries: setId ? s.entries.filter((e) => e.setId !== setId) : [] })),
    }),
    { name: 'dhd.history.v1', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
