/**
 * @fileoverview Adapter for Three.js rendering operations with dependency injection.
 * Encapsulates 3D scene, camera, and renderer creation for testability.
 */

/**
 * Creates Three.js adapter factory with injected THREE library.
 * Enables testing by allowing THREE mock injection.
 * 
 * @param {Object} deps - Dependency injection object
 * @param {THREE} deps.THREE - Three.js library
 * @returns {Object} Adapter with Three.js functions
 * 
 * @example
 * const adapter = createThreeAdapter({ THREE: window.THREE });
 * const scene = adapter.createScene();
 */
export function createThreeAdapter({ THREE }) {
  return {
    /**
     * Creates Three.js scene.
     * 
     * @returns {THREE.Scene} New scene
     */
    createScene() {
      if (!THREE || !THREE.Scene) {
        throw new Error("THREE library not available");
      }
      return new THREE.Scene();
    },

    /**
     * Creates perspective camera.
     * 
     * @param {Object} config - Camera configuration
     * @param {number} config.fov - Field of view in degrees (default 20)
     * @param {number} config.aspect - Aspect ratio width/height
     * @param {number} config.near - Near clipping plane
     * @param {number} config.far - Far clipping plane
     * @returns {THREE.PerspectiveCamera} Camera
     */
    createCamera(config) {
      if (!THREE || !THREE.PerspectiveCamera) {
        throw new Error("THREE library not available");
      }
      
      return new THREE.PerspectiveCamera(
        config.fov || 20,
        config.aspect || 1.0,
        config.near || 1,
        config.far || 10000
      );
    },

    /**
     * Creates WebGL renderer.
     * 
     * @param {Object} config - Renderer configuration
     * @param {boolean} config.antialias - Enable antialiasing
     * @param {number} config.width - Renderer width
     * @param {number} config.height - Renderer height
     * @returns {THREE.WebGLRenderer|THREE.CanvasRenderer} Renderer
     */
    createRenderer(config = {}) {
      if (!THREE) {
        throw new Error("THREE library not available");
      }
      
      const useWebGL = typeof THREE.WebGLRenderer !== 'undefined';
      const RendererClass = useWebGL ? THREE.WebGLRenderer : THREE.CanvasRenderer;
      
      if (!RendererClass) {
        throw new Error("No valid THREE renderer available");
      }
      
      const renderer = new RendererClass({
        antialias: config.antialias !== false
      });
      
      if (config.width && config.height) {
        renderer.setSize(config.width, config.height);
      }
      
      renderer.setClearColor(0xffffff, 1);
      
      return renderer;
    },

    /**
     * Configures renderer for shadow mapping.
     * 
     * @param {THREE.Renderer} renderer - Target renderer
     * @param {Object} config - Shadow configuration
     * @param {boolean} config.enabled - Enable shadows
     * @param {string} config.type - Shadow map type (e.g., "PCFShadowMap")
     */
    configureShadows(renderer, config = {}) {
      if (config.enabled && renderer.shadowMap) {
        renderer.shadowMap.enabled = true;
        
        if (config.type && THREE && THREE[config.type + 'ShadowMap']) {
          renderer.shadowMap.type = THREE[config.type + 'ShadowMap'];
        }
      }
    },

    /**
     * Creates ambient light.
     * 
     * @param {number} color - Light color as hex (0xffffff)
     * @param {number} [intensity=1.0] - Light intensity
     * @returns {THREE.AmbientLight} Ambient light
     */
    createAmbientLight(color, intensity = 1.0) {
      if (!THREE || !THREE.AmbientLight) {
        throw new Error("THREE library not available");
      }
      
      return new THREE.AmbientLight(color, intensity);
    },

    /**
     * Creates spot light.
     * 
     * @param {number} color - Light color as hex
     * @param {number} intensity - Light intensity
     * @param {Object} config - Additional configuration
     * @returns {THREE.SpotLight} Spot light
     */
    createSpotLight(color, intensity, config = {}) {
      if (!THREE || !THREE.SpotLight) {
        throw new Error("THREE library not available");
      }
      
      const light = new THREE.SpotLight(color, intensity);
      
      if (config.position) {
        light.position.set(config.position.x, config.position.y, config.position.z);
      }
      
      if (config.target) {
        light.target.position.set(config.target.x, config.target.y, config.target.z);
      }
      
      if (config.distance) light.distance = config.distance;
      if (config.angle) light.angle = config.angle;
      if (config.penumbra !== undefined) light.penumbra = config.penumbra;
      if (config.decay !== undefined) light.decay = config.decay;
      
      return light;
    },

    /**
     * Configures light for shadow casting.
     * 
     * @param {THREE.Light} light - Target light
     * @param {Object} config - Shadow configuration
     * @param {number} config.mapSize - Shadow map resolution
     * @param {number} config.near - Shadow camera near
     * @param {number} config.far - Shadow camera far
     * @param {number} config.bias - Shadow bias
     */
    configureLightShadows(light, config = {}) {
      if (light.castShadow !== undefined) {
        light.castShadow = true;
      }
      
      if (light.shadow) {
        if (config.mapSize) {
          light.shadow.mapSize.width = config.mapSize;
          light.shadow.mapSize.height = config.mapSize;
        }
        
        if (config.near) light.shadow.camera.near = config.near;
        if (config.far) light.shadow.camera.far = config.far;
        if (config.bias) light.shadow.bias = config.bias;
        if (config.fov) light.shadow.camera.fov = config.fov;
      }
    },

    /**
     * Creates plane geometry (for ground/barriers).
     * 
     * @param {number} width - Plane width
     * @param {number} height - Plane height
     * @param {number} [widthSegments=1] - Width divisions
     * @param {number} [heightSegments=1] - Height divisions
     * @returns {THREE.PlaneGeometry} Plane geometry
     */
    createPlaneGeometry(width, height, widthSegments = 1, heightSegments = 1) {
      if (!THREE || !THREE.PlaneGeometry) {
        throw new Error("THREE library not available");
      }
      
      return new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
    },

    /**
     * Creates material.
     * 
     * @param {Object} config - Material configuration
     * @param {string} config.type - Material type ("MeshPhong", "MeshBasic", etc.)
     * @param {number} config.color - Color as hex
     * @param {number} [config.shininess] - Shininess for phong
     * @param {number} [config.emissive] - Emissive color
     * @returns {THREE.Material} Material
     */
    createMaterial(config) {
      if (!THREE) {
        throw new Error("THREE library not available");
      }
      
      const typeKey = config.type + 'Material';
      if (!THREE[typeKey]) {
        throw new Error(`Material type ${config.type} not available in THREE`);
      }
      
      return new THREE[typeKey]({
        color: config.color,
        shininess: config.shininess,
        emissive: config.emissive,
        side: config.side,
        depthTest: config.depthTest
      });
    },

    /**
     * Creates mesh from geometry and material(s).
     * 
     * @param {THREE.Geometry|THREE.BufferGeometry} geometry - Mesh geometry
     * @param {THREE.Material|Array<THREE.Material>} material - Material(s)
     * @returns {THREE.Mesh} Mesh
     */
    createMesh(geometry, material) {
      if (!THREE || !THREE.Mesh) {
        throw new Error("THREE library not available");
      }
      
      return new THREE.Mesh(geometry, material);
    },

    /**
     * Configures mesh for shadows.
     * 
     * @param {THREE.Mesh} mesh - Target mesh
     * @param {Object} config - Shadow configuration
     * @param {boolean} config.castShadow - Casts shadows
     * @param {boolean} config.receiveShadow - Receives shadows
     */
    configureMeshShadows(mesh, config = {}) {
      if (config.castShadow !== undefined) {
        mesh.castShadow = config.castShadow;
      }
      if (config.receiveShadow !== undefined) {
        mesh.receiveShadow = config.receiveShadow;
      }
    }
  };
}

/**
 * Creates a THREE.Vector3 with injected library.
 * 
 * @param {Object} deps - {THREE}
 * @param {Object} vec - Vector {x, y, z}
 * @returns {THREE.Vector3} THREE vector
 */
export function createThreeVector({ THREE }, vec) {
  if (!THREE || !THREE.Vector3) {
    throw new Error("THREE library not available");
  }
  
  return new THREE.Vector3(vec.x, vec.y, vec.z);
}

/**
 * Creates a THREE.Quaternion with injected library.
 * 
 * @param {Object} deps - {THREE}
 * @param {Object} quat - Quaternion {x, y, z, w}
 * @returns {THREE.Quaternion} THREE quaternion
 */
export function createThreeQuaternion({ THREE }, quat) {
  if (!THREE || !THREE.Quaternion) {
    throw new Error("THREE library not available");
  }
  
  return new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
}
