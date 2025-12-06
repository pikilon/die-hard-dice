/**
 * @fileoverview D12 (dodecahedron) dice geometry and factory.
 * @module dice/d12
 */

import * as THREE from 'three';
import { createGeom } from './common.js';

/** @type {THREE.Geometry|null} Cached d12 geometry */
let geometryCache = null;

/** @type {number} Current scale factor */
let currentScale = 50;

/**
 * Sets the scale factor for d12 dice.
 * @param {number} newScale - The new scale value.
 */
export function setScale(newScale) {
  if (newScale !== currentScale) {
    currentScale = newScale;
    geometryCache = null;
  }
}

/**
 * Clears the geometry cache.
 */
export function clearCache() {
  geometryCache = null;
}

/**
 * Creates geometry for a d12 (dodecahedron) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d12 geometry with physics shape.
 */
export function createD12Geometry(radius) {
  const p = (1 + Math.sqrt(5)) / 2;
  const q = 1 / p;
  const vertices = [
    [0, q, p],
    [0, q, -p],
    [0, -q, p],
    [0, -q, -p],
    [p, 0, q],
    [p, 0, -q],
    [-p, 0, q],
    [-p, 0, -q],
    [q, p, 0],
    [q, -p, 0],
    [-q, p, 0],
    [-q, -p, 0],
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
  ];
  const faces = [
    [2, 14, 4, 12, 0, 1],
    [15, 9, 11, 19, 3, 2],
    [16, 10, 17, 7, 6, 3],
    [6, 7, 19, 11, 18, 4],
    [6, 18, 2, 0, 16, 5],
    [18, 11, 9, 14, 2, 6],
    [1, 17, 10, 8, 13, 7],
    [1, 13, 5, 15, 3, 8],
    [13, 8, 12, 4, 5, 9],
    [5, 4, 14, 9, 15, 10],
    [0, 12, 8, 10, 16, 11],
    [3, 19, 7, 17, 1, 12],
  ];
  return createGeom(vertices, faces, radius, 0.2, -Math.PI / 4 / 2, 0.968);
}

/**
 * Creates a d12 die mesh with geometry and shared materials.
 * Caches geometry for reuse.
 * @param {number} [scale] - Optional scale override.
 * @param {Array} materials - The materials array to use.
 * @returns {THREE.Mesh} The d12 die mesh.
 */
export function createD12(scale, materials) {
  const s = scale || currentScale;
  if (!geometryCache || scale !== currentScale) {
    geometryCache = createD12Geometry(s * 0.9);
  }
  if (scale) currentScale = scale;
  return new THREE.Mesh(geometryCache, materials);
}

/** @type {Object} D12 configuration */
export const config = {
  type: 'd12',
  faceRange: [1, 12],
  mass: 350,
  inertia: 8,
};

export default {
  createGeometry: createD12Geometry,
  create: createD12,
  setScale,
  clearCache,
  config,
};
