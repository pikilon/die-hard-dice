import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Lang } from '../model/types';

interface SettingsState {
  lang: Lang;
  sound: boolean;
  lastSetId: string | null;
  showHistory: boolean;
  setLang: (l: Lang) => void;
  toggleSound: () => void;
  setLastSet: (id: string) => void;
  setShowHistory: (v: boolean) => void;
}

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'es';
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: detectLang(),
      sound: true,
      lastSetId: null,
      showHistory: false,
      setLang: (lang) => {
        document.documentElement.lang = lang;
        set({ lang });
      },
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      setLastSet: (lastSetId) => set({ lastSetId }),
      setShowHistory: (showHistory) => set({ showHistory }),
    }),
    { name: 'dhd.settings.v1', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
