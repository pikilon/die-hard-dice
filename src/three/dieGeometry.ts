import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { SolidId } from '../model/types';
import { getSolid, type SolidDef } from './solids';

/**
 * Builds a render mesh with rounded (chamfered) edges for a solid, plus the atlas layout:
 * one square tile per labelled face and a final "body" tile for rims/bevels.
 *
 * Chamfer: every face is shrunk towards its centre; the gaps become edge strips and corner
 * polygons. Their vertices reuse the normals of the faces they come from, so the shading
 * interpolates smoothly across edges and they look rounded without extra triangles.
 */
export interface AtlasLayout {
  cols: number;
  rows: number;
  tiles: number; // labelled tiles + 1 body tile
  bodyTile: number;
  /** Per labelled tile: label placement in tile-normalised coords (0..1, y down). */
  labels: TileLabel[];
}

export interface TileLabel {
  tile: number;
  slot: number; // -1 for d4 (see corners)
  /** Polygon of the face in tile coords, used to clip/draw face color. */
  poly: [number, number][];
  cx: number;
  cy: number;
  /** Radius available for the label (tile-normalised). */
  r: number;
  /** d4: one label per corner. angle = rotation of the text so it points at the corner. */
  corners?: { slot: number; x: number; y: number; angle: number; r: number }[];
}

export interface DieMeshData {
  solid: SolidDef;
  geometry: BufferGeometry;
  layout: AtlasLayout;
  /** Points for the physics convex hull (the chamfered shape). */
  hull: Float32Array;
}

const BEVEL: Record<SolidId, number> = { d2: 0.035, d4: 0.075, d6: 0.1, d8: 0.075, d10: 0.07, d12: 0.07, d20: 0.06 };
const PAD = 0.05;

function tileRect(layout: { cols: number }, tile: number) {
  const col = tile % layout.cols;
  const row = Math.floor(tile / layout.cols);
  return { col, row };
}

/** Area centroid and inradius (min distance to edges) of a 2D polygon. */
function polyInfo(p: [number, number][]) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    const cr = x0 * y1 - x1 * y0;
    a += cr;
    cx += (x0 + x1) * cr;
    cy += (y0 + y1) * cr;
  }
  a /= 2;
  cx /= 6 * a;
  cy /= 6 * a;
  let r = Infinity;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    const ex = x1 - x0;
    const ey = y1 - y0;
    const len = Math.hypot(ex, ey);
    const d = Math.abs((cx - x0) * ey - (cy - y0) * ex) / len;
    r = Math.min(r, d);
  }
  return { cx, cy, r };
}

const meshCache = new Map<SolidId, DieMeshData>();

