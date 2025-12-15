/**
 * @fileoverview Main entry point for dice modules.
 * Re-exports all dice types and common utilities.
 * @module dice
 */

// Re-export common utilities
export * from './common.js';

// Re-export individual dice modules
export * as coin from './d2.js';
export * as d4 from './d4.js';
export * as d6 from './d6.js';
export * as d8 from './d8.js';
export * as d10 from './d10.js';
export * as d12 from './d12.js';
export * as d20 from './d20.js';

// Import for building factories
import { createD2, createD2Materials, createD2Geometry, config as coinConfig } from './d2.js';
import { createD4, createD4Materials, createD4Geometry, d4Labels, config as d4Config } from './d4.js';
import { createD6, createD6Geometry, config as d6Config } from './d6.js';
import { createD8, createD8Geometry, config as d8Config } from './d8.js';
import { createD10, createD10Geometry, getGeometry as getD10Geometry, config as d10Config } from './d10.js';
import { createD12, createD12Geometry, config as d12Config } from './d12.js';
import { createD20, createD20Geometry, config as d20Config } from './d20.js';

/** @type {Array<string>} All supported dice types */
export const knownTypes = ['coin', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'];

/** @type {Object} Face value ranges for each die type */
export const diceFaceRange = {
  coin: coinConfig.faceRange,
  d4: d4Config.faceRange,
  d6: d6Config.faceRange,
  d8: d8Config.faceRange,
  d10: d10Config.faceRange,
  d12: d12Config.faceRange,
  d20: d20Config.faceRange,
};

/** @type {Object} Mass values for each die type */
export const diceMass = {
  coin: coinConfig.mass,
  d4: d4Config.mass,
  d6: d6Config.mass,
  d8: d8Config.mass,
  d10: d10Config.mass,
  d12: d12Config.mass,
  d20: d20Config.mass,
};

/** @type {Object} Inertia values for each die type */
export const diceInertia = {
  coin: coinConfig.inertia,
  d4: d4Config.inertia,
  d6: d6Config.inertia,
  d8: d8Config.inertia,
  d10: d10Config.inertia,
  d12: d12Config.inertia,
  d20: d20Config.inertia,
};

/** @type {Object} Geometry creation functions by type */
export const geometryFactories = {
  coin: createD2Geometry,
  d4: createD4Geometry,
  d6: createD6Geometry,
  d8: createD8Geometry,
  d10: createD10Geometry,
  d12: createD12Geometry,
  d20: createD20Geometry,
};

// Re-export individual functions for convenience
export {
  createD2 as createCoin,
  createD2Materials as createCoinMaterials,
  createD2Geometry as createCoinGeometry,
  createD2,
  createD2Materials,
  createD2Geometry,
  createD4,
  createD4Materials,
  createD4Geometry,
  d4Labels,
  createD6,
  createD6Geometry,
  createD8,
  createD8Geometry,
  createD10,
  createD10Geometry,
  getD10Geometry,
  createD12,
  createD12Geometry,
  createD20,
  createD20Geometry,
};
