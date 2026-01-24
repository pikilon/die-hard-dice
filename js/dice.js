import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createTextTexture } from './modules/createTextTexture.js';
import { getContrastTextColor } from './modules/notationUtils.js';

// ============================================================================
// DICE MODULE IMPORTS
// ============================================================================
import {
  // Common utilities
  materialOptions,
  calcTextureSize,
  labelColor as commonLabelColor,
  diceColor as commonDiceColor,
  // Dice modules
  createD2 as createCoin,
  createD2Geometry as createCoinGeometry,
  createD2Materials as createCoinMaterials,
  createD4Geometry,
  createD4Materials,
  d4Labels,
  createD6Geometry,
  createD8Geometry,
  createD10Geometry,
  getD10Geometry,
  createD12Geometry,
  createD20Geometry,
  // Configuration
  knownTypes,
  diceFaceRange,
  diceMass,
  diceInertia,
} from './dice/index.js';

// Create local aliases and re-export for backward compatibility
const known_types = knownTypes;
const dice_face_range = diceFaceRange;
const dice_mass = diceMass;
const dice_inertia = diceInertia;

export { known_types, dice_face_range, dice_mass, dice_inertia };
export { d4Labels as d4_labels };

// Re-export geometry functions for backward compatibility
export { createCoinGeometry as create_coin_geometry };
export { createD4Geometry as create_d4_geometry };
export { createD6Geometry as create_d6_geometry };
export { createD8Geometry as create_d8_geometry };
export { createD10Geometry as create_d10_geometry };
export { createD12Geometry as create_d12_geometry };
export { createD20Geometry as create_d20_geometry };

// ============================================================================
// MODULE VARIABLES
// ============================================================================

/** @type {Array} Storage for true random numbers */
let random_storage = [];

/** @type {boolean} Whether to use true random numbers from server */
export let use_true_random = true;

/** @type {number} Physics simulation frame rate */
export const frame_rate = 1 / 60;

// ============================================================================
// SETTER FUNCTIONS FOR MUTABLE MODULE VARIABLES
// ============================================================================

/**
 * Sets whether to use true random numbers.
 * @param {boolean} value - The new value.
 */
export function setUseTrueRandom(value) {
  use_true_random = value;
}

// ============================================================================
// PRIVATE HELPER FUNCTIONS
// ============================================================================

/**
 * Prepares random number storage by fetching true random numbers from server.
 * Falls back to Math.random() if server is unavailable.
 * @param {Function} callback - Function to call when random numbers are ready.
 */
function prepare_rnd(callback) {
  if (!random_storage.length && use_true_random) {
    try {
      const ajax = new XMLHttpRequest();
      ajax.open("post", "f", true);
      ajax.onreadystatechange = function () {
        if (ajax.readyState == 4) {
          const random_responce = JSON.parse(ajax.responseText);
          if (!random_responce.error)
            random_storage = random_responce.result.random.data;
          else use_true_random = false;
          callback();
        }
      };
      ajax.send(JSON.stringify({ method: "random", n: 512 }));
      return;
    } catch (e) {
      use_true_random = false;
    }
  }
  callback();
}

/**
 * Returns a random number, using true random if available.
 * @returns {number} A random number between 0 and 1.
 */
function rnd() {
  return random_storage.length ? random_storage.pop() : Math.random();
}

// ============================================================================
// MODULE CONFIGURATION
// ============================================================================

/** @type {Array<string>} Standard d20 face labels (0-20) */
export const standart_d20_dice_face_labels = [
  " ", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
];


/**
 * Generates default face labels for a dice with n sides.
 * @param {number} n - Number of sides.
 * @param {number} [startFrom=1] - Starting number (default 1, use 0 for d10).
 * @returns {Array<string>} Array of face labels.
 */
export function generateDefaultLabels(n, startFrom = 1, leadingSpaces = 1) {
  const labels = Array(leadingSpaces).fill(" ");
  for (let i = 0; i < n; i++) {
    labels.push(String(startFrom + i));
  }
  return labels;
}

/**
 * Converts a sides array to face labels format.
 * Note: Geometry adds +1 to materialIndex, so offset varies by dice type:
 * - d6, d8, d12, d20: face definitions start at materialIndex 1 → need 2 leading spaces
 * - d10: face definitions start at materialIndex 0 → need 1 leading space
 * @param {Array<string>} sides - Array of side strings.
 * @param {number} [offset=2] - Number of leading spaces (2 for d6/d8/d12/d20, 1 for d10).
 * @returns {Array<string>} Array of face labels.
 */
export function sidesToFaceLabels(sides, offset = 2) {
  const leading = Array(offset).fill(" ");
  return [...leading, ...sides];
}

/** @type {Object} Default material options for dice */
export const material_options = materialOptions;

/** @type {string} Color for dice face labels */
export let label_color = "#aaaaaa";

/** @type {string} Background color for dice faces */
export let dice_color = "#202020";

/**
 * Calculates the nearest power of 2 texture size.
 * @param {number} approx - Approximate desired size.
 * @returns {number} The nearest power of 2.
 */
function calc_texture_size(approx) {
  return calcTextureSize(approx);
}

// ============================================================================
// EXPORTED MATERIAL FUNCTIONS
// ============================================================================

/**
 * Creates materials with face number textures for standard dice.
 * @param {Array<string>} face_labels - Array of labels for each face.
 * @param {number} size - Base size for texture calculations.
 * @param {number} margin - Margin around the text.
 * @param {string} [backgroundColor] - Optional background color in hex format (e.g., '#ff0000'). Defaults to dice_color.
 * @returns {Array<THREE.MeshPhongMaterial>} Array of materials for each face.
 */
export function create_dice_materials(face_labels, size, margin, backgroundColor) {
  const materials = [];
  const bgColor = backgroundColor || dice_color;
  const textColor = getContrastTextColor(bgColor);
  const createTextTextureFace = (text) => createTextTexture(text, textColor, bgColor, size, margin);
  for (let i = 0; i < face_labels.length; ++i) {
    const texture = createTextTextureFace(face_labels[i]);
    materials.push(
      new THREE.MeshPhongMaterial(
        Object.assign({}, material_options, {
          map: texture,
          transparent: false,
          opacity: 1.0,
        })
      )
    );
  }
  return materials;
}

/**
 * Creates materials with face number textures for d4 dice.
 * D4 has special triangular face layout with rotated numbers.
 * @param {number} size - Base size for texture calculations.
 * @param {number} margin - Margin around the text.
 * @param {Array} labels - Array of label arrays for each face.
 * @returns {Array<THREE.MeshPhongMaterial>} Array of materials for each face.
 */