export function getDieMesh(id: SolidId): DieMeshData {
  const hit = meshCache.get(id);
  if (hit) return hit;
  const solid = getSolid(id);
  const { vertices, faces, normals, centers, slotOfFace, ups } = solid;

  const labelledFaces = faces.map((_, f) => f).filter((f) => id === 'd4' || slotOfFace[f] >= 0);
  const tiles = labelledFaces.length + 1;
  const cols = Math.ceil(Math.sqrt(tiles));
  const rows = Math.ceil(tiles / cols);
  const bodyTile = tiles - 1;
  const tileOfFace = new Map<number, number>();
  labelledFaces.forEach((f, t) => tileOfFace.set(f, t));

  // inset copies: key `${face}:${vertex}` → position
  const inset = new Map<string, Vector3>();
  faces.forEach((face, f) => {
    const c = centers[f];
    let minEdge = Infinity;
    for (let i = 0; i < face.length; i++) minEdge = Math.min(minEdge, vertices[face[i]].distanceTo(vertices[face[(i + 1) % face.length]]));
    for (const vi of face) {
      const v = vertices[vi];
      const dist = v.distanceTo(c);
      const bevel = Math.min(BEVEL[id], minEdge * 0.3);
      const s = Math.max(0.4, 1 - bevel / dist);
      inset.set(`${f}:${vi}`, c.clone().add(v.clone().sub(c).multiplyScalar(s)));
    }
  });

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];

  const toUv = (tile: number, x: number, y: number): [number, number] => {
    const { col, row } = tileRect({ cols }, tile);
    // x,y in tile space (0..1, y down) → atlas UV (y up)
    return [(col + x) / cols, 1 - (row + y) / rows];
  };
  const bodyUv = toUv(bodyTile, 0.5, 0.5);

  const pushTri = (p: Vector3[], n: Vector3[], t: [number, number][]) => {
    for (let i = 0; i < 3; i++) {
      pos.push(p[i].x, p[i].y, p[i].z);
      nor.push(n[i].x, n[i].y, n[i].z);
      uv.push(t[i][0], t[i][1]);
    }
  };
  const pushPoly = (p: Vector3[], n: Vector3[], t: [number, number][]) => {
    for (let i = 1; i < p.length - 1; i++) pushTri([p[0], p[i], p[i + 1]], [n[0], n[i], n[i + 1]], [t[0], t[i], t[i + 1]]);
  };

  const labels: TileLabel[] = [];

  // 1) faces
  faces.forEach((face, f) => {
    const pts = face.map((vi) => inset.get(`${f}:${vi}`)!);
    const n = normals[f];
    const tile = tileOfFace.get(f);
    if (tile === undefined) {
      pushPoly(pts, pts.map(() => n), pts.map(() => bodyUv));
      return;
    }
    // local 2D frame: up = ups[f], right = up × normal
    const up = ups[f];
    const right = new Vector3().crossVectors(up, n).normalize();
    const c = centers[f];
    const p2 = pts.map((p) => {
      const d = p.clone().sub(c);
      return [d.dot(right), d.dot(up)] as [number, number];
    });
    const info = polyInfo(p2);
    // d4 labels are near the corners: centre the tile on the face centroid instead
    const ox = id === 'd4' ? 0 : info.cx;
    const oy = id === 'd4' ? 0 : info.cy;
    let maxR = 0;
    for (const [x, y] of p2) maxR = Math.max(maxR, Math.hypot(x - ox, y - oy));
    const s = (0.5 - PAD) / maxR;
    const tileXY = (x: number, y: number): [number, number] => [0.5 + (x - ox) * s, 0.5 - (y - oy) * s];
    const tuv = p2.map(([x, y]) => toUv(tile, ...tileXY(x, y)));
    pushPoly(pts, pts.map(() => n), tuv);

    const poly = p2.map(([x, y]) => tileXY(x, y));
    const label: TileLabel = { tile, slot: slotOfFace[f], poly, cx: 0.5 + (info.cx - ox) * s, cy: 0.5 - (info.cy - oy) * s, r: info.r * s };
    if (id === 'd4') {
      label.corners = face.map((vi, k) => {
        const [x, y] = poly[k];
        const dx = x - 0.5;
        const dy = y - 0.5;
        // place label 55% of the way from centre to corner, text "up" pointing at the corner
        return { slot: solid.vertexSlots![vi], x: 0.5 + dx * 0.56, y: 0.5 + dy * 0.56, angle: Math.atan2(dx, -dy), r: info.r * s * 0.62 };
      });
    }
    labels.push(label);
  });

  // 2) edge strips: for each directed edge a→b of face f, find the face g that has b→a
  const edgeOwner = new Map<string, number>();
  faces.forEach((face, f) => {
    for (let i = 0; i < face.length; i++) edgeOwner.set(`${face[i]}>${face[(i + 1) % face.length]}`, f);
  });
  faces.forEach((face, f) => {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      if (a > b) continue; // each undirected edge once
      const g = edgeOwner.get(`${b}>${a}`);
      if (g === undefined) continue;
      const p = [inset.get(`${f}:${b}`)!, inset.get(`${f}:${a}`)!, inset.get(`${g}:${a}`)!, inset.get(`${g}:${b}`)!];
      const n = [normals[f], normals[f], normals[g], normals[g]];
      pushPoly(p, n, p.map(() => bodyUv));
    }
  });

  // 3) corner polygons: all inset copies of a vertex, ordered around it
  vertices.forEach((v, vi) => {
    const around = faces.map((face, f) => (face.includes(vi) ? f : -1)).filter((f) => f >= 0);
    if (around.length < 3) return;
    const dir = v.clone().normalize();
    const u = new Vector3().subVectors(inset.get(`${around[0]}:${vi}`)!, v);
    u.sub(dir.clone().multiplyScalar(u.dot(dir))).normalize();
    const w = new Vector3().crossVectors(dir, u);
    const ordered = around
      .map((f) => {
        const d = inset.get(`${f}:${vi}`)!.clone().sub(v);
        return { f, a: Math.atan2(d.dot(w), d.dot(u)) };
      })
      .sort((a, b) => a.a - b.a)
      .map((x) => x.f);
    const p = ordered.map((f) => inset.get(`${f}:${vi}`)!);
    const n = ordered.map((f) => normals[f]);
    pushPoly(p, n, p.map(() => bodyUv));
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.computeBoundingSphere();

  const hullPts: number[] = [];
  for (const p of inset.values()) hullPts.push(p.x, p.y, p.z);

  const data: DieMeshData = {
    solid,
    geometry,
    layout: { cols, rows, tiles, bodyTile, labels },
    hull: new Float32Array(hullPts),
  };
  meshCache.set(id, data);
  return data;
}
