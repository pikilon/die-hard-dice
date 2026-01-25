/**
 * @fileoverview Adapter for CANNON.js physics operations with dependency injection.
 * Encapsulates physics body and world creation for testability.
 */

/**
 * Creates physics adapter factory with injected CANNON library.
 * Enables testing by allowing CANNON mock injection.
 * 
 * @param {Object} deps - Dependency injection object
 * @param {CANNON} deps.CANNON - CANNON.js physics library
 * @returns {Object} Adapter with physics functions
 * 
 * @example
 * const adapter = createCannonAdapter({ CANNON: window.CANNON });
 * const body = adapter.createDiceBody(mass, material);
 */
export function createCannonAdapter({ CANNON }) {
  return {
    /**
     * Creates a physics body for a die with specified mass and material.
     * 
     * @param {number} mass - Body mass (0 for static, >0 for dynamic)
     * @param {CANNON.Material} material - Physics material for collisions
     * @returns {CANNON.Body} Configured physics body
     */
    createDiceBody(mass, material) {
      if (!CANNON || !CANNON.Body) {
        throw new Error("CANNON library not available");
      }
      
      return new CANNON.Body({
        mass,
        material
      });
    },

    /**
     * Creates a convex polyhedron shape from vertices and faces.
     * Used for dice geometry.
     * 
     * @param {Array<Array<number>>} vertices - Vertex coordinates [[x,y,z], ...]
     * @param {Array<Array<number>>} faces - Face indices [[v1,v2,v3], ...]
     * @returns {CANNON.ConvexPolyhedron} Dice shape for physics
     */
    createConvexShape(vertices, faces) {
      if (!CANNON || !CANNON.ConvexPolyhedron) {
        throw new Error("CANNON library not available");
      }
      
      const cannonVertices = vertices.map(v => 
        new CANNON.Vec3(v[0], v[1], v[2])
      );
      
      return new CANNON.ConvexPolyhedron({
        vertices: cannonVertices,
        faces: faces
      });
    },

    /**
     * Creates a plane shape (for ground/barriers).
     * 
     * @returns {CANNON.Plane} Infinite plane shape
     */
    createPlaneShape() {
      if (!CANNON || !CANNON.Plane) {
        throw new Error("CANNON library not available");
      }
      
      return new CANNON.Plane();
    },

    /**
     * Creates a physics material for surface properties.
     * 
     * @param {string} [name] - Optional material name for debugging
     * @returns {CANNON.Material} Material object
     */
    createMaterial(name) {
      if (!CANNON || !CANNON.Material) {
        throw new Error("CANNON library not available");
      }
      
      return new CANNON.Material(name);
    },

    /**
     * Creates contact material between two surfaces.
     * Defines friction and restitution for collisions.
     * 
     * @param {CANNON.Material} material1 - First material
     * @param {CANNON.Material} material2 - Second material
     * @param {Object} properties - Contact properties
     * @param {number} properties.friction - Friction coefficient
     * @param {number} properties.restitution - Bounce coefficient
     * @returns {CANNON.ContactMaterial} Contact properties
     */
    createContactMaterial(material1, material2, properties) {
      if (!CANNON || !CANNON.ContactMaterial) {
        throw new Error("CANNON library not available");
      }
      
      return new CANNON.ContactMaterial(
        material1,
        material2,
        properties
      );
    },

    /**
     * Creates physics world with gravity and solver configuration.
     * 
     * @param {Object} config - World configuration
     * @param {CANNON.Vec3} config.gravity - Gravity vector (default [0,0,-9.8])
     * @param {number} config.iterations - Solver iterations (default 16)
     * @returns {CANNON.World} Configured physics world
     */
    createWorld(config = {}) {
      if (!CANNON || !CANNON.World) {
        throw new Error("CANNON library not available");
      }
      
      const world = new CANNON.World();
      
      if (config.gravity) {
        world.gravity.set(config.gravity.x, config.gravity.y, config.gravity.z);
      } else {
        world.gravity.set(0, 0, -9.8 * 800);
      }
      
      if (config.iterations !== undefined) {
        world.solver.iterations = config.iterations;
      } else {
        world.solver.iterations = 16;
      }
      
      // Use appropriate broadphase
      if (CANNON.NaiveBroadphase) {
        world.broadphase = new CANNON.NaiveBroadphase();
      }
      
      return world;
    },

    /**
     * Sets body position and rotation.
     * 
     * @param {CANNON.Body} body - Physics body
     * @param {Object} pos - Position {x, y, z}
     * @param {Object} [rot] - Quaternion rotation {x, y, z, w}
     */
    setBodyTransform(body, pos, rot) {
      body.position.set(pos.x, pos.y, pos.z);
      
      if (rot) {
        body.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      }
    },

    /**
     * Sets body velocity and angular velocity.
     * 
     * @param {CANNON.Body} body - Physics body
     * @param {Object} velocity - Linear velocity {x, y, z}
     * @param {Object} [angularVel] - Angular velocity {x, y, z}
     */
    setBodyVelocity(body, velocity, angularVel) {
      body.velocity.set(velocity.x, velocity.y, velocity.z);
      
      if (angularVel) {
        body.angularVelocity.set(angularVel.x, angularVel.y, angularVel.z);
      }
    }
  };
}

/**
 * Creates a vector for CANNON.js physics operations.
 * 
 * @param {Object} deps - {CANNON}
 * @param {Object} vec - Vector object {x, y, z}
 * @returns {CANNON.Vec3} CANNON physics vector
 */
export function createCannonVector({ CANNON }, vec) {
  if (!CANNON || !CANNON.Vec3) {
    throw new Error("CANNON library not available");
  }
  
  return new CANNON.Vec3(vec.x, vec.y, vec.z);
}

/**
 * Creates a quaternion for CANNON.js rotations.
 * 
 * @param {Object} deps - {CANNON}
 * @param {Object} quat - Quaternion {x, y, z, w}
 * @returns {CANNON.Quaternion} CANNON quaternion
 */
export function createCannonQuaternion({ CANNON }, quat) {
  if (!CANNON || !CANNON.Quaternion) {
    throw new Error("CANNON library not available");
  }
  
  const q = new CANNON.Quaternion();
  q.set(quat.x, quat.y, quat.z, quat.w);
  return q;
}
