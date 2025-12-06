/**
 * @fileoverview Shared utility functions for dice geometry creation.
 * @module dice/common
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Creates a Cannon.js convex polyhedron shape for physics simulation.
 * @param {Array} vertices - Array of THREE.Vector3 vertices.
 * @param {Array} faces - Array of face index arrays.
 * @param {number} radius - Scale factor for the shape.
 * @returns {CANNON.ConvexPolyhedron} The physics shape.
 */
export function createShape(vertices, faces, radius) {
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
export function makeGeom(vertices, faces, radius, tab, af) {
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
export function chamferGeom(vectors, faces, chamfer) {
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
export function createGeom(vertices, faces, radius, tab, af, chamfer) {
  const vectors = new Array(vertices.length);
  for (let i = 0; i < vertices.length; ++i) {
    vectors[i] = new THREE.Vector3().fromArray(vertices[i]).normalize();
  }
  const cg = chamferGeom(vectors, faces, chamfer);
  const geom = makeGeom(cg.vectors, cg.faces, radius, tab, af);
  geom.cannon_shape = createShape(vectors, faces, radius);
  return geom;
}

/**
 * Calculates the nearest power of 2 texture size.
 * @param {number} approx - Approximate desired size.
 * @returns {number} The nearest power of 2.
 */
export function calcTextureSize(approx) {
  return Math.pow(2, Math.floor(Math.log(approx) / Math.log(2)));
}

/** @type {Object} Default material options for dice */
export const materialOptions = {
  specular: 0x172022,
  color: 0xf0f0f0,
  shininess: 40,
  flatShading: true,
};

/** @type {string} Color for dice face labels */
export let labelColor = "#aaaaaa";

/** @type {string} Background color for dice faces */
export let diceColor = "#202020";

/**
 * Sets the label color for dice faces.
 * @param {string} color - The new label color.
 */
export function setLabelColor(color) {
  labelColor = color;
}

/**
 * Sets the dice background color.
 * @param {string} color - The new dice color.
 */
export function setDiceColor(color) {
  diceColor = color;
}
