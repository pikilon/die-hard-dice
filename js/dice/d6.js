/**
 * @fileoverview D6 (cube) dice geometry and factory.
 * @module dice/d6
 */

import * as THREE from 'three';
import { createGeom } from './common.js';

/** @type {THREE.Geometry|null} Cached d6 geometry */
let geometryCache = null;

/** @type {number} Current scale factor */
let currentScale = 50;

/**
 * Sets the scale factor for d6 dice.
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
 * Creates geometry for a d6 (cube) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d6 geometry with physics shape.
 */
export function createD6Geometry(radius) {
  const vertices = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ];
  const faces = [
    [0, 3, 2, 1, 1],
    [1, 2, 6, 5, 2],
    [0, 1, 5, 4, 3],
    [3, 7, 6, 2, 4],
    [0, 4, 7, 3, 5],
    [4, 5, 6, 7, 6],
  ];
  return createGeom(vertices, faces, radius, 0.1, Math.PI / 4, 0.96);
}

/**
 * Creates a d6 die mesh with geometry and shared materials.
 * Caches geometry for reuse.
 * @param {number} [scale] - Optional scale override.
 * @param {Array} materials - The materials array to use.
 * @returns {THREE.Mesh} The d6 die mesh.
 */
export function createD6(scale, materials) {
  const s = scale || currentScale;
  if (!geometryCache || scale !== currentScale) {
    geometryCache = createD6Geometry(s * 0.9);
  }
  if (scale) currentScale = scale;
  return new THREE.Mesh(geometryCache, materials);
}

/** @type {Object} D6 configuration */
export const config = {
  type: 'd6',
  faceRange: [1, 6],
  mass: 300,
  inertia: 13,
};

export default {
  createGeometry: createD6Geometry,
  create: createD6,
  setScale,
  clearCache,
  config,
};