export function create_d4_materials(size, margin, labels) {
  return createD4Materials(size, margin, labels);
}

// ============================================================================
// MORE MODULE CONFIGURATION
// ============================================================================

/** @type {number} Ambient light color */
export const ambient_light_color = 0xf0f5fb;

/** @type {number} Spot light color */
export const spot_light_color = 0xefdfd5;

/** @type {Object} Material options for selector background */
export const selector_back_colors = {
  color: 0x404040,
  shininess: 0,
  emissive: 0x858787,
};

/** @type {number} Desk/table color */
export const desk_color = 0xdfdfdf;

/** @type {boolean} Whether to render shadows */
export let use_shadows = true;

/** @type {number} Multiplier for dice size on mobile devices */
export const DICE_SIZE_MULTIPLIER_MOBILE = 3;

/** @type {number} Multiplier for dice size on desktop devices */
export const DICE_SIZE_MULTIPLIER_DESKTOP = 1;

/** 
 * Returns the appropriate dice size multiplier based on device type.
 * @returns {number} The size multiplier (3 for mobile, 1 for desktop).
 */
export function getDiceSizeMultiplier() {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  return isMobile ? DICE_SIZE_MULTIPLIER_MOBILE : DICE_SIZE_MULTIPLIER_DESKTOP;
}

/** @type {number} Scale factor for dice sizing */
export let scale = 50;

// ============================================================================
// HELPER FUNCTIONS FOR COLORED DICE
// ============================================================================

/**
 * Creates materials for a dice type with a specific color.
 * @param {string} type - The dice type (e.g., 'd6', 'd20').
 * @param {Array<string>} [sides] - Optional custom sides array.
 * @param {string} [color] - Optional background color in hex format.
 * @returns {Array<THREE.MeshPhongMaterial>} The materials array.
 * @private
 */
function createMaterialsForDiceType(type, sides, color) {
  // Helper to calculate text color based on background luminance
  const getTextColorForBg = (hex) => {
    if (!hex || typeof hex !== 'string') return label_color;
    const h = hex.replace('#', '').toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(h)) return label_color;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const bgColor = color || dice_color;
  const textColor = getTextColorForBg(bgColor);

  switch (type) {
    case 'coin':
      return createCoinMaterials(scale / 2, scale * 2, sides, bgColor);
    case 'd4':
      return createD4Materials(scale / 2, 1.5, d4Labels, bgColor);
    case 'd6':
      // d6 faces use materialIndex values 1..6 which become 2..7 in geometry
      // so we need two leading spaces in the label array
      const d6Labels = sides ? sidesToFaceLabels(sides) : generateDefaultLabels(6, 1, 2);
      return create_dice_materials(d6Labels, scale / 2, 1.2, bgColor);
    case 'd8':
      // d8 also requires two leading spaces for correct material indices
      const d8Labels = sides ? sidesToFaceLabels(sides) : generateDefaultLabels(8, 1, 2);
      return create_dice_materials(d8Labels, scale / 2, 1.2, bgColor);
    case 'd10':
      // d10 uses materialIndex 0..9 in geometry, so only one leading space
      const d10Labels = sides ? sidesToFaceLabels(sides, 1) : generateDefaultLabels(10, 0, 1);
      return create_dice_materials(d10Labels, scale / 2, 1.0, bgColor);
    case 'd12':
      // d12 requires two leading spaces
      const d12Labels = sides ? sidesToFaceLabels(sides) : generateDefaultLabels(12, 1, 2);
      return create_dice_materials(d12Labels, scale / 2, 1.0, bgColor);
    case 'd20':
      // d20 requires two leading spaces; for default use generated labels
      const d20Labels = sides ? sidesToFaceLabels(sides) : generateDefaultLabels(20, 1, 2);
      return create_dice_materials(d20Labels, scale / 2, 1.0, bgColor);
    default:
      return [];
  }
}

// Cached geometry and materials
let coin_geometry_cache = null;
let coin_material_cache = null;
let d4_geometry_cache = null;
let d6_geometry_cache = null;
let d8_geometry_cache = null;
let d10_geometry_cache = null;
let d12_geometry_cache = null;
let d20_geometry_cache = null;
let d4_material_cache = null;
let dice_material_cache = null;

// ============================================================================
// EXPORTED DICE FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a d4 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @param {Array<string>} [sides] - Optional custom sides array.
 * @returns {THREE.Mesh} The d4 die mesh.
 */
export function create_d4(sides) {
  if (!d4_geometry_cache)
    d4_geometry_cache = createD4Geometry(scale * 1.2);
  
  let materials;
  if (sides && sides.length === 4) {
    const customLabels = [
      [[], [0, 0, 0], [sides[1], sides[3], sides[2]], [sides[0], sides[2], sides[3]], [sides[1], sides[0], sides[3]], [sides[0], sides[1], sides[2]]],
      [[], [0, 0, 0], [sides[1], sides[2], sides[3]], [sides[2], sides[0], sides[3]], [sides[1], sides[3], sides[0]], [sides[2], sides[1], sides[0]]],
      [[], [0, 0, 0], [sides[3], sides[2], sides[1]], [sides[2], sides[3], sides[0]], [sides[3], sides[1], sides[0]], [sides[2], sides[0], sides[1]]],
      [[], [0, 0, 0], [sides[3], sides[1], sides[2]], [sides[0], sides[3], sides[2]], [sides[3], sides[0], sides[1]], [sides[0], sides[2], sides[1]]],
    ];
    materials = createD4Materials(scale / 2, scale * 2, customLabels[0]);
  } else {
    if (!d4_material_cache)
      d4_material_cache = createD4Materials(scale / 2, scale * 2, d4Labels[0]);
    materials = d4_material_cache;
  }
  return new THREE.Mesh(d4_geometry_cache, materials);
}

/**
 * Creates a d6 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @param {Array<string>} [sides] - Optional custom sides array.
 * @returns {THREE.Mesh} The d6 die mesh.
 */
export function create_d6(sides) {
  if (!d6_geometry_cache)
    d6_geometry_cache = createD6Geometry(scale * 0.9);
  
  let materials;
  if (sides && Array.isArray(sides) && sides.length === 6) {
    // Create custom materials for non-standard sides
    const faceLabels = sidesToFaceLabels(sides);
    materials = create_dice_materials(faceLabels, scale / 2, 1.5);
  } else {
    if (!dice_material_cache)
      dice_material_cache = create_dice_materials(standart_d20_dice_face_labels, scale / 2, 1.0);
    materials = dice_material_cache;
  }
  return new THREE.Mesh(d6_geometry_cache, materials);
}

