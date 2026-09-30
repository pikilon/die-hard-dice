const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export function newId(size = 10): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < size; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}

/** Uniform random integer in [0, n). Uses crypto for fair dice. */
export type Rng = (n: number) => number;

export const cryptoRng: Rng = (n) => {
  if (n <= 1) return 0;
  // rejection sampling to avoid modulo bias
  const max = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < max) return buf[0] % n;
  }
};
