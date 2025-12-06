import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

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

/**
 * Creates a Cannon.js convex polyhedron shape for physics simulation.
 * @param {Array} vertices - Array of THREE.Vector3 vertices.
 * @param {Array} faces - Array of face index arrays.
 * @param {number} radius - Scale factor for the shape.
 * @returns {CANNON.ConvexPolyhedron} The physics shape.
 */
function create_shape(vertices, faces, radius) {
  const cv = new Array(vertices.length);
  const cf = new Array(faces.length);
  for (let i = 0; i < vertices.length; ++i) {
    const v = vertices[i];
    cv[i] = new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius);
  }
  for (let i = 0; i < faces.length; ++i) {
    cf[i] = faces[i].slice(0, faces[i].length - 1);
  }
  return new CANNON.ConvexPolyhedron({ vertices: cv, faces: cf });
}

/**
 * Creates a Three.js geometry from vertices and faces.
 * @param {Array} vertices - Array of THREE.Vector3 vertices.
 * @param {Array} faces - Array of face index arrays.
 * @param {number} radius - Scale factor for the geometry.
 * @param {number} tab - UV mapping tab offset.
 * @param {number} af - UV mapping angle offset.
 * @returns {THREE.Geometry} The constructed geometry.
 */
function make_geom(vertices, faces, radius, tab, af) {
  const geom = new THREE.Geometry();
  for (let i = 0; i < vertices.length; ++i) {
    const vertex = vertices[i].multiplyScalar(radius);
    vertex.index = geom.vertices.push(vertex) - 1;
  }
  for (let i = 0; i < faces.length; ++i) {
    const ii = faces[i];
    const fl = ii.length - 1;
    const aa = (Math.PI * 2) / fl;
    for (let j = 0; j < fl - 2; ++j) {
      geom.faces.push(
        new THREE.Face3(
          ii[0],
          ii[j + 1],
          ii[j + 2],
          [
            geom.vertices[ii[0]],
            geom.vertices[ii[j + 1]],
            geom.vertices[ii[j + 2]],
          ],
          0,
          ii[fl] + 1
        )
      );
      geom.faceVertexUvs[0].push([
        new THREE.Vector2(
          (Math.cos(af) + 1 + tab) / 2 / (1 + tab),
          (Math.sin(af) + 1 + tab) / 2 / (1 + tab)
        ),
        new THREE.Vector2(
          (Math.cos(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab),
          (Math.sin(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab)
        ),
        new THREE.Vector2(
          (Math.cos(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab),
          (Math.sin(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab)
        ),
      ]);
    }
  }
  geom.computeFaceNormals();
  geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius);
  return geom;
}

/**
 * Applies chamfering to geometry vertices and generates edge faces.
 * @param {Array} vectors - Array of THREE.Vector3 vertices.
 * @param {Array} faces - Array of face index arrays.
 * @param {number} chamfer - Chamfer amount (0-1).
 * @returns {Object} Object with chamfered vectors and faces arrays.
 */
function chamfer_geom(vectors, faces, chamfer) {
  const chamfer_vectors = [];
  const chamfer_faces = [];
  const corner_faces = new Array(vectors.length);
  for (let i = 0; i < vectors.length; ++i) corner_faces[i] = [];
  for (let i = 0; i < faces.length; ++i) {
    const ii = faces[i];
    const fl = ii.length - 1;
    const center_point = new THREE.Vector3();
    const face = new Array(fl);
    for (let j = 0; j < fl; ++j) {
      const vv = vectors[ii[j]].clone();
      center_point.add(vv);
      corner_faces[ii[j]].push((face[j] = chamfer_vectors.push(vv) - 1));
    }
    center_point.divideScalar(fl);
    for (let j = 0; j < fl; ++j) {
      const vv = chamfer_vectors[face[j]];
      vv.subVectors(vv, center_point)
        .multiplyScalar(chamfer)
        .addVectors(vv, center_point);
    }
    face.push(ii[fl]);
    chamfer_faces.push(face);
  }
  for (let i = 0; i < faces.length - 1; ++i) {
    for (let j = i + 1; j < faces.length; ++j) {
      const pairs = [];
      let lastm = -1;
      for (let m = 0; m < faces[i].length - 1; ++m) {
        const n = faces[j].indexOf(faces[i][m]);
        if (n >= 0 && n < faces[j].length - 1) {
          if (lastm >= 0 && m != lastm + 1) pairs.unshift([i, m], [j, n]);
          else pairs.push([i, m], [j, n]);
          lastm = m;
        }
      }
      if (pairs.length != 4) continue;
      chamfer_faces.push([
        chamfer_faces[pairs[0][0]][pairs[0][1]],
        chamfer_faces[pairs[1][0]][pairs[1][1]],
        chamfer_faces[pairs[3][0]][pairs[3][1]],
        chamfer_faces[pairs[2][0]][pairs[2][1]],
        -1,
      ]);
    }
  }
  for (let i = 0; i < corner_faces.length; ++i) {
    const cf = corner_faces[i];
    const face = [cf[0]];
    let count = cf.length - 1;
    while (count) {
      for (let m = faces.length; m < chamfer_faces.length; ++m) {
        let index = chamfer_faces[m].indexOf(face[face.length - 1]);
        if (index >= 0 && index < 4) {
          if (--index == -1) index = 3;
          const next_vertex = chamfer_faces[m][index];
          if (cf.indexOf(next_vertex) >= 0) {
            face.push(next_vertex);
            break;
          }
        }
      }
      --count;
    }
    face.push(-1);
    chamfer_faces.push(face);
  }
  return { vectors: chamfer_vectors, faces: chamfer_faces };
}

/**
 * Creates complete die geometry with chamfering and physics shape.
 * @param {Array} vertices - Raw vertex coordinate arrays.
 * @param {Array} faces - Face index arrays with material index.
 * @param {number} radius - Scale factor.
 * @param {number} tab - UV mapping tab offset.
 * @param {number} af - UV mapping angle offset.
 * @param {number} chamfer - Chamfer amount (0-1).
 * @returns {THREE.Geometry} Geometry with attached cannon_shape.
 */
function create_geom(vertices, faces, radius, tab, af, chamfer) {
  const vectors = new Array(vertices.length);
  for (let i = 0; i < vertices.length; ++i) {
    vectors[i] = new THREE.Vector3().fromArray(vertices[i]).normalize();
  }
  const cg = chamfer_geom(vectors, faces, chamfer);
  const geom = make_geom(cg.vectors, cg.faces, radius, tab, af);
  geom.cannon_shape = create_shape(vectors, faces, radius);
  return geom;
}

// ============================================================================
// MODULE CONFIGURATION
// ============================================================================

/** @type {Array<string>} Standard d20 face labels (0-20) */
export const standart_d20_dice_face_labels = [
  " ", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
];

/** @type {Array<string>} D100 face labels (00-90) */
export const standart_d100_dice_face_labels = [
  " ", "00", "10", "20", "30", "40", "50", "60", "70", "80", "90",
];

/** @type {Object} Default material options for dice */
export const material_options = {
  specular: 0x172022,
  color: 0xf0f0f0,
  shininess: 40,
  flatShading: true,
};

/** @type {string} Color for dice face labels */
export let label_color = "#aaaaaa";

/** @type {string} Background color for dice faces */
export let dice_color = "#202020";

/** @type {Array} D4 label configurations for face shifting */
const d4_labels = [
  [[], [0, 0, 0], [2, 4, 3], [1, 3, 4], [2, 1, 4], [1, 2, 3]],
  [[], [0, 0, 0], [2, 3, 4], [3, 1, 4], [2, 4, 1], [3, 2, 1]],
  [[], [0, 0, 0], [4, 3, 2], [3, 4, 1], [4, 2, 1], [3, 1, 2]],
  [[], [0, 0, 0], [4, 2, 3], [1, 4, 3], [4, 1, 2], [1, 3, 2]],
];

/**
 * Calculates the nearest power of 2 texture size.
 * @param {number} approx - Approximate desired size.
 * @returns {number} The nearest power of 2.
 */
function calc_texture_size(approx) {
  return Math.pow(2, Math.floor(Math.log(approx) / Math.log(2)));
}

// ============================================================================
// EXPORTED MATERIAL FUNCTIONS
// ============================================================================

/**
 * Creates materials with face number textures for standard dice.
 * @param {Array<string>} face_labels - Array of labels for each face.
 * @param {number} size - Base size for texture calculations.
 * @param {number} margin - Margin around the text.
 * @returns {Array<THREE.MeshPhongMaterial>} Array of materials for each face.
 */
export function create_dice_materials(face_labels, size, margin) {
  function create_text_texture(text, color, back_color) {
    if (text == undefined) return null;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const ts = calc_texture_size(size + size * 2 * margin) * 2;
    canvas.width = canvas.height = ts;
    context.font = ts / (1 + 2 * margin) + "pt Arial";
    context.fillStyle = back_color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    if (text == "6" || text == "9") {
      context.fillText("  .", canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
  const materials = [];
  for (let i = 0; i < face_labels.length; ++i)
    materials.push(
      new THREE.MeshPhongMaterial(
        Object.assign({}, material_options, {
          map: create_text_texture(face_labels[i], label_color, dice_color),
        })
      )
    );
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
  function create_d4_text(text, color, back_color) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const ts = calc_texture_size(size + margin) * 2;
    canvas.width = canvas.height = ts;
    context.font = (ts - margin) / 1.5 + "pt Arial";
    context.fillStyle = back_color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    for (const i in text) {
      context.fillText(text[i], canvas.width / 2, canvas.height / 2 - ts * 0.3);
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((Math.PI * 2) / 3);
      context.translate(-canvas.width / 2, -canvas.height / 2);
    }
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
  const materials = [];
  for (let i = 0; i < labels.length; ++i)
    materials.push(
      new THREE.MeshPhongMaterial(
        Object.assign({}, material_options, {
          map: create_d4_text(labels[i], label_color, dice_color),
        })
      )
    );
  return materials;
}

// ============================================================================
// EXPORTED GEOMETRY FUNCTIONS
// ============================================================================

/**
 * Creates geometry for a d4 (tetrahedron) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d4 geometry with physics shape.
 */
export function create_d4_geometry(radius) {
  const vertices = [
    [1, 1, 1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, -1, -1],
  ];
  const faces = [
    [1, 0, 2, 1],
    [0, 1, 3, 2],
    [0, 3, 2, 3],
    [1, 2, 3, 4],
  ];
  return create_geom(vertices, faces, radius, -0.1, (Math.PI * 7) / 6, 0.96);
}

/**
 * Creates geometry for a d6 (cube) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d6 geometry with physics shape.
 */
export function create_d6_geometry(radius) {
  const vertices = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ];
  const faces = [
    [0, 3, 2, 1, 1],
    [1, 2, 6, 5, 2],
    [0, 1, 5, 4, 3],
    [3, 7, 6, 2, 4],
    [0, 4, 7, 3, 5],
    [4, 5, 6, 7, 6],
  ];
  return create_geom(vertices, faces, radius, 0.1, Math.PI / 4, 0.96);
}

/**
 * Creates geometry for a d8 (octahedron) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d8 geometry with physics shape.
 */
export function create_d8_geometry(radius) {
  const vertices = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  const faces = [
    [0, 2, 4, 1],
    [0, 4, 3, 2],
    [0, 3, 5, 3],
    [0, 5, 2, 4],
    [1, 3, 4, 5],
    [1, 4, 2, 6],
    [1, 2, 5, 7],
    [1, 5, 3, 8],
  ];
  return create_geom(vertices, faces, radius, 0, -Math.PI / 4 / 2, 0.965);
}

/**
 * Creates geometry for a d10 (pentagonal trapezohedron) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d10 geometry with physics shape.
 */
export function create_d10_geometry(radius) {
  const a = (Math.PI * 2) / 10;
  const h = 0.105;
  const v = -1;
  const vertices = [];
  for (let i = 0, b = 0; i < 10; ++i, b += a)
    vertices.push([Math.cos(b), Math.sin(b), h * (i % 2 ? 1 : -1)]);
  vertices.push([0, 0, -1]);
  vertices.push([0, 0, 1]);
  const faces = [
    [5, 7, 11, 0],
    [4, 2, 10, 1],
    [1, 3, 11, 2],
    [0, 8, 10, 3],
    [7, 9, 11, 4],
    [8, 6, 10, 5],
    [9, 1, 11, 6],
    [2, 0, 10, 7],
    [3, 5, 11, 8],
    [6, 4, 10, 9],
    [1, 0, 2, v],
    [1, 2, 3, v],
    [3, 2, 4, v],
    [3, 4, 5, v],
    [5, 4, 6, v],
    [5, 6, 7, v],
    [7, 6, 8, v],
    [7, 8, 9, v],
    [9, 8, 0, v],
    [9, 0, 1, v],
  ];
  return create_geom(vertices, faces, radius, 0, (Math.PI * 6) / 5, 0.945);
}

/**
 * Creates geometry for a d12 (dodecahedron) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d12 geometry with physics shape.
 */
export function create_d12_geometry(radius) {
  const p = (1 + Math.sqrt(5)) / 2;
  const q = 1 / p;
  const vertices = [
    [0, q, p],
    [0, q, -p],
    [0, -q, p],
    [0, -q, -p],
    [p, 0, q],
    [p, 0, -q],
    [-p, 0, q],
    [-p, 0, -q],
    [q, p, 0],
    [q, -p, 0],
    [-q, p, 0],
    [-q, -p, 0],
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
  ];
  const faces = [
    [2, 14, 4, 12, 0, 1],
    [15, 9, 11, 19, 3, 2],
    [16, 10, 17, 7, 6, 3],
    [6, 7, 19, 11, 18, 4],
    [6, 18, 2, 0, 16, 5],
    [18, 11, 9, 14, 2, 6],
    [1, 17, 10, 8, 13, 7],
    [1, 13, 5, 15, 3, 8],
    [13, 8, 12, 4, 5, 9],
    [5, 4, 14, 9, 15, 10],
    [0, 12, 8, 10, 16, 11],
    [3, 19, 7, 17, 1, 12],
  ];
  return create_geom(vertices, faces, radius, 0.2, -Math.PI / 4 / 2, 0.968);
}

/**
 * Creates geometry for a d20 (icosahedron) die.
 * @param {number} radius - Scale factor for the die.
 * @returns {THREE.Geometry} The d20 geometry with physics shape.
 */
export function create_d20_geometry(radius) {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ];
  const faces = [
    [0, 11, 5, 1],
    [0, 5, 1, 2],
    [0, 1, 7, 3],
    [0, 7, 10, 4],
    [0, 10, 11, 5],
    [1, 5, 9, 6],
    [5, 11, 4, 7],
    [11, 10, 2, 8],
    [10, 7, 6, 9],
    [7, 1, 8, 10],
    [3, 9, 4, 11],
    [3, 4, 2, 12],
    [3, 2, 6, 13],
    [3, 6, 8, 14],
    [3, 8, 9, 15],
    [4, 9, 5, 16],
    [2, 4, 11, 17],
    [6, 2, 10, 18],
    [8, 6, 7, 19],
    [9, 8, 1, 20],
  ];
  return create_geom(vertices, faces, radius, -0.2, -Math.PI / 4 / 2, 0.955);
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

/** @type {Array<string>} All supported dice types */
export const known_types = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

/** @type {Object} Face value ranges for each die type */
export const dice_face_range = {
  d4: [1, 4],
  d6: [1, 6],
  d8: [1, 8],
  d10: [0, 9],
  d12: [1, 12],
  d20: [1, 20],
  d100: [0, 9],
};

/** @type {Object} Mass values for each die type */
export const dice_mass = {
  d4: 300,
  d6: 300,
  d8: 340,
  d10: 350,
  d12: 350,
  d20: 400,
  d100: 350,
};

/** @type {Object} Inertia values for each die type */
export const dice_inertia = {
  d4: 5,
  d6: 13,
  d8: 10,
  d10: 9,
  d12: 8,
  d20: 6,
  d100: 9,
};

/** @type {number} Scale factor for dice sizing */
export let scale = 50;

// Cached geometry and materials
let d4_geometry_cache = null;
let d6_geometry_cache = null;
let d8_geometry_cache = null;
let d10_geometry_cache = null;
let d12_geometry_cache = null;
let d20_geometry_cache = null;
let d4_material_cache = null;
let d100_material_cache = null;
let dice_material_cache = null;

// ============================================================================
// EXPORTED DICE FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a d4 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @returns {THREE.Mesh} The d4 die mesh.
 */
export function create_d4() {
  if (!d4_geometry_cache)
    d4_geometry_cache = create_d4_geometry(scale * 1.2);
  if (!d4_material_cache)
    d4_material_cache = create_d4_materials(scale / 2, scale * 2, d4_labels[0]);
  return new THREE.Mesh(d4_geometry_cache, d4_material_cache);
}

/**
 * Creates a d6 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @returns {THREE.Mesh} The d6 die mesh.
 */
export function create_d6() {
  if (!d6_geometry_cache)
    d6_geometry_cache = create_d6_geometry(scale * 0.9);
  if (!dice_material_cache)
    dice_material_cache = create_dice_materials(standart_d20_dice_face_labels, scale / 2, 1.0);
  return new THREE.Mesh(d6_geometry_cache, dice_material_cache);
}

/**
 * Creates a d8 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @returns {THREE.Mesh} The d8 die mesh.
 */
export function create_d8() {
  if (!d8_geometry_cache)
    d8_geometry_cache = create_d8_geometry(scale);
  if (!dice_material_cache)
    dice_material_cache = create_dice_materials(standart_d20_dice_face_labels, scale / 2, 1.2);
  return new THREE.Mesh(d8_geometry_cache, dice_material_cache);
}

/**
 * Creates a d10 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @returns {THREE.Mesh} The d10 die mesh.
 */
export function create_d10() {
  if (!d10_geometry_cache)
    d10_geometry_cache = create_d10_geometry(scale * 0.9);
  if (!dice_material_cache)
    dice_material_cache = create_dice_materials(standart_d20_dice_face_labels, scale / 2, 1.0);
  return new THREE.Mesh(d10_geometry_cache, dice_material_cache);
}

/**
 * Creates a d12 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @returns {THREE.Mesh} The d12 die mesh.
 */
export function create_d12() {
  if (!d12_geometry_cache)
    d12_geometry_cache = create_d12_geometry(scale * 0.9);
  if (!dice_material_cache)
    dice_material_cache = create_dice_materials(standart_d20_dice_face_labels, scale / 2, 1.0);
  return new THREE.Mesh(d12_geometry_cache, dice_material_cache);
}

/**
 * Creates a d20 die mesh with geometry and materials.
 * Caches geometry and materials for reuse.
 * @returns {THREE.Mesh} The d20 die mesh.
 */
export function create_d20() {
  if (!d20_geometry_cache)
    d20_geometry_cache = create_d20_geometry(scale);
  if (!dice_material_cache)
    dice_material_cache = create_dice_materials(standart_d20_dice_face_labels, scale / 2, 1.0);
  return new THREE.Mesh(d20_geometry_cache, dice_material_cache);
}

/**
 * Creates a d100 (percentile) die mesh.
 * Uses d10 geometry with special 00-90 face labels.
 * @returns {THREE.Mesh} The d100 die mesh.
 */
export function create_d100() {
  if (!d10_geometry_cache)
    d10_geometry_cache = create_d10_geometry(scale * 0.9);
  if (!d100_material_cache)
    d100_material_cache = create_dice_materials(standart_d100_dice_face_labels, scale / 2, 1.5);
  return new THREE.Mesh(d10_geometry_cache, d100_material_cache);
}

/**
 * Dice factory lookup map for creating dice by type string.
 * @type {Object<string, Function>}
 */
export const dice_factories = {
  d4: create_d4,
  d6: create_d6,
  d8: create_d8,
  d10: create_d10,
  d12: create_d12,
  d20: create_d20,
  d100: create_d100,
};

/**
 * Creates a die mesh by type string.
 * @param {string} type - The die type (e.g., 'd4', 'd6', 'd20').
 * @returns {THREE.Mesh} The die mesh.
 */
export function createDiceByType(type) {
  const factory = dice_factories[type];
  if (!factory) throw new Error(`Unknown dice type: ${type}`);
  return factory();
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
  scale = Math.sqrt(this.w * this.w + this.h * this.h) / 13;

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
    const inertia = dice_inertia[notation.set[i]];
    const angle = {
      x: -(rnd() * vec.y * 5 + inertia * vec.y),
      y: rnd() * vec.x * 5 + inertia * vec.x,
      z: 0,
    };
    const axis = { x: rnd(), y: rnd(), z: rnd(), a: rnd() };
    vectors.push({
      set: notation.set[i],
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
   */
DiceBox.prototype.create_dice = function (
    type,
    pos,
    velocity,
    angle,
    axis
  ) {
    const dice = createDiceByType(type);
    dice.castShadow = true;
    dice.dice_type = type;
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
   * @returns {number} The value shown on the top face.
   */
  function get_dice_value(dice) {
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
    if (dice.dice_type == "d100") matindex *= 10;
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
        vectors[i].axis
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
  if (dice.dice_type == "d100") res /= 10;
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
    dice.material = create_d4_materials(scale / 2, scale * 2, d4_labels[num]);
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
   */
DiceBox.prototype.draw_selector = function () {
    this.clear();
    var step = this.w / 4.5;
    this.pane = new THREE.Mesh(
      new THREE.PlaneGeometry(this.w * 6, this.h * 6, 1, 1),
      new THREE.MeshPhongMaterial(selector_back_colors)
    );
    this.pane.receiveShadow = true;
    this.pane.position.set(0, 0, 1);
    this.scene.add(this.pane);

    for (let i = 0, pos = -3; i < known_types.length; ++i, ++pos) {
      const dice = createDiceByType(known_types[i]);
      dice.position.set(pos * step, 0, step * 0.5);
      dice.castShadow = true;
      dice.userData = known_types[i];
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
