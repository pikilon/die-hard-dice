/** Safe CSS url() for arbitrary (user supplied) image URLs. */
export function cssUrl(u: string) {
  return `url("${u.replace(/["\\\n]/g, (c) => encodeURIComponent(c))}")`;
}
