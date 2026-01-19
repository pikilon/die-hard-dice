/**
 * @fileoverview Coin dice geometry and factory.
 * @module dice/coin
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { calcTextureSize, materialOptions, labelColor, diceColor } from './common.js';

/** @type {THREE.Geometry|null} Cached d2 geometry */
let geometryCache = null;

/** @type {Array|null} Cached d2 materials */
let materialCache = null;

/** @type {number} Current scale factor */
let currentScale = 50;

/**
 * Sets the scale factor for d2 dice.
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
 * Creates geometry for a d2 (coin) die.
 * A coin is a flat cylinder with two faces.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.CylinderGeometry} The d2 geometry with physics shape.
 */
export function createD2Geometry(radius) {
  const coinRadius = radius * 0.8;
  const coinHeight = radius * 0.15;
  const segments = 64;

  // Create Three.js cylinder geometry
  const geom = new THREE.CylinderGeometry(coinRadius, coinRadius, coinHeight, segments);
  
  // Rotate geometry so the coin lies flat (caps face Z axis instead of Y)
  geom.rotateX(Math.PI / 2);
  
  // Create Cannon.js cylinder shape for physics
  const shape = new CANNON.Cylinder(coinRadius, coinRadius, coinHeight, segments);
  
  // Rotate the Cannon shape to match Three.js orientation (caps face Z)
  const quat = new CANNON.Quaternion();
  quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
  shape.transformAllPoints(new CANNON.Vec3(), quat);
  
  geom.cannon_shape = shape;
  
  return geom;
}

/**
 * Creates materials with face textures for coin dice.
 * @param {number} size - Base size for texture calculations.
 * @param {number} margin - Margin around the text.
 * @param {Array<string>} [sides] - Optional custom sides array [top, bottom].
 * @returns {Array<THREE.MeshPhongMaterial>} Array of materials for each face.
 */
export function createD2Materials(size, margin, sides, backgroundColor) {
  const topText = (sides && sides[0]) || "1";
  const bottomText = (sides && sides[1]) || "2";
  
  // Helper to calculate text color based on background luminance
  const getTextColorForBg = (hex) => {
    if (!hex || typeof hex !== 'string') return labelColor;
    const h = hex.replace('#', '').toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(h)) return labelColor;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const bgColor = backgroundColor || diceColor;
  const textColor = getTextColorForBg(bgColor);

  function createD2Texture(text) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const ts = calcTextureSize(size + margin) * 2;
    canvas.width = canvas.height = ts;
    
    // Fill background
    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw circular coin shape
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 4, 0, Math.PI * 2);
    context.fillStyle = bgColor;
    context.fill();
    
    // Draw text
    context.font = `bold ${ts / 2}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = textColor;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // CylinderGeometry has materials: [side, top cap, bottom cap]
  const sideMaterial = new THREE.MeshPhongMaterial(
    Object.assign({}, materialOptions, { color: bgColor })
  );
  
  const topMaterial = new THREE.MeshPhongMaterial(
    Object.assign({}, materialOptions, { map: createD2Texture(topText) })
  );
  
  const bottomMaterial = new THREE.MeshPhongMaterial(
    Object.assign({}, materialOptions, { map: createD2Texture(bottomText) })
  );

  return [sideMaterial, topMaterial, bottomMaterial];
}

/**
 * Creates a coin die mesh with geometry and materials.
 * @param {number} [scale] - Optional scale override.
 * @param {Array<string>} [sides] - Optional custom sides array [top, bottom].
 * @returns {THREE.Mesh} The coin die mesh.
 */
export function createD2(scale, sides) {
  const s = scale || currentScale;
  if (!geometryCache || scale !== currentScale) {
    geometryCache = createD2Geometry(s);
  }
  // Always create fresh materials if custom sides are provided
  let materials;
  if (sides && sides.length === 2) {
    materials = createD2Materials(s / 2, s * 2, sides);
  } else {
    if (!materialCache || scale !== currentScale) {
      materialCache = createD2Materials(s / 2, s * 2);
    }
    materials = materialCache;
  }
  if (scale) currentScale = scale;
  return new THREE.Mesh(geometryCache, materials);
}

/** @type {Object} Coin configuration */
export const config = {
  type: 'coin',
  faceRange: [1, 2],
  mass: 350,
  inertia: 13,
};

export default {
  createGeometry: createD2Geometry,
  createMaterials: createD2Materials,
  create: createD2,
  setScale,
  clearCache,
  config,
};
