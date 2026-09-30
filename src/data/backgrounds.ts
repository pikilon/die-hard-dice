import type { Background } from '../model/types';

/**
 * Preset table backgrounds, generated as SVG so they weigh nothing and scale to any screen.
 * They are shown as a CSS background behind a transparent WebGL canvas (the table only draws
 * shadows), which also lets custom image URLs work without CORS.
 */
export interface BackgroundPreset {
  id: string;
  names: { es: string; en: string };
  /** Solid color shown while the image loads and used for UI accents. */
  base: string;
  svg: () => string;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1600;
const H = 1000;
const svg = (body: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;

const vignette = (id: string, strength = 0.55) =>
  `<radialGradient id="${id}" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${strength}"/></radialGradient>`;

const noise = (id: string, freq: number, octaves: number, opacity: number, seed = 3) =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${opacity} 0"/></filter>`;

function felt(): string {
  return svg(
    `<rect width="${W}" height="${H}" fill="url(#g)"/>
     <rect width="${W}" height="${H}" filter="url(#n)"/>
     <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="36" fill="none" stroke="#c9a54a" stroke-opacity=".35" stroke-width="3" stroke-dasharray="14 10"/>
     <rect width="${W}" height="${H}" fill="url(#v)"/>`,
    `<radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#2f8f4e"/><stop offset="1" stop-color="#145a2c"/></radialGradient>
     ${noise('n', 0.9, 2, 0.35)}${vignette('v')}`,
  );
}

function casino(): string {
  const r = rng(7);
  let diamonds = '';
  for (let y = -60; y < H + 60; y += 120)
    for (let x = (y / 120) % 2 ? 60 : 0; x < W + 60; x += 120)
      diamonds += `<path d="M${x} ${y - 22}l16 22-16 22-16-22z" fill="#f2c14e" fill-opacity="${0.05 + r() * 0.05}"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="url(#g)"/>${diamonds}
     <rect width="${W}" height="${H}" filter="url(#n)"/>
     <ellipse cx="${W / 2}" cy="${H / 2}" rx="560" ry="330" fill="none" stroke="#f2c14e" stroke-opacity=".28" stroke-width="4"/>
     <ellipse cx="${W / 2}" cy="${H / 2}" rx="540" ry="310" fill="none" stroke="#f2c14e" stroke-opacity=".18" stroke-width="2"/>
     <rect width="${W}" height="${H}" fill="url(#v)"/>`,
    `<radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#9b1c2c"/><stop offset="1" stop-color="#4a0b14"/></radialGradient>
     ${noise('n', 0.85, 2, 0.3)}${vignette('v', 0.6)}`,
  );
}

function tavern(): string {
  const r = rng(11);
  let planks = '';
  const ph = 125;
  for (let y = 0; y < H; y += ph) {
    let x = -r() * 400;
    while (x < W) {
      const len = 380 + r() * 520;
      const tone = ['#6b3f22', '#7a4a28', '#5e361c', '#835230', '#704325'][Math.floor(r() * 5)];
      planks += `<rect x="${x}" y="${y}" width="${len}" height="${ph}" fill="${tone}"/>`;
      planks += `<rect x="${x}" y="${y}" width="${len}" height="${ph}" fill="url(#grain)" opacity="${0.5 + r() * 0.4}"/>`;
      planks += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + ph}" stroke="#2a160a" stroke-width="4"/>`;
      planks += `<circle cx="${x + 18}" cy="${y + 20}" r="4" fill="#2a160a" opacity=".7"/><circle cx="${x + 18}" cy="${y + ph - 20}" r="4" fill="#2a160a" opacity=".7"/>`;
      if (r() < 0.25) planks += `<ellipse cx="${x + len * r()}" cy="${y + ph * (0.3 + r() * 0.4)}" rx="${14 + r() * 16}" ry="${6 + r() * 6}" fill="#3b1f0e" opacity=".5"/>`;
      x += len;
    }
    planks += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#241208" stroke-width="5"/>`;
  }
  return svg(
    `${planks}<rect width="${W}" height="${H}" fill="url(#warm)"/><rect width="${W}" height="${H}" fill="url(#v)"/>`,
    `<filter id="gf"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.12" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .16  0 0 0 0 .08  0 0 0 0 .03  0 0 0 .55 0"/></filter>
     <pattern id="grain" width="${W}" height="${ph}" patternUnits="userSpaceOnUse"><rect width="${W}" height="${ph}" filter="url(#gf)"/></pattern>
     <radialGradient id="warm" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffb347" stop-opacity=".18"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
     ${vignette('v', 0.7)}`,
  );
}

