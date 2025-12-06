/**
 * @fileoverview D100 (percentile) dice geometry and factory.
 * Uses D10 geometry with special 00-90 face labels.
 * @module dice/d100
 */

import * as THREE from 'three';
import { getGeometry as getD10Geometry } from './d10.js';

/** @type {Array|null} Cached d100 materials */
let materialCache = null;

/** @type {number} Current scale factor */
let currentScale = 50;

/**
 * Sets the scale factor for d100 dice.
 * @param {number} newScale - The new scale value.
 */
export function setScale(newScale) {
  if (newScale !== currentScale) {
    currentScale = newScale;
    materialCache = null;
  }
}

/**
 * Clears the material cache.
 */
export function clearCache() {
  materialCache = null;
}

/**
 * Creates a d100 (percentile) die mesh.
 * Uses d10 geometry with special 00-90 face labels.
 * @param {number} [scale] - Optional scale override.
 * @param {Array} materials - The d100 materials array to use.
 * @returns {THREE.Mesh} The d100 die mesh.
 */
export function createD100(scale, materials) {
  const geometry = getD10Geometry(scale);
  if (scale) currentScale = scale;
  return new THREE.Mesh(geometry, materials);
}

/** @type {Object} D100 configuration */
export const config = {
  type: 'd100',
  faceRange: [0, 9],
  mass: 350,
  inertia: 9,
};

export default {
  create: createD100,
  setScale,
  clearCache,
  config,
};