/**
 * Creates a d8 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @param {Array<string>} [sides] - Optional custom sides array.
 * @returns {THREE.Mesh} The d8 die mesh.
 */
export function create_d8(sides) {
  if (!d8_geometry_cache)
    d8_geometry_cache = createD8Geometry(scale);
  
  let materials;
  if (sides && sides.length === 8) {
    materials = create_dice_materials(sidesToFaceLabels(sides), scale / 2, 1.2);
  } else {
    if (!dice_material_cache)
      dice_material_cache = create_dice_materials(standart_d20_dice_face_labels, scale / 2, 1.2);
    materials = dice_material_cache;
  }
  return new THREE.Mesh(d8_geometry_cache, materials);
}

/**
 * Creates a d10 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @param {Array<string>} [sides] - Optional custom sides array.
 * @returns {THREE.Mesh} The d10 die mesh.
 */
export function create_d10(sides) {
  if (!d10_geometry_cache)
    d10_geometry_cache = createD10Geometry(scale * 0.9);
  
  let materials;
  if (sides && Array.isArray(sides) && sides.length === 10) {
    // d10 uses materialIndex 0-9, so needs offset=1
    materials = create_dice_materials(sidesToFaceLabels(sides, 1), scale / 2, 1.0);
  } else {
    if (!dice_material_cache)
      dice_material_cache = create_dice_materials(standart_d20_dice_face_labels, scale / 2, 1.0);
    materials = dice_material_cache;
  }
  return new THREE.Mesh(d10_geometry_cache, materials);
}

/**
 * Creates a d12 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @param {Array<string>} [sides] - Optional custom sides array.
 * @returns {THREE.Mesh} The d12 die mesh.
 */
export function create_d12(sides) {
  if (!d12_geometry_cache)
    d12_geometry_cache = createD12Geometry(scale * 0.9);
  
  let materials;
  if (sides && sides.length === 12) {
    materials = create_dice_materials(sidesToFaceLabels(sides), scale / 2, 1.0);
  } else {
    if (!dice_material_cache)
      dice_material_cache = create_dice_materials(standart_d20_dice_face_labels, scale / 2, 1.0);
    materials = dice_material_cache;
  }
  return new THREE.Mesh(d12_geometry_cache, materials);
}

/**
 * Creates a d20 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @param {Array<string>} [sides] - Optional custom sides array.
 * @returns {THREE.Mesh} The d20 die mesh.
 */
export function create_d20(sides) {
  if (!d20_geometry_cache)
    d20_geometry_cache = createD20Geometry(scale);
  
  let materials;
  if (sides && sides.length === 20) {
    materials = create_dice_materials(sidesToFaceLabels(sides), scale / 2, 1.0);
  } else {
    if (!dice_material_cache)
      dice_material_cache = create_dice_materials(standart_d20_dice_face_labels, scale / 2, 1.0);
    materials = dice_material_cache;
  }
  return new THREE.Mesh(d20_geometry_cache, materials);
}


/**
 * Dice factory lookup map for creating dice by type string.
 * @type {Object<string, Function>}
 */
/**
 * Creates a coin die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @param {Array<string>} [sides] - Optional custom sides array [top, bottom].
 * @returns {THREE.Mesh} The coin die mesh.
 */
export function create_coin(sides) {
  if (!coin_geometry_cache)
    coin_geometry_cache = createCoinGeometry(scale);
  
  let materials;
  if (sides && Array.isArray(sides) && sides.length === 2) {
    // Create fresh materials with custom sides
    materials = createCoinMaterials(scale / 2, scale * 2, sides);
  } else {
    if (!coin_material_cache)
      coin_material_cache = createCoinMaterials(scale / 2, scale * 2);
    materials = coin_material_cache;
  }
  return new THREE.Mesh(coin_geometry_cache, materials);
}

export const dice_factories = {
  coin: create_coin,
  d4: create_d4,
  d6: create_d6,
  d8: create_d8,
  d10: create_d10,
  d12: create_d12,
  d20: create_d20,
};

/**
 * Creates a die mesh by type string.
 * @param {string} type - The die type (e.g., 'd4', 'd6', 'd20').
 * @param {Array<string>} [sides] - Optional custom sides array.
 * @returns {THREE.Mesh} The die mesh.
 */
export function createDiceByType(type, sides) {
  const factory = dice_factories[type];
  if (!factory) throw new Error(`Unknown dice type: ${type}`);
  return factory(sides);
}

// ============================================================================
// EXPORTED NOTATION FUNCTIONS
// ============================================================================

/**
 * Parses a dice notation string into a structured object.
 * Supports format like "2d6+3" or "1d20@15" (with predetermined result).
 * @param {string} notation - The dice notation string.
 * @returns {Object} Parsed notation with set, constant, result, and error properties.
 */
export function parse_notation(notation) {
  const no = notation.split("@");
  const dr0 = /\s*(\d*)([a-z]+)(\d+)(\s*(\+|\-)\s*(\d+)){0,1}\s*(\+|$)/gi;
  const dr1 = /(\b)*(\d+)(\b)*/gi;
  const ret = { set: [], constant: 0, result: [], error: false };
  let res;
  while ((res = dr0.exec(no[0]))) {
    const command = res[2];
    if (command != "d") {
      ret.error = true;
      continue;
    }
    let count = parseInt(res[1]);
    if (res[1] == "") count = 1;
    const type = "d" + res[3];
    if (known_types.indexOf(type) == -1) {
      ret.error = true;
      continue;
    }
    while (count--) ret.set.push(type);
    if (res[5] && res[6]) {
      if (res[5] == "+") ret.constant += parseInt(res[6]);
      else ret.constant -= parseInt(res[6]);
    }
  }
  while ((res = dr1.exec(no[1]))) {
    ret.result.push(parseInt(res[2]));
  }
  return ret;
}

/**
 * Converts a parsed notation object back to a string representation.
 * @param {Object} nn - The parsed notation object.
 * @returns {string} The dice notation string.
 */
export function stringify_notation(nn) {
  const dict = {};
  let notation = "";
  for (const i in nn.set)
    if (!dict[nn.set[i]]) dict[nn.set[i]] = 1;
    else ++dict[nn.set[i]];
  for (const i in dict) {
    if (notation.length) notation += " + ";
    notation += (dict[i] > 1 ? dict[i] : "") + i;
  }
  if (nn.constant) {
    if (nn.constant > 0) notation += " + " + nn.constant;
    else notation += " - " + Math.abs(nn.constant);
  }
  return notation;
}

