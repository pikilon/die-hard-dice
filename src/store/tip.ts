import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_TIP_STATE,
  shouldAutoPromptTip,
  type TipStateData,
} from '../model/tip';

interface TipState extends TipStateData {
  isOpen: boolean;
  openTip: () => void;
  closeTip: () => void;
  markDonated: () => void;
  tickActive: (seconds: number) => void;
}

export const useTip = create<TipState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_TIP_STATE,
      isOpen: false,
      openTip: () => set({ isOpen: true }),
      closeTip: () => {
        const { donated } = get();
        set({
          isOpen: false,
          dismissedAt: donated ? null : Date.now(),
        });
      },
      markDonated: () =>
        set({
          donated: true,
          isOpen: false,
        }),
      tickActive: (seconds: number) => {
        const state = get();
        if (state.donated) return;
        const nextActive = state.activeSeconds + seconds;
        const shouldPrompt = shouldAutoPromptTip({ ...state, activeSeconds: nextActive });
        set({
          activeSeconds: nextActive,
          isOpen: shouldPrompt ? true : state.isOpen,
        });
      },
    }),
    {
      name: 'dhd.tip.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeSeconds: state.activeSeconds,
        dismissedAt: state.dismissedAt,
        donated: state.donated,
      }),
    },
  ),
);

let trackerInitialized = false;

/** Tracks active app usage and triggers the tip prompt when the threshold is reached. */
export function initTipTracker(): () => void {
  if (trackerInitialized || typeof window === 'undefined') return () => {};
  trackerInitialized = true;

  let lastInteraction = Date.now();
  const onInteraction = () => {
    lastInteraction = Date.now();
  };

  window.addEventListener('pointerdown', onInteraction, { passive: true });
  window.addEventListener('touchstart', onInteraction, { passive: true });
  window.addEventListener('keydown', onInteraction, { passive: true });

  const intervalId = window.setInterval(() => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState !== 'visible') return;
    // Don't accumulate active seconds if idle for more than 60 seconds
    if (Date.now() - lastInteraction > 60_000) return;

    useTip.getState().tickActive(1);
  }, 1000);

  return () => {
    window.removeEventListener('pointerdown', onInteraction);
    window.removeEventListener('touchstart', onInteraction);
    window.removeEventListener('keydown', onInteraction);
    window.clearInterval(intervalId);
    trackerInitialized = false;
  };
}
