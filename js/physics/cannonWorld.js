/**
 * @fileoverview Physics world configuration and setup.
 * Creates and configures CANNON.js physics environments with proper materials and boundaries.
 * Uses adapters for dependency injection to enable testing without CANNON.js.
 */

/**
 * Creates and configures a physics world for dice rolling.
 * Sets up gravity, solver iterations, and broadphase.
 * 
 * @param {Object} deps - Dependency injection object
 * @param {CANNON} deps.CANNON - CANNON.js physics library
 * @param {Object} [config={}] - World configuration
 * @param {number} [config.gravityScale=800] - Gravity multiplier (9.8 * scale)
 * @param {number} [config.solverIterations=16] - Physics solver iterations
 * @returns {CANNON.World} Configured physics world
 * 
 * @example
 * const world = createPhysicsWorld(
 *   { CANNON },
 *   { gravityScale: 800, solverIterations: 16 }
 * );
 */
export function createPhysicsWorld(deps, config = {}) {
  const { CANNON } = deps;
  if (!CANNON || !CANNON.World) {
    throw new Error("CANNON library not available");
  }
  
  const world = new CANNON.World();
  const gravityScale = config.gravityScale || 800;
  
  world.gravity.set(0, 0, -9.8 * gravityScale);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = config.solverIterations || 16;
  
  return world;
}

/**
 * Creates physics materials and their interactions.
 * Defines friction and restitution for dice, desk, and barrier collisions.
 * 
 * @param {Object} deps - {CANNON}
 * @returns {Object} Material definitions
 * @returns {CANNON.Material} returns.dice - Material for dice bodies
 * @returns {CANNON.Material} returns.desk - Material for ground/desk
 * @returns {CANNON.Material} returns.barrier - Material for walls
 * 
 * @example
 * const materials = createPhysicsMaterials({ CANNON });
 * // { dice: Material, desk: Material, barrier: Material }
 */
export function createPhysicsMaterials(deps) {
  const { CANNON } = deps;
  if (!CANNON || !CANNON.Material) {
    throw new Error("CANNON library not available");
  }
  
  return {
    dice: new CANNON.Material('dice'),
    desk: new CANNON.Material('desk'),
    barrier: new CANNON.Material('barrier')
  };
}

/**
 * Creates contact material interactions between two surfaces.
 * Defines collision behavior (friction, bounce).
 * 
 * @param {Object} deps - {CANNON}
 * @param {CANNON.Material} mat1 - First material
 * @param {CANNON.Material} mat2 - Second material
 * @param {Object} properties - Collision properties
 * @param {number} properties.friction - Friction coefficient (0-1)
 * @param {number} properties.restitution - Bounce coefficient (0-1)
 * @returns {CANNON.ContactMaterial} Contact interaction definition
 * 
 * @example
 * const contact = createContactMaterial(
 *   { CANNON },
 *   dicemat,
 *   deskMat,
 *   { friction: 0.01, restitution: 0.5 }
 * );
 */
export function createContactMaterial(deps, mat1, mat2, properties) {
  const { CANNON } = deps;
  if (!CANNON || !CANNON.ContactMaterial) {
    throw new Error("CANNON library not available");
  }
  
  return new CANNON.ContactMaterial(mat1, mat2, properties);
}

/**
 * Registers all contact materials in physics world.
 * Defines interactions between all material pairs.
 * 
 * @param {CANNON.World} world - Physics world
 * @param {Object} materials - Material definitions {dice, desk, barrier}
 * @param {Object} [config={}] - Contact configurations
 * 
 * @example
 * registerContactMaterials(world, materials, {
 *   deskDiceFriction: 0.01,
 *   diceBounciness: 0.5
 * });
 */
export function registerContactMaterials(deps, world, materials, config = {}) {
  const { CANNON } = deps;
  
  const deskDiceFriction = config.deskDiceFriction !== undefined ? config.deskDiceFriction : 0.01;
  const deskDiceRestitution = config.deskDiceRestitution !== undefined ? config.deskDiceRestitution : 0.5;
  
  const barrierDiceFriction = config.barrierDiceFriction !== undefined ? config.barrierDiceFriction : 0;
  const barrierDiceRestitution = config.barrierDiceRestitution !== undefined ? config.barrierDiceRestitution : 1.0;
  
  const diceDiceFriction = config.diceDiceFriction !== undefined ? config.diceDiceFriction : 0;
  const diceDiceRestitution = config.diceDiceRestitution !== undefined ? config.diceDiceRestitution : 0.5;
  
  // Desk-Dice interaction
  world.addContactMaterial(
    createContactMaterial(deps, materials.desk, materials.dice, {
      friction: deskDiceFriction,
      restitution: deskDiceRestitution
    })
  );
  
  // Barrier-Dice interaction (elastic, frictionless)
  world.addContactMaterial(
    createContactMaterial(deps, materials.barrier, materials.dice, {
      friction: barrierDiceFriction,
      restitution: barrierDiceRestitution
    })
  );
  
  // Dice-Dice interaction (elastic bounce)
  world.addContactMaterial(
    createContactMaterial(deps, materials.dice, materials.dice, {
      friction: diceDiceFriction,
      restitution: diceDiceRestitution
    })
  );
}