// ============================================================================
// DICE BOX HELPER FUNCTIONS
// ============================================================================

/**
 * Creates and configures the WebGL renderer for the dice box.
 * Sets up shadow mapping and clear color.
 * @param {HTMLElement} container - The DOM element to append the renderer to.
 * @returns {THREE.WebGLRenderer|THREE.CanvasRenderer} The configured renderer.
 */
function createRenderer(container) {
  const renderer = WebGLRenderingContext
    ? new THREE.WebGLRenderer({ antialias: true })
    : new THREE.CanvasRenderer({ antialias: true });
  container.appendChild(renderer.domElement);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0xffffff, 1);
  return renderer;
}

/**
 * Initializes the physics world with gravity and broadphase settings.
 * @returns {CANNON.World} The configured physics world.
 */
function createPhysicsWorld() {
  const world = new CANNON.World();
  world.gravity.set(0, 0, -9.8 * 800);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 16;
  return world;
}

/**
 * Adds ambient lighting to the scene.
 * @param {THREE.Scene} scene - The Three.js scene.
 */
function addAmbientLight(scene) {
  const ambientLight = new THREE.AmbientLight(ambient_light_color);
  scene.add(ambientLight);
}

/**
 * Creates physics materials and sets up contact materials for dice interactions.
 * @param {CANNON.World} world - The physics world.
 * @param {CANNON.Material} dice_body_material - The dice body material.
 * @returns {Object} Object containing desk and barrier materials.
 */
function createContactMaterials(world, dice_body_material) {
  const desk_body_material = new CANNON.Material();
  const barrier_body_material = new CANNON.Material();

  world.addContactMaterial(
    new CANNON.ContactMaterial(
      desk_body_material,
      dice_body_material,
      { friction: 0.01, restitution: 0.5 }
    )
  );
  world.addContactMaterial(
    new CANNON.ContactMaterial(
      barrier_body_material,
      dice_body_material,
      { friction: 0, restitution: 1.0 }
    )
  );
  world.addContactMaterial(
    new CANNON.ContactMaterial(
      dice_body_material,
      dice_body_material,
      { friction: 0, restitution: 0.5 }
    )
  );

  return {
    desk: desk_body_material,
    barrier: barrier_body_material
  };
}

/**
 * Creates the ground plane for the dice to roll on.
 * @param {CANNON.World} world - The physics world.
 * @param {CANNON.Material} desk_material - The desk body material.
 */
function createGround(world, desk_material) {
  const groundBody = new CANNON.Body({ mass: 0, material: desk_material });
  groundBody.addShape(new CANNON.Plane());
  world.addBody(groundBody);
}

/**
 * Creates a single barrier wall in the physics world.
 * @param {CANNON.World} world - The physics world.
 * @param {CANNON.Material} barrier_material - The barrier body material.
 * @param {CANNON.Vec3} axis - The rotation axis.
 * @param {number} angle - The rotation angle in radians.
 * @param {Object} position - The barrier position {x, y, z}.
 */
function createBarrier(world, barrier_material, axis, angle, position) {
  const barrier = new CANNON.Body({ mass: 0, material: barrier_material });
  barrier.addShape(new CANNON.Plane());
  barrier.quaternion.setFromAxisAngle(axis, angle);
  barrier.position.set(position.x, position.y, position.z);
  world.addBody(barrier);
}

/**
 * Creates all four boundary walls (barriers) around the dice rolling area.
 * @param {CANNON.World} world - The physics world.
 * @param {CANNON.Material} barrier_material - The barrier body material.
 * @param {number} width - Half-width of the dice box.
 * @param {number} height - Half-height of the dice box.
 */
function createAllBarriers(world, barrier_material, width, height) {
  // Top barrier
  createBarrier(
    world, barrier_material,
    new CANNON.Vec3(1, 0, 0), Math.PI / 2,
    { x: 0, y: height * 0.85, z: 0 }
  );
  // Bottom barrier
  createBarrier(
    world, barrier_material,
    new CANNON.Vec3(1, 0, 0), -Math.PI / 2,
    { x: 0, y: -height * 0.85, z: 0 }
  );
  // Right barrier
  createBarrier(
    world, barrier_material,
    new CANNON.Vec3(0, 1, 0), -Math.PI / 2,
    { x: width * 0.85, y: 0, z: 0 }
  );
  // Left barrier
  createBarrier(
    world, barrier_material,
    new CANNON.Vec3(0, 1, 0), Math.PI / 2,
    { x: -width * 0.85, y: 0, z: 0 }
  );
}

// ============================================================================
// DICE BOX CLASS
// ============================================================================

/**
 * DiceBox Constructor - Creates a 3D dice rolling simulation environment.
 * Initializes the Three.js scene, Cannon.js physics world, renderer,
 * camera, lighting, and boundary barriers.
 * 
 * @constructor
 * @param {HTMLElement} container - The DOM element to contain the dice box.
 * @param {Object} [dimentions] - Optional custom dimensions.
 * @param {number} [dimentions.w] - Custom width.
 * @param {number} [dimentions.h] - Custom height.
 */
export function DiceBox(container, dimentions) {
  this.use_adapvite_timestep = true;
  this.animate_selector = true;
  this.dices = [];

  // Initialize Three.js scene
  this.scene = new THREE.Scene();

  // Initialize physics world
  this.world = createPhysicsWorld();

  // Setup renderer
  this.renderer = createRenderer(container);

  // Initialize dimensions and camera
  this.reinit(container, dimentions);

  // Add lighting
  addAmbientLight(this.scene);

  // Setup physics materials
  this.dice_body_material = new CANNON.Material();
  const materials = createContactMaterials(this.world, this.dice_body_material);

  // Create ground and barriers
  createGround(this.world, materials.desk);
  createAllBarriers(this.world, materials.barrier, this.w, this.h);

  // Initialize state
  this.last_time = 0;
  this.running = false;

  // Initial render
  this.renderer.render(this.scene, this.camera);
}

/**
 * Reinitializes the dice box dimensions, camera, lighting, and desk.
 * Called on initial setup and when the container is resized.
 * @param {HTMLElement} container - The DOM container element.
 * @param {Object} [dimentions] - Optional custom dimensions.
 * @param {number} [dimentions.w] - Custom width.
 * @param {number} [dimentions.h] - Custom height.
 */
