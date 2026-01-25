/**
 * @fileoverview Pure vector and throw mechanics calculations.
 * Calculates throw vectors, rotations, and velocities without modifying scene or physics state.
 * All functions are deterministic and can be tested independently.
 */

/**
 * Applies random rotation to a direction vector.
 * Perturbs the vector slightly to vary dice throw trajectories.
 * 
 * @param {Object} vector - The input vector with x and y components
 * @param {number} vector.x - X component
 * @param {number} vector.y - Y component
 * @param {Function} [randomFn=Math.random] - Random number generator (0-1)
 * @returns {Object} Rotated vector with x and y components
 * 
 * @example
 * const vec = { x: 1, y: 0 };
 * const rotated = makeRandomVector(vec, () => 0.5);
 * // Returns: rotated vector with slight deviation
 */
export function makeRandomVector(vector, randomFn = Math.random) {
  const angle = (randomFn() - 0.5) * Math.PI;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos
  };
}

/**
 * Calculates initial position for a die in the throw sequence.
 * Positions dice in a grid to avoid overlap.
 * 
 * @param {number} index - Sequential index of the die (0, 1, 2, ...)
 * @param {number} gridSize - Number of dice per row
 * @param {number} spacing - Space between dice centers
 * @param {number} [startX=0] - Starting X position
 * @param {number} [startY=0] - Starting Y position
 * @param {number} [startZ=80] - Starting Z position (height)
 * @returns {Object} Position object {x, y, z}
 * 
 * @example
 * const pos1 = calculateDicePosition(0, 4, 50);
 * // Returns: { x: 0, y: 0, z: 80 }
 * 
 * const pos2 = calculateDicePosition(1, 4, 50);
 * // Returns: { x: 50, y: 0, z: 80 }
 */
export function calculateDicePosition(
  index,
  gridSize,
  spacing,
  startX = 0,
  startY = 0,
  startZ = 80
) {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  
  return {
    x: startX + col * spacing - (gridSize - 1) * spacing / 2,
    y: startY + row * spacing - (gridSize - 1) * spacing / 2,
    z: startZ
  };
}

/**
 * Calculates initial velocity vector for a die throw.
 * Combines throw direction, boost factor, and randomization.
 * 
 * @param {Object} direction - Throw direction {x, y}
 * @param {number} boost - Multiplier for throw force (1.0 = normal force)
 * @param {number} variance - Random variance factor (0-1)
 * @param {Function} [randomFn=Math.random] - Random number generator
 * @returns {Object} Velocity vector {x, y, z}
 * 
 * @example
 * const velocity = calculateThrowVelocity(
 *   { x: 1, y: 0 },
 *   2.0,
 *   0.3
 * );
 * // Returns: { x: ~2.0, y: small variation, z: 0 }
 */
export function calculateThrowVelocity(
  direction,
  boost,
  variance,
  randomFn = Math.random
) {
  const randomizedBoost = boost * (1 + (randomFn() - 0.5) * variance);
  
  return {
    x: direction.x * randomizedBoost,
    y: direction.y * randomizedBoost,
    z: 0
  };
}

/**
 * Calculates angular velocity (rotation) for a die.
 * Creates tumbling effect based on throw velocity.
 * 
 * @param {Object} velocity - Linear velocity {x, y, z}
 * @param {number} spinFactor - How much velocity translates to rotation (default 0.1)
 * @param {Function} [randomFn=Math.random] - Random number generator
 * @returns {Object} Angular velocity {x, y, z}
 * 
 * @example
 * const angularVel = calculateAngularVelocity(
 *   { x: 100, y: 50, z: 0 },
 *   0.1
 * );
 * // Returns: {x: ~10, y: ~5, z: random}
 */
export function calculateAngularVelocity(
  velocity,
  spinFactor = 0.1,
  randomFn = Math.random
) {
  return {
    x: velocity.x * spinFactor,
    y: velocity.y * spinFactor,
    z: (randomFn() - 0.5) * 20
  };
}

