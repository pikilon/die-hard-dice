/**
 * @fileoverview D8 (octahedron) dice geometry and factory.
 * @module dice/d8
 */

import * as THREE from 'three';
import { createGeom } from './common.js';

/** @type {THREE.Geometry|null} Cached d8 geometry */
let geometryCache = null;

/** @type {number} Current scale factor */
let currentScale = 50;

/**
 * Sets the scale factor for d8 dice.
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
 * Creates geometry for a d8 (octahedron) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d8 geometry with physics shape.
 */
export function createD8Geometry(radius) {
  const vertices = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  const faces = [
    [0, 2, 4, 1],
    [0, 4, 3, 2],
    [0, 3, 5, 3],
    [0, 5, 2, 4],
    [1, 3, 4, 5],
    [1, 4, 2, 6],
    [1, 2, 5, 7],
    [1, 5, 3, 8],
  ];
  return createGeom(vertices, faces, radius, 0, -Math.PI / 4 / 2, 0.965);
}

/**
 * Creates a d8 die mesh with geometry and shared materials.
 * Caches geometry for reuse.
 * @param {number} [scale] - Optional scale override.
 * @param {Array} materials - The materials array to use.
 * @returns {THREE.Mesh} The d8 die mesh.
 */
export function createD8(scale, materials) {
  const s = scale || currentScale;
  if (!geometryCache || scale !== currentScale) {
    geometryCache = createD8Geometry(s);
  }
  if (scale) currentScale = scale;
  return new THREE.Mesh(geometryCache, materials);
}

/** @type {Object} D8 configuration */
export const config = {
  type: 'd8',
  faceRange: [1, 8],
  mass: 340,
  inertia: 10,
};

export default {
  createGeometry: createD8Geometry,
  create: createD8,
  setScale,
  clearCache,
  config,
};
