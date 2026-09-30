import { Vector3 } from 'three';
import type { SolidId } from '../model/types';

/**
 * Pure geometry of the physical dice. Every solid is described only by its vertices; faces are
 * found with a brute-force convex hull (fine for ≤ 64 points, computed once and cached).
 *
 * Conventions:
 *  - y is up.
 *  - `faces[f]` lists vertex indices counter-clockwise seen from outside.
 *  - `slotOfFace[f]` = value slot shown on physical face f (-1 = unlabelled, e.g. coin rim).
 *    Opposite faces get slots k and M-1-k so a regular die's opposite faces sum to N+1.
 *  - d4 is read by its top vertex: slots are vertices (`vertexSlots`).
 */
export interface SolidDef {
  id: SolidId;
  slots: number;
  vertices: Vector3[];
  faces: number[][];
  normals: Vector3[];
  centers: Vector3[];
  slotOfFace: number[];
  /** d4 only: slot per vertex. */
  vertexSlots?: number[];
  /** Face "up" direction (unit vector in the face plane) used to orient labels. */
  ups: Vector3[];
}

const PHI = (1 + Math.sqrt(5)) / 2;

/** Target circumradius per solid (world units), tuned so dice look balanced side by side. */
const RADIUS: Record<SolidId, number> = { d2: 0.95, d4: 1.2, d6: 0.93, d8: 1.02, d10: 1.0, d12: 0.98, d20: 1.02 };

function rawVertices(id: SolidId): Vector3[] {
  const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
  switch (id) {
    case 'd2': {
      const out: Vector3[] = [];
      const n = 36;
      const h = 0.11; // half thickness relative to radius 1
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        out.push(v(Math.cos(a), h, Math.sin(a)), v(Math.cos(a), -h, Math.sin(a)));
      }
      return out;
    }
    case 'd4':
      return [v(1, 1, 1), v(1, -1, -1), v(-1, 1, -1), v(-1, -1, 1)];
    case 'd6': {
      const out: Vector3[] = [];
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) out.push(v(x, y, z));
      return out;
    }
    case 'd8':
      return [v(1, 0, 0), v(-1, 0, 0), v(0, 1, 0), v(0, -1, 0), v(0, 0, 1), v(0, 0, -1)];
    case 'd10': {
      const c = Math.cos(Math.PI / 5);
      const h = (1 - c) / (1 + c); // makes every kite planar
      const out: Vector3[] = [v(0, 1, 0), v(0, -1, 0)];
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        out.push(v(Math.cos(a), i % 2 ? h : -h, Math.sin(a)));
      }
      return out;
    }
    case 'd12': {
      const out: Vector3[] = [];
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) out.push(v(x, y, z));
      for (const a of [-1, 1])
        for (const b of [-1, 1]) {
          out.push(v(0, a / PHI, b * PHI), v(a / PHI, b * PHI, 0), v(a * PHI, 0, b / PHI));
        }
      return out;
    }
    case 'd20': {
      const out: Vector3[] = [];
      for (const a of [-1, 1])
        for (const b of [-1, 1]) out.push(v(0, a, b * PHI), v(a, b * PHI, 0), v(b * PHI, 0, a));
      return out;
    }
  }
}

/** Faces of the convex hull of `pts` (coplanar points merged into one polygon, CCW from outside). */
export function hullFaces(pts: Vector3[], eps = 1e-6): { faces: number[][]; normals: Vector3[] } {
  const seen = new Set<string>();
  const faces: number[][] = [];
  const normals: Vector3[] = [];
  const ab = new Vector3();
  const ac = new Vector3();
  const n = pts.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        ab.subVectors(pts[j], pts[i]);
        ac.subVectors(pts[k], pts[i]);
        const normal = new Vector3().crossVectors(ab, ac);
        if (normal.lengthSq() < 1e-12) continue;
        normal.normalize();
        const d = normal.dot(pts[i]);
        let pos = false;
        let neg = false;
        const on: number[] = [];
        for (let m = 0; m < n; m++) {
          const s = normal.dot(pts[m]) - d;
          if (s > eps) pos = true;
          else if (s < -eps) neg = true;
          else on.push(m);
          if (pos && neg) break;
        }
        if (pos && neg) continue;
        if (pos) normal.negate();
        const key = on.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        faces.push(orderPolygon(pts, on, normal));
        normals.push(normal);
      }
  return { faces, normals };
}

function orderPolygon(pts: Vector3[], idx: number[], normal: Vector3): number[] {
  const c = new Vector3();
  for (const i of idx) c.add(pts[i]);
  c.divideScalar(idx.length);
  const u = new Vector3().subVectors(pts[idx[0]], c).normalize();
  const w = new Vector3().crossVectors(normal, u);
  const tmp = new Vector3();
  return idx
    .map((i) => {
      tmp.subVectors(pts[i], c);
      return { i, a: Math.atan2(tmp.dot(w), tmp.dot(u)) };
    })
    .sort((a, b) => a.a - b.a)
    .map((x) => x.i);
}

function centroid(pts: Vector3[], face: number[]): Vector3 {
  const c = new Vector3();
  for (const i of face) c.add(pts[i]);
  return c.divideScalar(face.length);
}

