/** Returns `base`, or `base (2)`, `base (3)`… so that it does not clash with `taken`. */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const set = new Set(Array.from(taken, (s) => s.trim().toLowerCase()));
  if (!set.has(base.trim().toLowerCase())) return base;
  const root = base.replace(/\s*\(\d+\)$/, '');
  for (let i = 2; ; i++) {
    const cand = `${root} (${i})`;
    if (!set.has(cand.toLowerCase())) return cand;
  }
}