DiceBox.prototype.reinit = function (container, dimentions) {
  this.cw = container.clientWidth / 2;
  this.ch = container.clientHeight / 2;
  if (dimentions) {
    this.w = dimentions.w;
    this.h = dimentions.h;
  } else {
    this.w = this.cw;
    this.h = this.ch;
  }
  this.aspect = Math.min(this.cw / this.w, this.ch / this.h);
  scale = Math.sqrt(this.w * this.w + this.h * this.h) / 13 * getDiceSizeMultiplier();

  this.renderer.setSize(this.cw * 2, this.ch * 2);

  this.wh = this.ch / this.aspect / Math.tan((10 * Math.PI) / 180);
  if (this.camera) this.scene.remove(this.camera);
  this.camera = new THREE.PerspectiveCamera(
    20,
    this.cw / this.ch,
    1,
    this.wh * 1.3
  );
  this.camera.position.z = this.wh;

  const mw = Math.max(this.w, this.h);
  if (this.light) this.scene.remove(this.light);
  this.light = new THREE.SpotLight(spot_light_color, 2.0);
  this.light.position.set(-mw / 2, mw / 2, mw * 2);
  this.light.target.position.set(0, 0, 0);
  this.light.distance = mw * 5;
  this.light.castShadow = true;
  this.light.shadow.camera.near = mw / 10;
  this.light.shadow.camera.far = mw * 5;
  this.light.shadow.camera.fov = 50;
  this.light.shadow.bias = 0.001;
  this.light.shadow.mapSize.width = 1024;
  this.light.shadow.mapSize.height = 1024;
  this.scene.add(this.light);

  if (this.desk) this.scene.remove(this.desk);
  this.desk = new THREE.Mesh(
    new THREE.PlaneGeometry(this.w * 2, this.h * 2, 1, 1),
    new THREE.MeshPhongMaterial({ color: desk_color })
  );
  this.desk.receiveShadow = use_shadows;
  this.scene.add(this.desk);

  this.renderer.render(this.scene, this.camera);
};

/**
 * Applies a random rotation to a direction vector.
 * @param {Object} vector - The input vector {x, y}.
 * @returns {Object} The rotated vector {x, y}.
 */
function make_random_vector(vector) {
  const random_angle = (rnd() * Math.PI) / 5 - Math.PI / 5 / 2;
  const vec = {
    x: vector.x * Math.cos(random_angle) - vector.y * Math.sin(random_angle),
    y: vector.x * Math.sin(random_angle) + vector.y * Math.cos(random_angle),
  };
  if (vec.x == 0) vec.x = 0.01;
  if (vec.y == 0) vec.y = 0.01;
  return vec;
}

/**
 * Generates initial position, velocity, and rotation vectors for each die.
 * @param {Object} notation - The dice notation object with set array.
 * @param {Object} vector - The throw direction vector {x, y}.
 * @param {number} boost - The throw force multiplier.
 * @returns {Array} Array of vector objects for each die.
 */
DiceBox.prototype.generate_vectors = function (notation, vector, boost) {
  const vectors = [];
  for (const i in notation.set) {
    const diceItem = notation.set[i];
    const diceType = typeof diceItem === 'string' ? diceItem : diceItem.type;
    const diceSides = typeof diceItem === 'object' ? diceItem.sides : null;
    const diceColor = typeof diceItem === 'object' ? diceItem.color : null;
    
    const vec = make_random_vector(vector);
    const pos = {
      x: this.w * (vec.x > 0 ? -1 : 1) * 0.7,
      y: this.h * (vec.y > 0 ? -1 : 1) * 0.7,
      z: rnd() * 200 + 200,
    };
    const projector = Math.abs(vec.x / vec.y);
    if (projector > 1.0) pos.y /= projector;
    else pos.x *= projector;
    const velvec = make_random_vector(vector);
    const velocity = { x: velvec.x * boost, y: velvec.y * boost, z: -10 };
    const inertia = dice_inertia[diceType];
    
    // Coins get extra flipping rotation for realistic coin flip
    const flipMultiplier = (diceType === 'coin') ? 6 : 1;
    const angle = {
      x: -(rnd() * vec.y * 5 + inertia * vec.y) * flipMultiplier + (diceType === 'coin' ? (rnd() * 30 + 20) : 0),
      y: (rnd() * vec.x * 5 + inertia * vec.x) * flipMultiplier + (diceType === 'coin' ? (rnd() * 30 + 20) : 0),
      z: (diceType === 'coin') ? (rnd() - 0.5) * 10 : 0,
    };
    const axis = { x: rnd(), y: rnd(), z: rnd(), a: rnd() };
    vectors.push({
      set: diceType,
      sides: diceSides,
      color: diceColor,
      pos: pos,
      velocity: velocity,
      angle: angle,
      axis: axis,
    });
  }
  return vectors;
};

  /**
   * Creates a single die mesh with physics body and adds it to the scene.
   * @param {string} type - The die type (e.g., 'd4', 'd6', 'd20').
   * @param {Object} pos - Initial position {x, y, z}.
   * @param {Object} velocity - Initial velocity {x, y, z}.
   * @param {Object} angle - Initial angular velocity {x, y, z}.
   * @param {Object} axis - Rotation axis and angle {x, y, z, a}.
   * @param {Array<string>} [sides] - Optional custom sides array.
   * @param {string} [color] - Optional color in hex format (e.g., '#ff0000').
   */
DiceBox.prototype.create_dice = function (
    type,
    pos,
    velocity,
    angle,
    axis,
    sides,
    color
  ) {
    let dice = createDiceByType(type, sides);
    
    // If color is specified, we need to recreate the dice with new materials
    if (color && typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) {
      // Re-create with colored materials
      dice = this._createDiceWithColor(type, sides, color);
    }
    
    dice.castShadow = true;
    dice.dice_type = type;
    dice.dice_sides = sides;
    dice.body = new CANNON.Body({
      mass: dice_mass[type],
      material: this.dice_body_material
    });
    dice.body.addShape(dice.geometry.cannon_shape);
    dice.body.position.set(pos.x, pos.y, pos.z);
    dice.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(axis.x, axis.y, axis.z),
      axis.a * Math.PI * 2
    );
    dice.body.angularVelocity.set(angle.x, angle.y, angle.z);
    dice.body.velocity.set(velocity.x, velocity.y, velocity.z);
    dice.body.linearDamping = 0.1;
    dice.body.angularDamping = 0.1;
    dice.body.ccdSpeedThreshold = 100;
    dice.body.ccdIterations = 10;
    this.scene.add(dice);
    this.dices.push(dice);
    this.world.addBody(dice.body);
  };

  /**
   * Creates a dice with custom colored materials.
   * @private
   * @param {string} type - The die type.
   * @param {Array<string>} [sides] - Optional custom sides array.
   * @param {string} color - The background color in hex format.
   * @returns {THREE.Mesh} The colored die mesh.
   */