/**
 * Generates all initial vectors (position, velocity, rotation) for a set of dice.
 * Pure function that computes throw parameters without modifying dice or scene.
 * 
 * @param {Array<string>} diceTypes - Array of dice type strings (e.g., ["d6", "d20"])
 * @param {Object} throwDirection - Throw direction {x, y}
 * @param {number} boost - Throw force multiplier
 * @param {number} [gridSize=4] - Dice per row in initial grid
 * @param {number} [spacing=50] - Space between dice centers
 * @param {Function} [randomFn=Math.random] - Random generator for reproducibility
 * @returns {Array<Object>} Array of vector objects, one per die
 * @returns {Array<Object>[].pos} Initial position {x, y, z}
 * @returns {Array<Object>[].velocity} Initial velocity {x, y, z}
 * @returns {Array<Object>[].angle} Angular velocity {x, y, z}
 * @returns {Array<Object>[].type} Dice type string
 * 
 * @example
 * const vectors = generateThrowVectors(
 *   ["d6", "d6", "d20"],
 *   { x: 1, y: 0 },
 *   2.0
 * );
 * // Returns: [
 * //   {
 * //     type: "d6",
 * //     pos: {x, y, z},
 * //     velocity: {x, y, z},
 * //     angle: {x, y, z},
 * //     axis: {x, y, z, a}
 * //   },
 * //   ...
 * // ]
 */
export function generateThrowVectors(
  diceTypes,
  throwDirection,
  boost,
  gridSize = 4,
  spacing = 50,
  randomFn = Math.random
) {
  const vectors = [];
  
  for (let i = 0; i < diceTypes.length; i++) {
    const type = diceTypes[i];
    
    // Position in grid
    const pos = calculateDicePosition(i, gridSize, spacing);
    
    // Randomize throw direction slightly
    const randomizedDir = makeRandomVector(throwDirection, randomFn);
    
    // Calculate velocity
    const velocity = calculateThrowVelocity(randomizedDir, boost, 0.3, randomFn);
    
    // Calculate angular velocity
    const angle = calculateAngularVelocity(velocity, 0.1, randomFn);
    
    // Generate random rotation axis
    const axis = {
      x: randomFn() * 2 - 1,
      y: randomFn() * 2 - 1,
      z: randomFn() * 2 - 1,
      a: randomFn() * Math.PI
    };
    
    vectors.push({
      type,
      pos,
      velocity,
      angle,
      axis
    });
  }
  
  return vectors;
}

/**
 * Calculates throw distance from drag length.
 * Converts screen space drag distance to physics simulation boost.
 * 
 * @param {number} dragDistance - Distance in pixels
 * @param {number} [maxDistance=500] - Maximum drag distance for full boost
 * @param {number} [maxBoost=5.0] - Maximum force multiplier
 * @returns {number} Boost factor (1.0 to maxBoost)
 * 
 * @example
 * calculateThrowBoost(250, 500, 5.0) // Returns: ~2.5
 * calculateThrowBoost(100, 500, 5.0) // Returns: ~1.8
 */
export function calculateThrowBoost(
  dragDistance,
  maxDistance = 500,
  maxBoost = 5.0
) {
  const ratio = Math.min(dragDistance / maxDistance, 1.0);
  return 1.0 + ratio * (maxBoost - 1.0);
}

/**
 * Calculates throw direction from drag vector.
 * Normalizes screen drag into physics direction vector.
 * 
 * @param {Object} dragStart - Starting position {x, y}
 * @param {Object} dragEnd - Ending position {x, y}
 * @returns {Object} Normalized direction vector {x, y, distance}
 * 
 * @example
 * const dir = calculateThrowDirection({x: 100, y: 100}, {x: 200, y: 150});
 * // Returns: { x: 0.894, y: 0.447, distance: 111.8 }
 */
export function calculateThrowDirection(dragStart, dragEnd) {
  const dx = dragEnd.x - dragStart.x;
  const dy = dragEnd.y - dragStart.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) {
    return { x: 0, y: 0, distance: 0 };
  }
  
  return {
    x: dx / distance,
    y: dy / distance,
    distance
  };
}