/** Pairs opposite faces and assigns slots k / M-1-k, walking faces in a pleasant order. */
function assignSlots(labelled: number[], normals: Vector3[], centers: Vector3[]): number[] {
  const slotOfFace = normals.map(() => -1);
  const m = labelled.length;
  const remaining = new Set(labelled);
  // order: faces with higher y first, then by angle around y → numbers "walk" around the die
  const order = labelled.slice().sort((a, b) => {
    const dy = centers[b].y - centers[a].y;
    if (Math.abs(dy) > 1e-3) return dy;
    return Math.atan2(centers[a].z, centers[a].x) - Math.atan2(centers[b].z, centers[b].x);
  });
  let k = 0;
  for (const f of order) {
    if (!remaining.has(f)) continue;
    remaining.delete(f);
    let opp = -1;
    let best = 0.999;
    for (const g of remaining) {
      const d = -normals[f].dot(normals[g]);
      if (d > best) {
        best = d;
        opp = g;
      }
    }
    slotOfFace[f] = k;
    if (opp >= 0) {
      remaining.delete(opp);
      slotOfFace[opp] = m - 1 - k;
    }
    k++;
  }
  // non-centrally-symmetric leftovers (none for our solids, kept for safety)
  let next = 0;
  const used = new Set(slotOfFace.filter((s) => s >= 0));
  for (const f of labelled)
    if (slotOfFace[f] < 0) {
      while (used.has(next)) next++;
      slotOfFace[f] = next;
      used.add(next);
    }
  return slotOfFace;
}

function faceUp(id: SolidId, verts: Vector3[], face: number[], normal: Vector3, center: Vector3): Vector3 {
  const proj = (v: Vector3) => {
    const d = new Vector3().subVectors(v, center);
    return d.sub(normal.clone().multiplyScalar(d.dot(normal))).normalize();
  };
  if (id === 'd6') {
    // towards the middle of the first edge → upright numbers on squares
    return proj(new Vector3().addVectors(verts[face[0]], verts[face[1]]).multiplyScalar(0.5));
  }
  if (id === 'd10') {
    // towards the pole vertex (|y| = 1) of the kite
    const pole = face.find((i) => Math.abs(verts[i].y) > 0.99 * verts[0].y) ?? face[0];
    return proj(verts[pole]);
  }
  if (id === 'd2') {
    const up = new Vector3(0, 0, -1);
    return up.sub(normal.clone().multiplyScalar(up.dot(normal))).normalize();
  }
  return proj(verts[face[0]]);
}

const cache = new Map<SolidId, SolidDef>();

export function getSolid(id: SolidId): SolidDef {
  const hit = cache.get(id);
  if (hit) return hit;
  const raw = rawVertices(id);
  let maxR = 0;
  for (const v of raw) maxR = Math.max(maxR, v.length());
  const scale = RADIUS[id] / maxR;
  const vertices = raw.map((v) => v.clone().multiplyScalar(scale));
  const { faces, normals } = hullFaces(vertices);
  const centers = faces.map((f) => centroid(vertices, f));

  let labelled: number[];
  let slots: number;
  if (id === 'd2') {
    labelled = normals.map((n, i) => (Math.abs(n.y) > 0.99 ? i : -1)).filter((i) => i >= 0);
    labelled.sort((a, b) => normals[b].y - normals[a].y); // top first
    slots = 2;
  } else {
    labelled = faces.map((_, i) => i);
    slots = id === 'd4' ? 4 : faces.length;
  }

  let slotOfFace: number[];
  let vertexSlots: number[] | undefined;
  if (id === 'd4') {
    slotOfFace = faces.map(() => -1);
    vertexSlots = vertices.map((_, i) => i);
  } else if (id === 'd2') {
    slotOfFace = faces.map(() => -1);
    slotOfFace[labelled[0]] = 0;
    slotOfFace[labelled[1]] = 1;
  } else {
    slotOfFace = assignSlots(labelled, normals, centers);
  }

  const ups = faces.map((f, i) => faceUp(id, vertices, f, normals[i], centers[i]));
  const def: SolidDef = { id, slots, vertices, faces, normals, centers, slotOfFace, vertexSlots, ups };
  cache.set(id, def);
  return def;
}

/** Which slot is facing up for a die with the given orientation (quaternion applied to local dirs). */
export function topSlot(def: SolidDef, toWorld: (v: Vector3) => Vector3): { slot: number; alignment: number } {
  if (def.vertexSlots) {
    let best = -Infinity;
    let slot = 0;
    const r = def.vertices[0].length();
    def.vertices.forEach((v, i) => {
      const y = toWorld(v.clone()).y / r;
      if (y > best) {
        best = y;
        slot = def.vertexSlots![i];
      }
    });
    // a d4 resting on a face has its top vertex exactly up (y/r = 1)
    return { slot, alignment: best };
  }
  let best = -Infinity;
  let slot = 0;
  def.normals.forEach((n, f) => {
    if (def.slotOfFace[f] < 0) return;
    const y = toWorld(n.clone()).y;
    if (y > best) {
      best = y;
      slot = def.slotOfFace[f];
    }
  });
  return { slot, alignment: best };
}

/** Local direction that must point up for `slot` to be the result. */
export function slotDirection(def: SolidDef, slot: number): Vector3 {
  if (def.vertexSlots) {
    const i = def.vertexSlots.indexOf(slot);
    return def.vertices[i].clone().normalize();
  }
  const f = def.slotOfFace.indexOf(slot);
  return def.normals[f].clone();
}