DiceBox.prototype._createDiceWithColor = function (type, sides, color) {
    const diceFactory = dice_factories[type];
    if (!diceFactory) return null;
    
    // Create dice with standard geometry
    let geometry;
    switch (type) {
      case 'coin':
        geometry = createCoinGeometry(scale);
        break;
      case 'd4':
        geometry = createD4Geometry(scale);
        break;
      case 'd6':
        geometry = createD6Geometry(scale);
        break;
      case 'd8':
        geometry = createD8Geometry(scale);
        break;
      case 'd10':
        geometry = getD10Geometry(scale);
        break;
      case 'd12':
        geometry = createD12Geometry(scale);
        break;
      case 'd20':
        geometry = createD20Geometry(scale);
        break;
      default:
        return createDiceByType(type, sides);
    }
    
    const materials = createMaterialsForDiceType(type, sides, color);
    return new THREE.Mesh(geometry, materials);
  };

  /**
   * Checks if all dice have stopped moving.
   * @returns {boolean} True if all dice have settled, false otherwise.
   */
DiceBox.prototype.check_if_throw_finished = function () {
    var res = true;
    var e = 6;
    if (this.iteration < 10 / frame_rate) {
      for (var i = 0; i < this.dices.length; ++i) {
        var dice = this.dices[i];
        if (dice.dice_stopped === true) continue;
        var a = dice.body.angularVelocity,
          v = dice.body.velocity;
        if (
          Math.abs(a.x) < e &&
          Math.abs(a.y) < e &&
          Math.abs(a.z) < e &&
          Math.abs(v.x) < e &&
          Math.abs(v.y) < e &&
          Math.abs(v.z) < e
        ) {
          if (dice.dice_stopped) {
            if (this.iteration - dice.dice_stopped > 3) {
              dice.dice_stopped = true;
              continue;
            }
          } else dice.dice_stopped = this.iteration;
          res = false;
        } else {
          dice.dice_stopped = undefined;
          res = false;
        }
      }
    }
    return res;
  };

  /**
   * Determines the face-up value of a single die based on its orientation.
   * @private
   * @param {THREE.Mesh} dice - The die mesh object.
   * @returns {number|string} The value shown on the top face (string if custom sides, number otherwise).
   */
  function get_dice_value(dice) {
    // Special handling for coin - CylinderGeometry rotated to lie flat
    if (dice.dice_type === "coin") {
      // After rotation, the coin's caps face along the Z-axis
      // Check which cap is pointing up (positive Z in world space)
      var localZ = new THREE.Vector3(0, 0, 1);
      localZ.applyQuaternion(dice.body.quaternion);
      // If local Z points up (positive world Z), top cap (index 0) is showing
      // If local Z points down (negative world Z), bottom cap (index 1) is showing
      var faceIndex = localZ.z > 0 ? 0 : 1;
      // Return custom side value if defined, otherwise return 1 or 2
      if (dice.dice_sides && dice.dice_sides.length === 2) {
        return dice.dice_sides[faceIndex];
      }
      return faceIndex + 1;
    }
    
    var vector = new THREE.Vector3(
      0,
      0,
      dice.dice_type == "d4" ? -1 : 1
    );
    var closest_face = null,
      closest_angle = Math.PI * 2;
    var geom = dice.geometry;
    if (!geom || !geom.faces) return 1;
    for (var i = 0, l = geom.faces.length; i < l; ++i) {
      var face = geom.faces[i];
      if (!face || face.materialIndex == 0) continue;
      var angle = face.normal
        .clone()
        .applyQuaternion(dice.body.quaternion)
        .angleTo(vector);
      if (angle < closest_angle) {
        closest_angle = angle;
        closest_face = face;
      }
    }
    if (!closest_face) return 1;
    var matindex = closest_face.materialIndex - 1;
    
    // If custom sides are defined, return the actual side value
    if (dice.dice_sides && dice.dice_sides.length > 0) {
      // Determine expected face count for current geometry type
      var range = dice_face_range[dice.dice_type];
      var expectedCount = Array.isArray(range) ? range[1] : 20;
      var offset = (dice.dice_type === "d10") ? 1 : 2;
      var customIndex = closest_face.materialIndex - offset;

      if (dice.dice_sides.length > expectedCount) {
        // Select a random consecutive slice that matches the expected count
        var maxOffset = dice.dice_sides.length - expectedCount;
        var randomOffset = Math.floor(Math.random() * (maxOffset + 1));
        var slicedSides = dice.dice_sides.slice(randomOffset, randomOffset + expectedCount);
        if (customIndex >= 0 && customIndex < slicedSides.length) {
          return slicedSides[customIndex];
        }
      } else {
        if (customIndex >= 0 && customIndex < dice.dice_sides.length) {
          return dice.dice_sides[customIndex];
        }
      }
    }
    
    if (dice.dice_type == "d10" && matindex == 0) matindex = 10;
    return matindex;
  }

  /**
   * Gets the face-up values for all dice.
   * @private
   * @param {Array<THREE.Mesh>} dices - Array of die mesh objects.
   * @returns {Array<number>} Array of values for each die.
   */
  function get_dice_values(dices) {
    var values = [];
    for (var i = 0, l = dices.length; i < l; ++i) {
      values.push(get_dice_value(dices[i]));
    }
    return values;
  }

  /**
   * Runs the physics simulation until all dice have settled.
   * Used to pre-calculate results for deterministic throws.
   * @returns {Array<number>} Array of final dice values.
   */
DiceBox.prototype.emulate_throw = function () {
    while (!this.check_if_throw_finished()) {
      ++this.iteration;
      this.world.step(frame_rate);
    }
    return get_dice_values(this.dices);
  };

  /**
   * Main animation loop for dice rolling simulation.
   * Updates physics, syncs mesh positions, and renders the scene.
   * @private
   * @param {number} threadid - Unique identifier for this animation thread.
   */
