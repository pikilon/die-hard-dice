/**
 * @fileoverview D20 (icosahedron) dice geometry and factory.
 * @module dice/d20
 */

import * as THREE from 'three';
import { createGeom } from './common.js';

/** @type {THREE.Geometry|null} Cached d20 geometry */
let geometryCache = null;

/** @type {number} Current scale factor */
let currentScale = 50;

/**
 * Sets the scale factor for d20 dice.
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
 * Creates geometry for a d20 (icosahedron) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d20 geometry with physics shape.
 */
export function createD20Geometry(radius) {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ];
  const faces = [
    [0, 11, 5, 1],
    [0, 5, 1, 2],
    [0, 1, 7, 3],
    [0, 7, 10, 4],
    [0, 10, 11, 5],
    [1, 5, 9, 6],
    [5, 11, 4, 7],
    [11, 10, 2, 8],
    [10, 7, 6, 9],
    [7, 1, 8, 10],
    [3, 9, 4, 11],
    [3, 4, 2, 12],
    [3, 2, 6, 13],
    [3, 6, 8, 14],
    [3, 8, 9, 15],
    [4, 9, 5, 16],
    [2, 4, 11, 17],
    [6, 2, 10, 18],
    [8, 6, 7, 19],
    [9, 8, 1, 20],
  ];
  return createGeom(vertices, faces, radius, -0.2, -Math.PI / 4 / 2, 0.955);
}

/**
 * Creates a d20 die mesh with geometry and shared materials.
 * Caches geometry for reuse.
 * @param {number} [scale] - Optional scale override.
 * @param {Array} materials - The materials array to use.
 * @returns {THREE.Mesh} The d20 die mesh.
 */
export function createD20(scale, materials) {
  const s = scale || currentScale;
  if (!geometryCache || scale !== currentScale) {
    geometryCache = createD20Geometry(s);
  }
  if (scale) currentScale = scale;
  return new THREE.Mesh(geometryCache, materials);
}

/** @type {Object} D20 configuration */
export const config = {
  type: 'd20',
  faceRange: [1, 20],
  mass: 400,
  inertia: 6,
};

export default {
  createGeometry: createD20Geometry,
  create: createD20,
  setScale,
  clearCache,
  config,
};
