/**
 * @fileoverview Scene rendering setup and configuration.
 * Creates Three.js scenes, cameras, renderers, lighting with dependency injection.
 */

/**
 * Creates and configures a Three.js scene for dice rolling.
 * Initializes camera, renderer, lights, and ground plane.
 * 
 * @param {Object} deps - Dependency injection
 * @param {THREE} deps.THREE - Three.js library
 * @param {HTMLElement} container - DOM element for renderer
 * @param {Object} [config={}] - Scene configuration
 * @param {number} [config.containerWidth] - Override container width
 * @param {number} [config.containerHeight] - Override container height
 * @returns {Object} Scene setup with all components
 * @returns {THREE.Scene} returns.scene - Three.js scene
 * @returns {THREE.PerspectiveCamera} returns.camera - Camera
 * @returns {THREE.WebGLRenderer} returns.renderer - Renderer
 * @returns {THREE.SpotLight} returns.light - Main light source
 * @returns {THREE.Mesh} returns.ground - Ground plane mesh
 * @returns {Object} returns.dimensions - Scene dimensions
 * 
 * @example
 * const setup = createDiceBoxScene(
 *   { THREE },
 *   container,
 *   { containerWidth: 800, containerHeight: 600 }
 * );
 */
export function createDiceBoxScene(deps, container, config = {}) {
  const { THREE } = deps;
  if (!THREE) {
    throw new Error("THREE library not available");
  }
  
  // Calculate dimensions
  const cw = config.containerWidth || container.clientWidth;
  const ch = config.containerHeight || container.clientHeight;
  const containerWidth = cw / 2;
  const containerHeight = ch / 2;
  
  // Create scene
  const scene = new THREE.Scene();
  
  // Create camera
  const camera = new THREE.PerspectiveCamera(
    20,
    containerWidth / containerHeight,
    1,
    (containerHeight / Math.tan((10 * Math.PI) / 180)) * 1.3
  );
  camera.position.z = containerHeight / Math.tan((10 * Math.PI) / 180);
  
  // Create renderer
  const renderer = new THREE.WebGLRenderer
    ? new THREE.WebGLRenderer({ antialias: true })
    : new THREE.CanvasRenderer({ antialias: true });
  
  container.appendChild(renderer.domElement);
  renderer.setSize(cw, ch);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0xffffff, 1);
  
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xf0f5fb);
  scene.add(ambientLight);
  
  // Create and position spot light
  const light = new THREE.SpotLight(0xefdfd5, 2.0);
  const maxDim = Math.max(containerWidth * 2, containerHeight * 2);
  light.position.set(-maxDim / 2, maxDim / 2, maxDim * 2);
  light.target.position.set(0, 0, 0);
  light.distance = maxDim * 5;
  light.castShadow = true;
  light.shadow.camera.near = maxDim / 10;
  light.shadow.camera.far = maxDim * 5;
  light.shadow.camera.fov = 50;
  light.shadow.bias = 0.001;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  scene.add(light);
  
  // Create ground plane
  const groundGeo = new THREE.PlaneGeometry(containerWidth * 4, containerHeight * 4, 1, 1);
  const groundMat = new THREE.MeshPhongMaterial({ color: 0xdfdfdf });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);
  
  return {
    scene,
    camera,
    renderer,
    light,
    ground,
    dimensions: {
      containerWidth,
      containerHeight,
      displayWidth: cw,
      displayHeight: ch
    }
  };
}

/**
 * Updates scene dimensions when container is resized.
 * Recalculates camera, renderer size, and lighting.
 * 
 * @param {Object} deps - {THREE}
 * @param {Object} setup - Scene setup from createDiceBoxScene()
 * @param {HTMLElement} container - DOM container
 * @param {Object} [config={}] - Override configuration
 * 
 * @example
 * resizeDiceBoxScene({ THREE }, setup, container);
 */
export function resizeDiceBoxScene(deps, setup, container, config = {}) {
  const { THREE } = deps;
  
  const cw = config.containerWidth || container.clientWidth;
  const ch = config.containerHeight || container.clientHeight;
  const containerWidth = cw / 2;
  const containerHeight = ch / 2;
  
  // Update dimensions
  setup.dimensions.containerWidth = containerWidth;
  setup.dimensions.containerHeight = containerHeight;
  setup.dimensions.displayWidth = cw;
  setup.dimensions.displayHeight = ch;
  
  // Update camera
  setup.camera.aspect = containerWidth / containerHeight;
  setup.camera.far = (containerHeight / Math.tan((10 * Math.PI) / 180)) * 1.3;
  setup.camera.position.z = containerHeight / Math.tan((10 * Math.PI) / 180);
  setup.camera.updateProjectionMatrix();
  
  // Update renderer
  setup.renderer.setSize(cw, ch);
  
  // Update lighting
  const maxDim = Math.max(containerWidth * 2, containerHeight * 2);
  setup.light.position.set(-maxDim / 2, maxDim / 2, maxDim * 2);
  setup.light.distance = maxDim * 5;
  setup.light.shadow.camera.near = maxDim / 10;
  setup.light.shadow.camera.far = maxDim * 5;
  
  // Update ground
  setup.ground.geometry.dispose();
  setup.ground.geometry = new THREE.PlaneGeometry(containerWidth * 4, containerHeight * 4, 1, 1);
  
  // Re-render
  setup.renderer.render(setup.scene, setup.camera);
}

