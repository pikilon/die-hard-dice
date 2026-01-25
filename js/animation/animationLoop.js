/**
 * @fileoverview Physics simulation and animation loop management.
 * Handles rendering loop, physics stepping, and state synchronization between
 * physics bodies and Three.js meshes.
 */

/**
 * Configuration for animation loop timing.
 * Determines how simulation advances per frame.
 * 
 * @type {Object}
 */
export const animationConfig = {
  /** Physics frame rate (1/60 = 0.01667 seconds per step) */
  frameRate: 1 / 60,
  
  /** Use adaptive timestep to handle frame rate variations */
  useAdaptiveTimestep: true,
  
  /** Maximum timestep to prevent physics instability */
  maxTimestep: 0.05,
  
  /** Selector animation rotation speed */
  selectorRotationSpeed: 0.01
};

/**
 * Synchronizes physics body state to Three.js mesh.
 * Updates mesh position and rotation from physics body.
 * 
 * @param {THREE.Mesh} mesh - Three.js mesh to update
 * @param {CANNON.Body} body - Physics body source
 * @returns {void}
 * 
 * @example
 * syncMeshToBody(diceMesh, diceBody);
 * // diceMesh now matches diceBody position/rotation
 */
export function syncMeshToBody(mesh, body) {
  if (!mesh || !body) return;
  
  // Sync position
  if (body.position) {
    mesh.position.copy(body.position);
  }
  
  // Sync rotation
  if (body.quaternion) {
    mesh.quaternion.copy(body.quaternion);
  }
}

/**
 * Runs a single physics simulation step and updates meshes.
 * Updates all dice meshes from their physics bodies.
 * 
 * @param {CANNON.World} world - Physics world
 * @param {Array<THREE.Mesh>} meshes - Dice meshes to update (must have .body property)
 * @param {number} [timestep] - Override timestep (uses config.frameRate if not provided)
 * @returns {void}
 * 
 * @example
 * stepPhysics(world, diceMeshes, 1/60);
 */
export function stepPhysics(world, meshes, timestep) {
  if (!world || !meshes) return;
  
  const dt = timestep || animationConfig.frameRate;
  
  // Step physics world
  world.step(dt);
  
  // Sync each mesh to its physics body
  for (const mesh of meshes) {
    if (mesh.body) {
      syncMeshToBody(mesh, mesh.body);
    }
  }
}

/**
 * Creates an animation loop function for continuous rendering and physics updates.
 * Returns a function that can be called with requestAnimationFrame.
 * 
 * @param {Object} config - Animation configuration
 * @param {THREE.WebGLRenderer} config.renderer - Three.js renderer
 * @param {THREE.Scene} config.scene - Three.js scene
 * @param {THREE.Camera} config.camera - Three.js camera
 * @param {CANNON.World} config.world - Physics world
 * @param {Array<THREE.Mesh>} config.meshes - Dice meshes
 * @param {Function} [config.onFrame] - Callback after each frame update
 * @param {number} [config.maxTimestep] - Maximum timestep
 * @returns {Function} Animation loop function
 * 
 * @example
 * const animLoop = createAnimationLoop({
 *   renderer, scene, camera, world, meshes,
 *   onFrame: () => console.log('frame')
 * });
 * 
 * const stop = animLoop.start();  // Start animation
 * // ...
 * stop();  // Stop animation
 */
