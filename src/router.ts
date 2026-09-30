import { useSyncExternalStore } from 'react';

/**
 * Hash routing where the query string also lives inside the hash (`#/import?d=…`), so the
 * static host never sees it and any sub-path works (GitHub Pages).
 */
let listeners: (() => void)[] = [];
const onChange = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  if (listeners.push(cb) === 1) window.addEventListener('hashchange', onChange);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    if (!listeners.length) window.removeEventListener('hashchange', onChange);
  };
}

const raw = () => location.hash.replace(/^#?\/?/, '/');
const currentPath = () => raw().split('?')[0];
const currentSearch = () => {
  const h = raw();
  const i = h.indexOf('?');
  return i >= 0 ? h.slice(i + 1) : '';
};

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const oldURL = location.href;
  const url = new URL(oldURL);
  url.hash = `/${to.replace(/^#?\/?/, '')}`;
  history[opts.replace ? 'replaceState' : 'pushState'](null, '', url.href);
  window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: url.href }));
  window.scrollTo({ top: 0 });
}

export const useHashLocation = (): [string, typeof navigate] => [useSyncExternalStore(subscribe, currentPath, () => '/'), navigate];
useHashLocation.hrefs = (href: string) => `#${href}`;

export const useHashSearch = () => useSyncExternalStore(subscribe, currentSearch, () => '');