/**
 * Creates visual debug barriers (colored planes) for development.
 * Shows where physics barriers are positioned.
 * 
 * @param {Object} deps - {THREE}
 * @param {THREE.Scene} scene - Target scene
 * @param {number} width - Half-width of visible area
 * @param {number} height - Half-height of visible area
 * @returns {Array<THREE.Mesh>} Array of debug barrier meshes
 * 
 * @example
 * const debugBarriers = createDebugVisualBarriers(
 *   { THREE },
 *   scene,
 *   300,
 *   200
 * );
 */
export function createDebugVisualBarriers(deps, scene, width, height) {
  const { THREE } = deps;
  if (!THREE) {
    throw new Error("THREE library not available");
  }
  
  const stripWidth = 20;
  const debugBarriers = [];
  
  // Top barrier - Red
  const topGeom = new THREE.PlaneGeometry(width * 2, stripWidth);
  const topMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide,
    depthTest: false
  });
  const topMesh = new THREE.Mesh(topGeom, topMat);
  topMesh.position.set(0, height - stripWidth / 2, 1);
  topMesh.renderOrder = 1;
  scene.add(topMesh);
  debugBarriers.push(topMesh);
  
  // Bottom barrier - Blue
  const bottomGeom = new THREE.PlaneGeometry(width * 2, stripWidth);
  const bottomMat = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    side: THREE.DoubleSide,
    depthTest: false
  });
  const bottomMesh = new THREE.Mesh(bottomGeom, bottomMat);
  bottomMesh.position.set(0, -height + stripWidth / 2, 1);
  bottomMesh.renderOrder = 1;
  scene.add(bottomMesh);
  debugBarriers.push(bottomMesh);
  
  // Right barrier - Green
  const rightGeom = new THREE.PlaneGeometry(stripWidth, height * 2);
  const rightMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,
    depthTest: false
  });
  const rightMesh = new THREE.Mesh(rightGeom, rightMat);
  rightMesh.position.set(width - stripWidth / 2, 0, 1);
  rightMesh.renderOrder = 2;
  scene.add(rightMesh);
  debugBarriers.push(rightMesh);
  
  // Left barrier - Yellow
  const leftGeom = new THREE.PlaneGeometry(stripWidth, height * 2);
  const leftMat = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    side: THREE.DoubleSide,
    depthTest: false
  });
  const leftMesh = new THREE.Mesh(leftGeom, leftMat);
  leftMesh.position.set(-width + stripWidth / 2, 0, 1);
  leftMesh.renderOrder = 2;
  scene.add(leftMesh);
  debugBarriers.push(leftMesh);
  
  return debugBarriers;
}

/**
 * Clears all dynamic meshes from a scene.
 * Keeps ground, lights, and camera.
 * 
 * @param {THREE.Scene} scene - Target scene
 * @param {Array<THREE.Mesh>} [excludeMeshes=[]] - Meshes to keep
 * @returns {number} Number of meshes removed
 * 
 * @example
 * const removed = clearSceneMeshes(scene, [groundMesh]);
 */
export function clearSceneMeshes(scene, excludeMeshes = []) {
  let removed = 0;
  const meshesToRemove = [];
  
  scene.traverse((obj) => {
    if (obj.isMesh && !excludeMeshes.includes(obj)) {
      meshesToRemove.push(obj);
    }
  });
  
  meshesToRemove.forEach((mesh) => {
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    scene.remove(mesh);
    removed++;
  });
  
  return removed;
}

/**
 * Renders scene to display.
 * 
 * @param {THREE.WebGLRenderer} renderer - Renderer
 * @param {THREE.Scene} scene - Scene to render
 * @param {THREE.Camera} camera - Camera
 * 
 * @example
 * renderScene(renderer, scene, camera);
 */
export function renderScene(renderer, scene, camera) {
  if (!renderer || !renderer.render) {
    throw new Error("Invalid renderer");
  }
  
  renderer.render(scene, camera);
}