export function createAnimationLoop(config) {
  let lastTime = 0;
  let animationId = null;
  let isRunning = false;
  
  const {
    renderer,
    scene,
    camera,
    world,
    meshes = [],
    onFrame = null,
    maxTimestep = animationConfig.maxTimestep
  } = config;
  
  /**
   * Frame update function called by requestAnimationFrame.
   * @private
   */
  const frame = (currentTime) => {
    if (!isRunning) return;
    
    // Calculate timestep
    const deltaTime = lastTime > 0
      ? Math.min((currentTime - lastTime) / 1000, maxTimestep)
      : animationConfig.frameRate;
    
    lastTime = currentTime;
    
    // Step physics
    stepPhysics(world, meshes, deltaTime);
    
    // Call frame callback if provided
    if (onFrame) {
      onFrame({
        deltaTime,
        time: currentTime,
        meshes,
        world
      });
    }
    
    // Render scene
    renderer.render(scene, camera);
    
    // Schedule next frame
    animationId = requestAnimationFrame(frame);
  };
  
  return {
    /**
     * Starts the animation loop.
     * @returns {Function} Stopper function
     */
    start() {
      if (isRunning) return () => {};
      
      isRunning = true;
      lastTime = 0;
      animationId = requestAnimationFrame(frame);
      
      return () => this.stop();
    },
    
    /**
     * Stops the animation loop.
     */
    stop() {
      isRunning = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      lastTime = 0;
    },
    
    /**
     * Checks if animation is running.
     * @returns {boolean}
     */
    isRunning() {
      return isRunning;
    },
    
    /**
     * Manually step the physics and render once.
     * Useful for manual animation or testing.
     */
    stepOnce(timestep = animationConfig.frameRate) {
      stepPhysics(world, meshes, timestep);
      
      if (onFrame) {
        onFrame({
          deltaTime: timestep,
          meshes,
          world
        });
      }
      
      renderer.render(scene, camera);
    }
  };
}

/**
 * Creates animation loop for selector display (continuous rotation).
 * Used for dice type selector visualization.
 * 
 * @param {Object} config - Configuration
 * @param {THREE.WebGLRenderer} config.renderer - Renderer
 * @param {THREE.Scene} config.scene - Scene
 * @param {THREE.Camera} config.camera - Camera
 * @param {Array<THREE.Mesh>} config.meshes - Selector dice meshes
 * @param {number} [config.rotationSpeed] - Rotation speed multiplier
 * @returns {Object} Animation control functions
 * 
 * @example
 * const selectorAnim = createSelectorAnimationLoop({
 *   renderer, scene, camera, meshes,
 *   rotationSpeed: 0.01
 * });
 * selectorAnim.start();
 */
export function createSelectorAnimationLoop(config) {
  let animationId = null;
  let isRunning = false;
  
  const {
    renderer,
    scene,
    camera,
    meshes = [],
    rotationSpeed = animationConfig.selectorRotationSpeed
  } = config;
  
  const frame = () => {
    if (!isRunning) return;
    
    // Rotate each mesh
    for (const mesh of meshes) {
      mesh.rotation.x += rotationSpeed;
      mesh.rotation.y += rotationSpeed * 1.5;
    }
    
    // Render
    renderer.render(scene, camera);
    
    animationId = requestAnimationFrame(frame);
  };
  
  return {
    start() {
      if (isRunning) return () => {};
      
      isRunning = true;
      animationId = requestAnimationFrame(frame);
      
      return () => this.stop();
    },
    
    stop() {
      isRunning = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    
    isRunning() {
      return isRunning;
    }
  };
}

/**
 * Pauses animation, steps physics manually, resumes.
 * Useful for testing or frame-by-frame debugging.
 * 
 * @param {Object} animationLoop - Animation loop object from createAnimationLoop()
 * @param {number} steps - Number of physics steps to advance
 * @param {number} [timestep] - Timestep per step
 * 
 * @example
 * pauseAndStep(animLoop, 10, 1/60);  // Advance 10 frames
 */
export function pauseAndStep(animationLoop, steps, timestep = animationConfig.frameRate) {
  const wasRunning = animationLoop.isRunning();
  
  if (wasRunning) {
    animationLoop.stop();
  }
  
  for (let i = 0; i < steps; i++) {
    animationLoop.stepOnce(timestep);
  }
  
  if (wasRunning) {
    animationLoop.start();
  }
}
