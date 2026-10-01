import { useSyncExternalStore } from 'react';

/** "Install app" support (FR-312..314). Imported from main.tsx so `beforeinstallprompt` is never missed. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const standalone = () =>
  (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || (navigator as unknown as { standalone?: boolean }).standalone === true;

const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export interface InstallState {
  canInstall: boolean;
  isStandalone: boolean;
  isIOS: boolean;
}

let deferred: InstallEvent | null = null;
let state: InstallState = { canInstall: false, isStandalone: standalone(), isIOS: ios() };
const listeners = new Set<() => void>();
const set = (patch: Partial<InstallState>) => {
  state = { ...state, ...patch };
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

const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
export const useInstall = () => useSyncExternalStore(subscribe, () => state);
export const isStandalone = () => state.isStandalone;

export async function promptInstall() {
  if (!deferred) return;
  const d = deferred;
  deferred = null;
  set({ canInstall: false });
  await d.prompt();
  await d.userChoice.catch(() => {});
}
