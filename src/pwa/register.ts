import { useSyncExternalStore } from 'react';

/** Service worker registration + update state (FR-350..358). Only active in production builds. */
export interface PwaState {
  needRefresh: boolean;
  offlineReady: boolean;
}

let state: PwaState = { needRefresh: false, offlineReady: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
export const usePwa = () => useSyncExternalStore(subscribe, () => state);

let reg: ServiceWorkerRegistration | null = null;

/** Hides the banner for this check; it comes back on the next load or visibility check. */
export const dismissUpdate = () => set({ needRefresh: false });
export const dismissOffline = () => set({ offlineReady: false });

export function applyUpdate() {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

function track(r: ServiceWorkerRegistration, hadController: boolean) {
  const watch = (w: ServiceWorker) => {
    w.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) set({ needRefresh: true });
      if (w.state === 'activated' && !hadController) set({ offlineReady: true });
    });
  };
  if (r.waiting && hadController) set({ needRefresh: true });
  if (r.installing) watch(r.installing);
  r.addEventListener('updatefound', () => r.installing && watch(r.installing));
}

export function registerSW() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((r) => {
      reg = r;
      track(r, hadController);
      const check = () => r.update().catch(() => {});
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      setInterval(check, 60 * 60 * 1000);
    })
    .catch(() => {
      /* the app works without the service worker */
    });
}
