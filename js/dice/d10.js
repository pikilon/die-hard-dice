/**
 * @fileoverview D10 (pentagonal trapezohedron) dice geometry and factory.
 * @module dice/d10
 */

import * as THREE from 'three';
import { createGeom } from './common.js';

/** @type {THREE.Geometry|null} Cached d10 geometry */
let geometryCache = null;

/** @type {number} Current scale factor */
let currentScale = 50;

/**
 * Sets the scale factor for d10 dice.
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
 * Creates geometry for a d10 (pentagonal trapezohedron) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d10 geometry with physics shape.
 */
export function createD10Geometry(radius) {
  const a = (Math.PI * 2) / 10;
  const h = 0.105;
  const v = -1;
  const vertices = [];
  for (let i = 0, b = 0; i < 10; ++i, b += a) {
    vertices.push([Math.cos(b), Math.sin(b), h * (i % 2 ? 1 : -1)]);
  }
  vertices.push([0, 0, -1]);
  vertices.push([0, 0, 1]);
  const faces = [
    [5, 7, 11, 0],
    [4, 2, 10, 1],
    [1, 3, 11, 2],
    [0, 8, 10, 3],
    [7, 9, 11, 4],
    [8, 6, 10, 5],
    [9, 1, 11, 6],
    [2, 0, 10, 7],
    [3, 5, 11, 8],
    [6, 4, 10, 9],
    [1, 0, 2, v],
    [1, 2, 3, v],
    [3, 2, 4, v],
    [3, 4, 5, v],
    [5, 4, 6, v],
    [5, 6, 7, v],
    [7, 6, 8, v],
    [7, 8, 9, v],
    [9, 8, 0, v],
    [9, 0, 1, v],
  ];
  return createGeom(vertices, faces, radius, 0, (Math.PI * 6) / 5, 0.945);
}

/**
 * Gets the cached d10 geometry, creating it if necessary.
 * @param {number} [scale] - Optional scale override.
 * @returns {THREE.Geometry} The d10 geometry.
 */
export function getGeometry(scale) {
  const s = scale || currentScale;
  if (!geometryCache || scale !== currentScale) {
    geometryCache = createD10Geometry(s * 0.9);
    if (scale) currentScale = scale;
  }
  return geometryCache;
}

/**
 * Creates a d10 die mesh with geometry and shared materials.
 * Caches geometry for reuse.
 * @param {number} [scale] - Optional scale override.
 * @param {Array} materials - The materials array to use.
 * @returns {THREE.Mesh} The d10 die mesh.
 */
export function createD10(scale, materials) {
  const geometry = getGeometry(scale);
  return new THREE.Mesh(geometry, materials);
}

/** @type {Object} D10 configuration */
export const config = {
  type: 'd10',
  faceRange: [0, 9],
  mass: 350,
  inertia: 9,
};

export default {
  createGeometry: createD10Geometry,
  getGeometry,
  create: createD10,
  setScale,
  clearCache,
  config,
};