function dungeon(): string {
  const r = rng(23);
  let stones = '';
  const size = 150;
  for (let y = -20; y < H + size; y += size * 0.9) {
    const off = r() * size;
    for (let x = -off; x < W + size; x += size) {
      const w = size * (0.8 + r() * 0.45);
      const h = size * (0.7 + r() * 0.3);
      const c = 38 + Math.floor(r() * 26);
      const j = () => (r() - 0.5) * 14;
      stones += `<path d="M${x + j()} ${y + j()}L${x + w + j()} ${y + j()}L${x + w + j()} ${y + h + j()}L${x + j()} ${y + h + j()}Z" fill="rgb(${c},${c + 2},${c + 6})" stroke="#0d0d10" stroke-width="7" stroke-linejoin="round"/>`;
      if (r() < 0.18) stones += `<circle cx="${x + w * r()}" cy="${y + h * r()}" r="${10 + r() * 22}" fill="#3f5f2a" opacity=".35" filter="url(#blur)"/>`;
      if (r() < 0.12) stones += `<path d="M${x + w * 0.2} ${y + h * 0.3}l${w * 0.3} ${h * 0.2}l${w * 0.1} ${h * 0.3}" stroke="#0d0d10" stroke-width="3" fill="none" opacity=".7"/>`;
    }
  }
  return svg(
    `<rect width="${W}" height="${H}" fill="#101014"/>${stones}
     <rect width="${W}" height="${H}" filter="url(#n)"/>
     <rect width="${W}" height="${H}" fill="url(#torch)"/>
     <rect width="${W}" height="${H}" fill="url(#v)"/>`,
    `${noise('n', 0.7, 3, 0.4, 9)}<filter id="blur"><feGaussianBlur stdDeviation="8"/></filter>
     <radialGradient id="torch" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".22"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
     ${vignette('v', 0.85)}`,
  );
}

function city(): string {
  const r = rng(42);
  let blocks = '';
  const street = 34;
  const cols = [0, 210, 470, 690, 960, 1180, 1420, W];
  const rows = [0, 190, 400, 640, 830, H];
  for (let ci = 0; ci < cols.length - 1; ci++)
    for (let ri = 0; ri < rows.length - 1; ri++) {
      const x0 = cols[ci] + street / 2;
      const y0 = rows[ri] + street / 2;
      const bw = cols[ci + 1] - cols[ci] - street;
      const bh = rows[ri + 1] - rows[ri] - street;
      blocks += `<rect x="${x0}" y="${y0}" width="${bw}" height="${bh}" fill="#1b1f33"/>`;
      if (ci === 3 && ri === 2) {
        blocks += `<rect x="${x0}" y="${y0}" width="${bw}" height="${bh}" fill="#16361f"/>`;
        for (let k = 0; k < 14; k++) blocks += `<circle cx="${x0 + r() * bw}" cy="${y0 + r() * bh}" r="${8 + r() * 14}" fill="#1f4d2b"/>`;
        continue;
      }
      // rooftops
      let bx = x0 + 6;
      while (bx < x0 + bw - 20) {
        const w = Math.min(30 + r() * 70, x0 + bw - 6 - bx);
        let by = y0 + 6;
        while (by < y0 + bh - 20) {
          const h = Math.min(30 + r() * 70, y0 + bh - 6 - by);
          const t = 34 + Math.floor(r() * 40);
          blocks += `<rect x="${bx}" y="${by}" width="${w - 6}" height="${h - 6}" rx="2" fill="rgb(${t},${t + 4},${t + 20})"/>`;
          if (r() < 0.55) {
            const lit = ['#ffd166', '#ffe8a3', '#8ecae6', '#ff9f68'][Math.floor(r() * 4)];
            const n = 1 + Math.floor(r() * 4);
            for (let k = 0; k < n; k++)
              blocks += `<rect x="${bx + 4 + r() * (w - 16)}" y="${by + 4 + r() * (h - 16)}" width="5" height="5" fill="${lit}" opacity="${0.6 + r() * 0.4}"/>`;
          }
          if (r() < 0.08) blocks += `<circle cx="${bx + w / 2 - 3}" cy="${by + h / 2 - 3}" r="${Math.min(w, h) / 4}" fill="none" stroke="#ff4d6d" stroke-width="2" opacity=".6"/>`;
          by += h;
        }
        bx += w;
      }
    }
  let lamps = '';
  for (const x of cols) for (let y = 20; y < H; y += 70) lamps += `<circle cx="${x}" cy="${y}" r="3" fill="#ffd166" opacity=".8"/>`;
  for (const y of rows) for (let x = 30; x < W; x += 70) lamps += `<circle cx="${x}" cy="${y}" r="3" fill="#ffd166" opacity=".8"/>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="#0b0d17"/>
     <path d="M-40 ${H * 0.78} C 300 ${H * 0.7}, 700 ${H * 0.98}, 1000 ${H * 0.86} S 1500 ${H * 0.7}, ${W + 40} ${H * 0.8}" stroke="#123a5c" stroke-width="70" fill="none" opacity=".9"/>
     ${blocks}${lamps}
     <rect width="${W}" height="${H}" fill="url(#glow)"/>
     <rect width="${W}" height="${H}" fill="url(#v)"/>`,
    `<radialGradient id="glow" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#ff4d6d" stop-opacity=".12"/><stop offset="1" stop-color="#7209b7" stop-opacity=".18"/></radialGradient>${vignette('v', 0.75)}`,
  );
}

