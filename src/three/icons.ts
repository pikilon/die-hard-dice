import core from '../icons/core.json';

/**
 * game-icons.net paths (CC BY 3.0, by Lorc, Delapouite & contributors).
 * A curated subset is bundled; the complete set (~4000 icons) is fetched lazily.
 */
type IconMap = Record<string, string>;

const corePaths = (core as { paths: IconMap }).paths;
export const CORE_CATEGORIES = (core as { categories: Record<string, string[]> }).categories;

let full: IconMap | null = null;
let loading: Promise<IconMap> | null = null;
const listeners = new Set<() => void>();
const path2d = new Map<string, Path2D>();

export function iconsVersion() {
  return full ? 1 : 0;
}

export function onIconsLoaded(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function loadAllIcons(): Promise<IconMap> {
  if (full) return Promise.resolve(full);
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}game-icons.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`icons ${r.status}`);
        return r.json() as Promise<IconMap>;
      })
      .then((data) => {
        full = data;
        listeners.forEach((l) => l());
        return data;
      })
      .catch((e) => {
        loading = null;
        throw e;
      });
  }
  return loading;
}

export function iconPathData(name: string): string | null {
  return corePaths[name] ?? full?.[name] ?? null;
}

/** Path2D for an icon on a 512×512 box, or null while it is being fetched. */
export function iconPath(name: string): Path2D | null {
  const hit = path2d.get(name);
  if (hit) return hit;
  const d = iconPathData(name);
  if (!d) {
    if (!full) loadAllIcons().catch(() => undefined);
    return null;
  }
  if (typeof Path2D === 'undefined') return null;
  const p = new Path2D(d);
  path2d.set(name, p);
  return p;
}

export function allIconNames(): string[] {
  return full ? Object.keys(full) : Object.keys(corePaths);
}

export function isKnownIcon(name: string): boolean {
  return !!iconPathData(name);
}
