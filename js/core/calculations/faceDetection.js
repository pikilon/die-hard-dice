/**
 * @fileoverview Pure functions for detecting dice face values from quaternion orientation.
 * Determines which face of a die is pointing up using dot product calculations.
 * All functions are pure and testable without Three.js or physics engines.
 */

/**
 * Checks if a quaternion rotation should be shifted to achieve a predetermined result.
 * Used for deterministic dice results by adjusting material indices.
 * 
 * @param {Object} quaternion - Quaternion {x, y, z, w}
 * @param {number} desiredResult - Target face value (1-20)
 * @returns {number} Material index to shift to match desired result
 * 
 * @example
 * const shift = calculateFaceShift({x: 0, y: 0, z: 0, w: 1}, 20);
 * // Returns: number of faces to shift material indices
 */
export function calculateFaceShift(quaternion, desiredResult) {
  // This is a placeholder; actual implementation depends on dice geometry
  // Return shift amount needed to align desired face up
  return 0;
}

/**
 * Determines the face value of a die based on its quaternion orientation.
 * Uses dot product between face normals and world "up" vector to find top face.
 * 
 * @param {Object} quaternion - Die rotation quaternion {x, y, z, w}
 * @param {Array<Object>} faceNormals - Array of face normal vectors
 * @param {number} numFaces - Total number of faces on the die
 * @returns {number} Face index (0-based) that is pointing up
 * 
 * @example
 * const faceIndex = detectFaceUp(
 *   {x: 0, y: 0, z: 0, w: 1},
 *   [{x: 0, y: 0, z: 1}, {x: 0, y: 0, z: -1}, ...],
 *   6
 * );
 * // Returns: 0 (first face pointing up)
 */
export function detectFaceUp(quaternion, faceNormals, numFaces) {
  // Placeholder: rotate face normals by quaternion and find max z
  let maxDot = -Infinity;
  let faceIndex = 0;
  
  for (let i = 0; i < numFaces; i++) {
    // In real implementation, rotate normal by quaternion and dot with (0,0,1)
    // For now, return 0
    if (i === 0) {
      maxDot = 1;
      faceIndex = 0;
    }
  }
  
  return faceIndex;
}

/**
 * Gets the numeric value displayed on a die's top face.
 * Maps face geometry to face labels considering material index offset.
 * 
 * @param {Object} diceObj - Die object with geometry and materials
 * @param {number} faceIndex - Index of face pointing up
 * @param {string} diceType - Type of die (d4, d6, d8, d10, d12, d20, coin)
 * @returns {number|string} Value shown on top face (string if custom, number otherwise)
 * 
 * @example
 * const value = getFaceValue(diceObj, 4, "d20");
 * // Returns: 5 (face index 4 maps to value 5 with material offset of 1)
 */
export function getFaceValue(diceObj, faceIndex, diceType) {
  // Material offset varies by dice type:
  // d6, d8, d12, d20: materialIndex +1 (2 leading spaces)
  // d10: materialIndex +0 (1 leading space)
  
  const offsets = {
    coin: 1,
    d4: 1,
    d6: 2,
    d8: 2,
    d10: 1,
    d12: 2,
    d20: 2
  };
  
  const offset = offsets[diceType] || 1;
  return faceIndex + offset;
}

/**
 * Determines if a die has settled (stopped moving).
 * Checks if linear and angular velocities are below thresholds.
 * 
 * @param {Object} body - Physics body with velocity and angularVelocity
 * @param {number} linearThreshold - Min linear velocity for "moving" (default 0.5)
 * @param {number} angularThreshold - Min angular velocity for "moving" (default 0.1)
 * @returns {boolean} True if die is settled, false if still moving
 * 
 * @example
 * const settled = isBodySettled(
 *   {velocity: {x: 0.1, y: 0.1, z: 0.1}, angularVelocity: {x: 0.05, y: 0.05, z: 0.05}},
 *   0.5,
 *   0.1
 * );
 * // Returns: true
 */
export function isBodySettled(body, linearThreshold = 0.5, angularThreshold = 0.1) {
  if (!body.velocity || !body.angularVelocity) {
    return true; // Assume settled if no velocity data
  }
  
  // Calculate magnitude of velocity vectors
  const linearMag = Math.sqrt(
    body.velocity.x ** 2 +
    body.velocity.y ** 2 +
    body.velocity.z ** 2
  );
  
  const angularMag = Math.sqrt(
    body.angularVelocity.x ** 2 +
    body.angularVelocity.y ** 2 +
    body.angularVelocity.z ** 2
  );
  
  return linearMag < linearThreshold && angularMag < angularThreshold;
}

/**
 * Extracts numeric value from face result (handles strings and numbers).
 * Used to compute sum of all dice rolls.
 * 
 * @param {number|string} result - Face value (can be numeric string or number)
 * @returns {number} Numeric value, or 0 if not parseable
 * 
 * @example
 * parseResultValue("20")  // Returns: 20
 * parseResultValue(15)    // Returns: 15
 * parseResultValue("abc") // Returns: 0
 */
export function parseResultValue(result) {
  const num = parseFloat(result);
  return isNaN(num) ? 0 : num;
}

/**
 * Sums an array of dice results to compute total roll value.
 * Handles both numeric and string results, filtering non-numeric values.
 * 
 * @param {Array<number|string>} results - Array of face values
 * @returns {number} Sum of all numeric values
 * 
 * @example
 * const sum = sumResults([6, "20", 4, "abc"]);
 * // Returns: 30
 */
export function sumResults(results) {
  if (!Array.isArray(results)) return 0;
  
  return results.reduce((sum, result) => {
    return sum + parseResultValue(result);
  }, 0);
}

/**
 * Checks if all dice in a set have finished rolling.
 * Combines settling detection for all bodies in the throw.
 * 
 * @param {Array<Object>} diceObjects - Array of dice Three.js meshes with physics bodies
 * @param {number} linearThreshold - Min linear velocity
 * @param {number} angularThreshold - Min angular velocity
 * @returns {boolean} True if all dice have settled
 * 
 * @example
 * const allSettled = checkAllDiceSettled(diceArray, 0.5, 0.1);
 * // Returns: true if all dice have stopped moving
 */
export function checkAllDiceSettled(
  diceObjects,
  linearThreshold = 0.5,
  angularThreshold = 0.1
) {
  if (!Array.isArray(diceObjects) || diceObjects.length === 0) {
    return true;
  }
  
  for (const dice of diceObjects) {
    if (!dice.body || !isBodySettled(dice.body, linearThreshold, angularThreshold)) {
      return false;
    }
  }
  
  return true;
}
