import { mix } from '../model/color';
import { resolveFace } from '../model/faces';
import { solidFor } from '../model/solids';
import type { Die, ResolvedFace } from '../model/types';
import { getDieMesh, type AtlasLayout, type TileLabel } from './dieGeometry';
import { iconPath } from './icons';
import { applyPattern, getPattern } from './patterns';

export const FACE_FONT = '"Nunito Variable", "Nunito", system-ui, sans-serif';
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export interface AtlasCanvases {
  map: HTMLCanvasElement;
  bump: HTMLCanvasElement | null;
  /** true while some icon was still loading (caller may redraw later) */
  pending: boolean;
}

function tilePx(layout: AtlasLayout) {
  return Math.min(256, Math.floor(1100 / layout.cols));
}

const EMOJI_RE = /\p{Extended_Pictographic}/u;

/** Draws a face value centred at (cx, cy) with radius r (px). Returns false if an icon is not ready. */
export function drawValue(
  ctx: CanvasRenderingContext2D,
  face: ResolvedFace,
  cx: number,
  cy: number,
  r: number,
  opts: { underline?: boolean; color?: string } = {},
): boolean {
  const color = opts.color ?? face.fg;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  let ok = true;
  if ('i' in face.value) {
    const p = iconPath(face.value.i);
    const size = r * 1.72;
    if (p) {
      ctx.translate(-size / 2, -size / 2);
      ctx.scale(size / 512, size / 512);
      ctx.fill(p);
    } else {
      ok = false;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const text = face.value.t;
    const emoji = EMOJI_RE.test(text);
    const len = Array.from(text).length;
    let px = r * (len <= 1 ? 1.45 : len === 2 ? 1.2 : 0.95);
    ctx.font = `900 ${px}px ${emoji ? EMOJI_FONT : FACE_FONT}`;
    const maxW = r * 1.8;
    const w = ctx.measureText(text).width;
    if (w > maxW) {
      px *= maxW / w;
      ctx.font = `900 ${px}px ${emoji ? EMOJI_FONT : FACE_FONT}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, px * 0.05);
    if (opts.underline) {
      const uw = ctx.measureText(text).width * 0.8;
      ctx.lineWidth = Math.max(2, px * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-uw / 2, px * 0.5);
      ctx.lineTo(uw / 2, px * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
  return ok;
}

function polyPath(ctx: CanvasRenderingContext2D, poly: [number, number][], ox: number, oy: number, size: number, grow = 0) {
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    const gx = x + (x - cx) * grow;
    const gy = y + (y - cy) * grow;
    if (i === 0) ctx.moveTo(ox + gx * size, oy + gy * size);
    else ctx.lineTo(ox + gx * size, oy + gy * size);
  });
  ctx.closePath();
}

/**
 * Paints the atlas for a die given the mapping slot → logical face.
 * Glass dice get a translucent body (alpha) but opaque symbols.
 */
export function drawAtlas(die: Die, mapping: number[], withBump = true): AtlasCanvases {
  const solid = solidFor(die.faces);
  const { layout } = getDieMesh(solid);
  const T = tilePx(layout);
  const map = document.createElement('canvas');
  map.width = layout.cols * T;
  map.height = layout.rows * T;
  const ctx = map.getContext('2d')!;
  const glass = die.material === 'glass';
  const pattern = getPattern(die.material);
  const bump = withBump && !glass ? document.createElement('canvas') : null;
  const bctx = bump?.getContext('2d') ?? null;
  if (bump && bctx) {
    bump.width = Math.round(map.width / 2);
    bump.height = Math.round(map.height / 2);
    bctx.fillStyle = '#fff';
    bctx.fillRect(0, 0, bump.width, bump.height);
    bctx.scale(0.5, 0.5);
  }

  const faces = mapping.map((logical) => resolveFace(die, logical));
  const texts = new Set(faces.map((f) => ('t' in f.value ? f.value.t : '')));
  const needsUnderline = texts.has('6') && texts.has('9');
  const bodyAlpha = glass ? 0.55 : 1;
  const fill = (c: string) => (glass ? hexA(c, bodyAlpha) : c);

  const tileOrigin = (t: number) => [(t % layout.cols) * T, Math.floor(t / layout.cols) * T] as const;

  // body tile + background of every tile
  ctx.clearRect(0, 0, map.width, map.height);
  for (let t = 0; t < layout.tiles; t++) {
    const [ox, oy] = tileOrigin(t);
    ctx.fillStyle = fill(die.color);
    ctx.fillRect(ox, oy, T, T);
    applyPattern(ctx, pattern, ox, oy, T, T, 0.9);
  }

  let pending = false;
  const drawSym = (face: ResolvedFace, x: number, y: number, r: number, angle = 0) => {
    const underline = needsUnderline && 't' in face.value && (face.value.t === '6' || face.value.t === '9');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // soft engraved shadow
    ctx.globalAlpha = 0.35;
    drawValue(ctx, face, 0, r * 0.045, r, { underline, color: mix(face.bg, '#000000', 0.7) });
    ctx.globalAlpha = 1;
    if (!drawValue(ctx, face, 0, 0, r, { underline })) pending = true;
    ctx.restore();
    if (bctx) {
      bctx.save();
      bctx.translate(x, y);
      bctx.rotate(angle);
      bctx.filter = 'blur(1px)';
      drawValue(bctx, face, 0, 0, r, { underline, color: '#000' });
      bctx.restore();
    }
  };

  for (const label of layout.labels) drawTile(label);

  function drawTile(label: TileLabel) {
    const [ox, oy] = tileOrigin(label.tile);
    if (label.corners) {
      // d4: three regions per face, each coloured like the vertex it belongs to
      const n = label.poly.length;
      const cx = label.poly.reduce((a, p) => a + p[0], 0) / n;
      const cy = label.poly.reduce((a, p) => a + p[1], 0) / n;
      label.corners.forEach((c, k) => {
        const face = faces[c.slot];
        const prev = label.poly[(k + n - 1) % n];
        const cur = label.poly[k];
        const next = label.poly[(k + 1) % n];
        const region: [number, number][] = [
          [cx, cy],
          [(prev[0] + cur[0]) / 2, (prev[1] + cur[1]) / 2],
          cur,
          [(cur[0] + next[0]) / 2, (cur[1] + next[1]) / 2],
        ];
        if (face.bg.toLowerCase() !== die.color.toLowerCase()) {
          ctx.save();
          polyPath(ctx, region, ox, oy, T, 0.02);
          ctx.fillStyle = fill(face.bg);
          ctx.fill();
          ctx.clip();
          applyPattern(ctx, pattern, ox, oy, T, T, 0.9);
          ctx.restore();
        }
        drawSym(face, ox + c.x * T, oy + c.y * T, c.r * T, c.angle);
      });
      return;
    }
    const face = faces[label.slot];
    if (face.bg.toLowerCase() !== die.color.toLowerCase()) {
      ctx.save();
      polyPath(ctx, label.poly, ox, oy, T, 0.06);
      ctx.fillStyle = fill(face.bg);
      ctx.fill();
      ctx.clip();
      applyPattern(ctx, pattern, ox, oy, T, T, 0.9);
      ctx.restore();
    }
    drawSym(face, ox + label.cx * T, oy + label.cy * T, label.r * T * 0.92);
  }

  return { map, bump, pending };
}

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