DiceBox.prototype.__animate = function (threadid) {
    var time = new Date().getTime();
    var time_diff = (time - this.last_time) / 1000;
    if (time_diff > 3) time_diff = frame_rate;
    ++this.iteration;
    if (this.use_adapvite_timestep) {
      while (time_diff > frame_rate * 1.1) {
        this.world.step(frame_rate);
        time_diff -= frame_rate;
      }
      this.world.step(time_diff);
    } else {
      this.world.step(frame_rate);
    }
    for (var i in this.scene.children) {
      var interact = this.scene.children[i];
      if (interact.body != undefined) {
        interact.position.copy(interact.body.position);
        interact.quaternion.copy(interact.body.quaternion);
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.last_time = this.last_time ? time : new Date().getTime();
    if (this.running == threadid && this.check_if_throw_finished()) {
      this.running = false;
      if (this.callback) this.callback.call(this, get_dice_values(this.dices));
    }
    if (this.running == threadid) {
      (function (t, tid, uat) {
        if (!uat && time_diff < frame_rate) {
          setTimeout(function () {
            requestAnimationFrame(function () {
              t.__animate(tid);
            });
          }, (frame_rate - time_diff) * 1000);
        } else
          requestAnimationFrame(function () {
            t.__animate(tid);
          });
      })(this, threadid, this.use_adapvite_timestep);
    }
  };

  /**
   * Clears all dice from the scene and physics world.
   * Stops any running animation and re-renders the scene.
   */
DiceBox.prototype.clear = function () {
    this.running = false;
    var dice;
    while ((dice = this.dices.pop())) {
      this.scene.remove(dice);
      if (dice.body) this.world.removeBody(dice.body);
    }
    if (this.pane) this.scene.remove(this.pane);
    this.renderer.render(this.scene, this.camera);
    var box = this;
    setTimeout(function () {
      box.renderer.render(box.scene, box.camera);
    }, 100);
  };

  /**
   * Prepares dice for rolling by clearing existing dice and creating new ones.
   * @param {Array} vectors - Array of vector objects from generate_vectors().
   */
DiceBox.prototype.prepare_dices_for_roll = function (vectors) {
    this.clear();
    this.iteration = 0;
    for (var i in vectors) {
      this.create_dice(
        vectors[i].set,
        vectors[i].pos,
        vectors[i].velocity,
        vectors[i].angle,
        vectors[i].axis,
        vectors[i].sides,
        vectors[i].color
      );
    }
  };

  /**
   * Shifts dice face materials to achieve a predetermined result.
   * Used for deterministic dice rolling.
   * @private
   * @param {THREE.Mesh} dice - The die mesh object.
   * @param {number} value - The desired result value.
   * @param {number} res - The simulated result value.
   */
function shift_dice_faces(dice, value, res) {
  const r = dice_face_range[dice.dice_type];
  if (dice.dice_type == "d10" && value == 10) value = 0;
  if (dice.dice_type == "d10" && res == 10) res = 0;
  if (!(value >= r[0] && value <= r[1])) return;
  let num = value - res;
  const geom = dice.geometry.clone();
  for (let i = 0, l = geom.faces.length; i < l; ++i) {
    let matindex = geom.faces[i].materialIndex;
    if (matindex == 0) continue;
    matindex += num - 1;
    while (matindex > r[1]) matindex -= r[1];
    while (matindex < r[0]) matindex += r[1];
    geom.faces[i].materialIndex = matindex + 1;
  }
  if (dice.dice_type == "d4" && num != 0) {
    if (num < 0) num += 4;
    dice.material = createD4Materials(scale / 2, scale * 2, d4Labels[num]);
  }
  dice.geometry = geom;
}

  /**
   * Executes a dice roll animation.
   * @param {Array} vectors - Array of vector objects from generate_vectors().
   * @param {Array<number>} [values] - Optional predetermined results.
   * @param {Function} [callback] - Callback function called with results when roll completes.
   */
DiceBox.prototype.roll = function (vectors, values, callback) {
    this.prepare_dices_for_roll(vectors);
    if (values != undefined && values.length) {
      this.use_adapvite_timestep = false;
      var res = this.emulate_throw();
      this.prepare_dices_for_roll(vectors);
      for (var i in res) shift_dice_faces(this.dices[i], values[i], res[i]);
    }
    this.callback = callback;
    this.running = new Date().getTime();
    this.last_time = 0;
    this.__animate(this.running);
  };

  /**
   * Animation loop for the dice selector display.
   * Rotates dice for visual effect.
   * @private
   * @param {number} threadid - Unique identifier for this animation thread.
   */
DiceBox.prototype.__selector_animate = function (threadid) {
    var time = new Date().getTime();
    var time_diff = (time - this.last_time) / 1000;
    if (time_diff > 3) time_diff = frame_rate;
    var angle_change =
      (0.3 * time_diff * Math.PI * Math.min(24000 + threadid - time, 6000)) /
      6000;
    if (angle_change < 0) this.running = false;
    for (var i in this.dices) {
      this.dices[i].rotation.y += angle_change;
      this.dices[i].rotation.x += angle_change / 4;
      this.dices[i].rotation.z += angle_change / 10;
    }
    this.last_time = time;
    this.renderer.render(this.scene, this.camera);
    if (this.running == threadid) {
      (function (t, tid) {
        requestAnimationFrame(function () {
          t.__selector_animate(tid);
        });
      })(this, threadid);
    }
  };

  /**
   * Performs raycasting to find which die was clicked/touched.
   * @param {Event} ev - The mouse or touch event.
   * @returns {*} The userData of the intersected die, or undefined.
   */
DiceBox.prototype.search_dice_by_mouse = function (ev) {
    var touches = ev.changedTouches;
    var m = touches
      ? { x: touches[0].clientX, y: touches[0].clientY }
      : { x: ev.clientX, y: ev.clientY };
    var intersects = new THREE.Raycaster(
      this.camera.position,
      new THREE.Vector3(
        (m.x - this.cw) / this.aspect,
        1 - (m.y - this.ch) / this.aspect,
        this.w / 9
      )
        .sub(this.camera.position)
        .normalize()
    ).intersectObjects(this.dices);
    if (intersects.length) return intersects[0].object.userData;
  };

  /**
   * Draws the dice type selector display.
   * Shows all available dice types for user selection.
   * @param {Array} [diceDictionary] - Optional array of dice definitions with title and sides.
   * @param {Function} [isStandardDiceFn] - Optional function to check if dice has standard sides.
   */
DiceBox.prototype.draw_selector = function (diceDictionary, isStandardDiceFn) {
    this.clear();
    
    // Use custom dictionary if provided, otherwise use standard types
    const diceList = diceDictionary || known_types.map(type => ({ title: type, sides: null }));
    const numDice = diceList.length;
    const step = this.w / Math.max(4.5, (numDice + 1) / 2);
    const startPos = -(numDice - 1) / 2;
    
    this.pane = new THREE.Mesh(
      new THREE.PlaneGeometry(this.w * 6, this.h * 6, 1, 1),
      new THREE.MeshPhongMaterial(selector_back_colors)
    );
    this.pane.receiveShadow = true;
    this.pane.position.set(0, 0, 1);
    this.scene.add(this.pane);

    for (let i = 0; i < numDice; ++i) {
      const diceInfo = diceList[i];
      // Use 'type' for geometry, fall back to 'title' for backward compatibility
      const diceType = typeof diceInfo === 'string' ? diceInfo : (diceInfo.type || diceInfo.title);
      const diceTitle = typeof diceInfo === 'string' ? diceInfo : diceInfo.title;
      
      // Only pass sides for non-standard dice
      let diceSides = null;
      if (typeof diceInfo === 'object' && diceInfo.sides) {
        const isStandard = isStandardDiceFn ? isStandardDiceFn(diceInfo) : false;
        if (!isStandard) {
          diceSides = diceInfo.sides;
        }
      }
      
      const dice = createDiceByType(diceType, diceSides);
      dice.position.set((startPos + i) * step, 0, step * 0.5);
      dice.castShadow = true;
      // Store dictionary index, geometry type, title, and sides for selection
      dice.userData = { dictionaryIndex: i, type: diceType, title: diceTitle, sides: diceSides };
      this.dices.push(dice);
      this.scene.add(dice);
    }

    this.running = new Date().getTime();
    this.last_time = 0;
    if (this.animate_selector) this.__selector_animate(this.running);
    else this.renderer.render(this.scene, this.camera);
  };

  /**
   * Orchestrates the dice throwing process.
   * Generates vectors, calls callbacks, and initiates the roll.
   * @private
   * @param {Object} box - The dice_box instance.
   * @param {Object} vector - The throw direction vector.
   * @param {number} boost - The throw force multiplier.
   * @param {number} dist - The throw distance.
   * @param {Function} notation_getter - Function that returns the dice notation.
   * @param {Function} [before_roll] - Callback before rolling starts.
   * @param {Function} [after_roll] - Callback after rolling completes.
   */
  function throw_dices(
    box,
    vector,
    boost,
    dist,
    notation_getter,
    before_roll,
    after_roll
  ) {
    const uat = box.use_adapvite_timestep;
    function roll(request_results) {
      if (after_roll) {
        box.clear();
        box.roll(
          vectors,
          request_results || notation.result,
          function (result) {
            if (after_roll) after_roll.call(box, notation, result);
            box.rolling = false;
            box.use_adapvite_timestep = uat;
          }
        );
      }
    }
    vector.x /= dist;
    vector.y /= dist;
    var notation = notation_getter.call(box);
    if (notation.set.length == 0) return;
    var vectors = box.generate_vectors(notation, vector, boost);
    box.rolling = true;
    if (before_roll) before_roll.call(box, vectors, notation, roll);
    else roll();
  }

  /**
   * Binds mouse/touch drag events to trigger dice throws.
   * Calculates throw direction and force from drag gesture.
   * @param {HTMLElement} container - The container element to bind events to.
   * @param {Function} notation_getter - Function that returns the dice notation.
   * @param {Function} [before_roll] - Callback before rolling starts.
   * @param {Function} [after_roll] - Callback after rolling completes.
   */
DiceBox.prototype.bind_mouse = function (
    container,
    notation_getter,
    before_roll,
    after_roll
  ) {
    var box = this;
    ["mousedown", "touchstart"].forEach(function (evt) {
      container.addEventListener(evt, function (ev) {
        ev.preventDefault();
        box.mouse_time = new Date().getTime();
        var touches = ev.changedTouches;
        box.mouse_start = touches
          ? { x: touches[0].clientX, y: touches[0].clientY }
          : { x: ev.clientX, y: ev.clientY };
      });
    });
    ["mouseup", "touchend"].forEach(function (evt) {
      container.addEventListener(evt, function (ev) {
        if (box.rolling) return;
        if (box.mouse_start == undefined) return;
        ev.stopPropagation();
        var touches = ev.changedTouches;
        var m = touches
          ? { x: touches[0].clientX, y: touches[0].clientY }
          : { x: ev.clientX, y: ev.clientY };
        var vector = {
          x: m.x - box.mouse_start.x,
          y: -(m.y - box.mouse_start.y),
        };
        box.mouse_start = undefined;
        var dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (dist < Math.sqrt(box.w * box.h * 0.01)) return;
        var time_int = new Date().getTime() - box.mouse_time;
        if (time_int > 2000) time_int = 2000;
        var boost = Math.sqrt((2500 - time_int) / 2500) * dist * 2;
        prepare_rnd(function () {
          throw_dices(
            box,
            vector,
            boost,
            dist,
            notation_getter,
            before_roll,
            after_roll
          );
        });
      });
    });
  };

  /**
   * Binds a button click/touch to trigger a random dice throw.
   * @param {HTMLElement} button - The button element to bind events to.
   * @param {Function} notation_getter - Function that returns the dice notation.
   * @param {Function} [before_roll] - Callback before rolling starts.
   * @param {Function} [after_roll] - Callback after rolling completes.
   */
DiceBox.prototype.bind_throw = function (
    button,
    notation_getter,
    before_roll,
    after_roll
  ) {
    var box = this;
    ["mouseup", "touchend"].forEach(function (evt) {
      button.addEventListener(evt, function (ev) {
        ev.stopPropagation();
        box.start_throw(notation_getter, before_roll, after_roll);
      });
    });
  };

  /**
   * Initiates a dice throw with random direction and force.
   * @param {Function} notation_getter - Function that returns the dice notation.
   * @param {Function} [before_roll] - Callback before rolling starts.
   * @param {Function} [after_roll] - Callback after rolling completes.
   */
DiceBox.prototype.start_throw = function (
    notation_getter,
    before_roll,
    after_roll
  ) {
    var box = this;
    if (box.rolling) return;
    prepare_rnd(function () {
      var vector = { x: (rnd() * 2 - 1) * box.w, y: -(rnd() * 2 - 1) * box.h };
      var dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
      var boost = (rnd() + 3) * dist;
      throw_dices(
        box,
        vector,
        boost,
        dist,
        notation_getter,
        before_roll,
        after_roll
      );
    });
  };