/**
 * Creates ground plane in physics world.
 * Static body with plane shape for dice to roll on.
 * 
 * @param {Object} deps - {CANNON}
 * @param {CANNON.World} world - Target physics world
 * @param {CANNON.Material} material - Ground material
 * 
 * @example
 * createGroundPlane({ CANNON }, world, materials.desk);
 */
export function createGroundPlane(deps, world, material) {
  const { CANNON } = deps;
  if (!CANNON || !CANNON.Body || !CANNON.Plane) {
    throw new Error("CANNON library not available");
  }
  
  const groundBody = new CANNON.Body({
    mass: 0,
    material
  });
  
  groundBody.addShape(new CANNON.Plane());
  world.addBody(groundBody);
  
  return groundBody;
}

/**
 * Creates a single barrier wall (half-plane).
 * Used for dice boundaries (left, right, top, bottom).
 * 
 * @param {Object} deps - {CANNON}
 * @param {CANNON.World} world - Target physics world
 * @param {CANNON.Material} material - Barrier material
 * @param {Object} axis - Rotation axis {x, y, z}
 * @param {number} angle - Rotation angle in radians
 * @param {Object} position - Barrier position {x, y, z}
 * @returns {CANNON.Body} Barrier body
 * 
 * @example
 * const topBarrier = createBarrier(
 *   { CANNON },
 *   world,
 *   material,
 *   { x: 1, y: 0, z: 0 },
 *   Math.PI / 2,
 *   { x: 0, y: 250, z: 0 }
 * );
 */
export function createBarrier(deps, world, material, axis, angle, position) {
  const { CANNON } = deps;
  if (!CANNON || !CANNON.Body || !CANNON.Plane || !CANNON.Vec3 || !CANNON.Quaternion) {
    throw new Error("CANNON library not available");
  }
  
  const barrier = new CANNON.Body({
    mass: 0,
    material
  });
  
  barrier.addShape(new CANNON.Plane());
  
  // Apply rotation
  const quat = new CANNON.Quaternion();
  quat.setFromAxisAngle(
    new CANNON.Vec3(axis.x, axis.y, axis.z),
    angle
  );
  barrier.quaternion = quat;
  
  // Apply position
  barrier.position.set(position.x, position.y, position.z);
  
  world.addBody(barrier);
  
  return barrier;
}

/**
 * Creates all four boundary barriers around dice box.
 * Prevents dice from rolling outside visible area.
 * 
 * @param {Object} deps - {CANNON}
 * @param {CANNON.World} world - Physics world
 * @param {CANNON.Material} material - Barrier material
 * @param {number} width - Half-width of visible area
 * @param {number} height - Half-height of visible area
 * @returns {Array<CANNON.Body>} Array of four barrier bodies [top, bottom, right, left]
 * 
 * @example
 * const barriers = createAllBarriers(
 *   { CANNON },
 *   world,
 *   material,
 *   300,  // width
 *   200   // height
 * );
 */
export function createAllBarriers(deps, world, material, width, height) {
  const barriers = [];
  
  // Top barrier
  barriers.push(
    createBarrier(
      deps,
      world,
      material,
      { x: 1, y: 0, z: 0 },
      Math.PI / 2,
      { x: 0, y: height, z: 0 }
    )
  );
  
  // Bottom barrier
  barriers.push(
    createBarrier(
      deps,
      world,
      material,
      { x: 1, y: 0, z: 0 },
      -Math.PI / 2,
      { x: 0, y: -height, z: 0 }
    )
  );
  
  // Right barrier
  barriers.push(
    createBarrier(
      deps,
      world,
      material,
      { x: 0, y: 1, z: 0 },
      -Math.PI / 2,
      { x: width, y: 0, z: 0 }
    )
  );
  
  // Left barrier
  barriers.push(
    createBarrier(
      deps,
      world,
      material,
      { x: 0, y: 1, z: 0 },
      Math.PI / 2,
      { x: -width, y: 0, z: 0 }
    )
  );
  
  return barriers;
}

/**
 * Complete physics world setup function.
 * Creates world, materials, contact interactions, ground, and barriers in one call.
 * 
 * @param {Object} deps - {CANNON}
 * @param {number} width - Visible area half-width
 * @param {number} height - Visible area half-height
 * @param {Object} [config={}] - Configuration overrides
 * @returns {Object} Complete physics setup
 * @returns {CANNON.World} returns.world - Configured physics world
 * @returns {Object} returns.materials - Physics materials
 * @returns {CANNON.Body} returns.ground - Ground plane body
 * @returns {Array<CANNON.Body>} returns.barriers - Boundary barriers
 * 
 * @example
 * const physics = setupPhysicsEnvironment(
 *   { CANNON },
 *   300,
 *   200,
 *   { gravityScale: 800 }
 * );
 */
export function setupPhysicsEnvironment(deps, width, height, config = {}) {
  // Create world
  const world = createPhysicsWorld(deps, config);
  
  // Create materials
  const materials = createPhysicsMaterials(deps);
  
  // Register contact interactions
  registerContactMaterials(deps, world, materials, config);
  
  // Create ground and barriers
  const ground = createGroundPlane(deps, world, materials.desk);
  const barriers = createAllBarriers(deps, world, materials.barrier, width, height);
  
  return {
    world,
    materials,
    ground,
    barriers
  };
}
