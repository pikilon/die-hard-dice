// Regenerates the PWA raster icons from public/icons/source*.svg (outputs are committed; run `npm run pwa:icons`).
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const dir = new URL('../public/icons/', import.meta.url);
const BG = '#1c120b';
const any = await readFile(new URL('source.svg', dir));
const maskable = await readFile(new URL('source-maskable.svg', dir));

const png = (svg, size, { flat = false, scale = 1 } = {}) => {
  const inner = Math.round(size * scale);
  let img = sharp(svg, { density: 600 }).resize(inner, inner);
  if (inner !== size) {
    const pad = Math.floor((size - inner) / 2);
    img = img.extend({ top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  if (flat) img = img.flatten({ background: BG });
  return img.png().toBuffer();
};
const out = (name, buf) => writeFile(new URL(name, dir), buf);

await out('icon-192.png', await png(any, 192, { scale: 0.9 }));
await out('icon-512.png', await png(any, 512, { scale: 0.9 }));
await out('maskable-192.png', await png(maskable, 192));
await out('maskable-512.png', await png(maskable, 512));
await out('apple-touch-icon.png', await png(any, 180, { flat: true, scale: 0.8 }));
await out('favicon-32.png', await png(any, 32));
const ico = await pngToIco([await png(any, 16), await png(any, 32), await png(any, 48)]);
await out('favicon.ico', ico);
console.log('pwa icons written to public/icons/');
