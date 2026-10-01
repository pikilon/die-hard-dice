import { useSyncExternalStore } from 'react';

/** "Install app" support (FR-312..314). Imported from main.tsx so `beforeinstallprompt` is never missed. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const standalone = () =>
  (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || (navigator as unknown as { standalone?: boolean }).standalone === true;

const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const KEY = 'dhd.installDismissed';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** FR-315: closed → ask again after 7 days. */
function snoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(KEY));
    return !!at && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

export interface InstallState {
  /** the card should be visible (FR-312..315) */
  show: boolean;
  canInstall: boolean;
  isStandalone: boolean;
  isIOS: boolean;
}

let deferred: InstallEvent | null = null;
let dismissedNow = false; // session fallback when localStorage is unavailable
let state: InstallState = { show: false, canInstall: false, isStandalone: standalone(), isIOS: ios() };
const visible = (s: Omit<InstallState, 'show'>) => !s.isStandalone && (s.canInstall || s.isIOS) && !dismissedNow && !snoozed();
const listeners = new Set<() => void>();
const set = (patch: Partial<Omit<InstallState, 'show'>>) => {
  const { show: _, ...rest } = { ...state, ...patch };
  state = { ...rest, show: visible(rest) };
  listeners.forEach((l) => l());
};

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallEvent;
  set({ canInstall: true });
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  set({ canInstall: false, isStandalone: true });
});

state = { ...state, show: visible(state) };

const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
export const useInstall = () => useSyncExternalStore(subscribe, () => state);
export function dismissInstall() {
  dismissedNow = true;
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* session only */
  }
  set({});
}

export const isStandalone = () => state.isStandalone;

export async function promptInstall() {
  if (!deferred) return;
  const d = deferred;
  deferred = null;
  set({ canInstall: false });
  await d.prompt();
  const choice = await d.userChoice.catch(() => null);
  if (choice?.outcome === 'dismissed') dismissInstall();
}
