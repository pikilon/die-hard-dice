/**
 * @fileoverview D4 (tetrahedron) dice geometry and factory.
 * @module dice/d4
 */

import * as THREE from 'three';
import { createGeom, calcTextureSize, materialOptions, labelColor, diceColor } from './common.js';

/** @type {Array} D4 label configurations for face shifting */
export const d4Labels = [
  [[], [0, 0, 0], [2, 4, 3], [1, 3, 4], [2, 1, 4], [1, 2, 3]],
  [[], [0, 0, 0], [2, 3, 4], [3, 1, 4], [2, 4, 1], [3, 2, 1]],
  [[], [0, 0, 0], [4, 3, 2], [3, 4, 1], [4, 2, 1], [3, 1, 2]],
  [[], [0, 0, 0], [4, 2, 3], [1, 4, 3], [4, 1, 2], [1, 3, 2]],
];

/** @type {THREE.Geometry|null} Cached d4 geometry */
let geometryCache = null;

/** @type {Array|null} Cached d4 materials */
let materialCache = null;

/** @type {number} Current scale factor */
let currentScale = 50;

/**
 * Sets the scale factor for d4 dice.
 * @param {number} newScale - The new scale value.
 */
export function setScale(newScale) {
  if (newScale !== currentScale) {
    currentScale = newScale;
    geometryCache = null;
    materialCache = null;
  }
}

/**
 * Clears the geometry and material caches.
 */
export function clearCache() {
  geometryCache = null;
  materialCache = null;
}

/**
 * Creates geometry for a d4 (tetrahedron) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d4 geometry with physics shape.
 */
export function createD4Geometry(radius) {
  const vertices = [
    [1, 1, 1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, -1, -1],
  ];
  const faces = [
    [1, 0, 2, 1],
    [0, 1, 3, 2],
    [0, 3, 2, 3],
    [1, 2, 3, 4],
  ];
  return createGeom(vertices, faces, radius, -0.1, (Math.PI * 7) / 6, 0.96);
}

/**
 * Creates materials with face number textures for d4 dice.
 * D4 has special triangular face layout with rotated numbers.
 * @param {number} size - Base size for texture calculations.
 * @param {number} margin - Margin around the text.
 * @param {Array} labels - Array of label arrays for each face.
 * @returns {Array<THREE.MeshPhongMaterial>} Array of materials for each face.
 */
export function createD4Materials(size, margin, labels) {
  function createD4Text(text, color, backColor) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const ts = calcTextureSize(size + margin) * 2;
    canvas.width = canvas.height = ts;
    context.font = (ts - margin) / 1.5 + "pt Arial";
    context.fillStyle = backColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    for (const i in text) {
      context.fillText(text[i], canvas.width / 2, canvas.height / 2 - ts * 0.3);
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((Math.PI * 2) / 3);
      context.translate(-canvas.width / 2, -canvas.height / 2);
    }
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  const materials = [];
  for (let i = 0; i < labels.length; ++i) {
    materials.push(
      new THREE.MeshPhongMaterial(
        Object.assign({}, materialOptions, {
          map: createD4Text(labels[i], labelColor, diceColor),
        })
      )
    );
  }
  return materials;
}

/**
 * Creates a d4 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @param {number} [scale] - Optional scale override.
 * @returns {THREE.Mesh} The d4 die mesh.
 */
export function createD4(scale) {
  const s = scale || currentScale;
  if (!geometryCache || scale !== currentScale) {
    geometryCache = createD4Geometry(s * 1.2);
  }
  if (!materialCache || scale !== currentScale) {
    materialCache = createD4Materials(s / 2, s * 2, d4Labels[0]);
  }
  if (scale) currentScale = scale;
  return new THREE.Mesh(geometryCache, materialCache);
}

/** @type {Object} D4 configuration */
export const config = {
  type: 'd4',
  faceRange: [1, 4],
  mass: 300,
  inertia: 5,
};

export default {
  createGeometry: createD4Geometry,
  createMaterials: createD4Materials,
  create: createD4,
  setScale,
  clearCache,
  d4Labels,
  config,
};