function parchment(): string {
  const r = rng(5);
  let lines = '';
  for (let k = 0; k < 9; k++) {
    const y = 80 + r() * (H - 160);
    lines += `<path d="M${-20} ${y} C ${W * 0.3} ${y + (r() - 0.5) * 200}, ${W * 0.6} ${y + (r() - 0.5) * 200}, ${W + 20} ${y + (r() - 0.5) * 120}" stroke="#7a5230" stroke-width="${1 + r() * 2}" fill="none" opacity=".25" stroke-dasharray="${r() < 0.5 ? '10 8' : '0'}"/>`;
  }
  let stains = '';
  for (let k = 0; k < 7; k++)
    stains += `<circle cx="${r() * W}" cy="${r() * H}" r="${40 + r() * 120}" fill="#8b5a2b" opacity="${0.05 + r() * 0.07}" filter="url(#blur)"/>`;
  const cx = W * 0.82;
  const cy = H * 0.22;
  const rose = `<g transform="translate(${cx} ${cy})" opacity=".45" stroke="#5a3a1c" fill="none">
     <circle r="90" stroke-width="2"/><circle r="70" stroke-width="1"/>
     <path d="M0-110L14 0L0 110L-14 0Z" fill="#5a3a1c" fill-opacity=".5"/><path d="M-110 0L0 14L110 0L0-14Z" fill="#5a3a1c" fill-opacity=".3"/>
     <text y="-118" text-anchor="middle" font-family="serif" font-size="26" fill="#5a3a1c" stroke="none">N</text></g>`;
  return svg(
    `<rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" filter="url(#n)"/>${stains}${lines}${rose}
     <rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#6b4423" stroke-opacity=".35" stroke-width="3"/>
     <rect x="44" y="44" width="${W - 88}" height="${H - 88}" fill="none" stroke="#6b4423" stroke-opacity=".25" stroke-width="1"/>
     <rect width="${W}" height="${H}" fill="url(#v)"/>`,
    `<radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#f1dfb5"/><stop offset="1" stop-color="#cfae78"/></radialGradient>
     ${noise('n', 0.6, 4, 0.28, 12)}<filter id="blur"><feGaussianBlur stdDeviation="20"/></filter>${vignette('v', 0.5)}`,
  );
}

function arcane(): string {
  const r = rng(99);
  let stars = '';
  for (let k = 0; k < 220; k++)
    stars += `<circle cx="${r() * W}" cy="${r() * H}" r="${r() * 1.8 + 0.3}" fill="#fff" opacity="${0.3 + r() * 0.7}"/>`;
  const ring = (rad: number, n: number) => {
    let s = `<circle r="${rad}" fill="none" stroke="#b197fc" stroke-opacity=".35" stroke-width="2"/>`;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      s += `<circle cx="${Math.cos(a) * rad}" cy="${Math.sin(a) * rad}" r="5" fill="#d0bfff" opacity=".5"/>`;
    }
    return s;
  };
  return svg(
    `<rect width="${W}" height="${H}" fill="url(#g)"/>${stars}
     <g transform="translate(${W / 2} ${H / 2})">${ring(420, 12)}${ring(340, 7)}
     <path d="M0-340L294 170L-294 170Z M0 340L294-170L-294-170Z" fill="none" stroke="#b197fc" stroke-opacity=".22" stroke-width="2"/></g>
     <rect width="${W}" height="${H}" fill="url(#v)"/>`,
    `<radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#2b1b5a"/><stop offset="1" stop-color="#0c0820"/></radialGradient>${vignette('v', 0.6)}`,
  );
}

export const BACKGROUNDS: BackgroundPreset[] = [
  { id: 'felt', names: { es: 'Tapete verde', en: 'Green felt' }, base: '#1f6e3a', svg: felt },
  { id: 'tavern', names: { es: 'Taberna', en: 'Tavern' }, base: '#6b3f22', svg: tavern },
  { id: 'dungeon', names: { es: 'Mazmorra', en: 'Dungeon' }, base: '#26272c', svg: dungeon },
  { id: 'city', names: { es: 'Ciudad nocturna', en: 'Night city' }, base: '#141830', svg: city },
  { id: 'parchment', names: { es: 'Pergamino', en: 'Parchment' }, base: '#dcc28e', svg: parchment },
  { id: 'casino', names: { es: 'Casino', en: 'Casino' }, base: '#7a1422', svg: casino },
  { id: 'arcane', names: { es: 'Arcano', en: 'Arcane' }, base: '#1d1340', svg: arcane },
];

const cache = new Map<string, string>();

export function presetUrl(id: string): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const p = BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.svg())}`;
  cache.set(id, url);
  return url;
}

export function backgroundUrl(bg: Background): string {
  if (bg.kind === 'preset') return presetUrl(bg.id);
  if (bg.kind === 'url') return bg.url;
  return bg.dataUrl;
}

export function backgroundBase(bg: Background): string {
  if (bg.kind === 'preset') return (BACKGROUNDS.find((b) => b.id === bg.id) ?? BACKGROUNDS[0]).base;
  return '#1a1a1a';
}
