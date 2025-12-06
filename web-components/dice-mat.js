import { LitElement, html, css } from "lit";
import * as THREE from "three";
import * as CANNON from "cannon-es";

export class DiceMat extends LitElement {
  static properties = {
    dice: { type: Object },
  };

  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 600px;
      background: #222;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    #controls {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    button {
      padding: 15px 30px;
      font-size: 1.2rem;
      cursor: pointer;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 50px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      user-select: none;
      touch-action: none;
    }
    button:active {
      background: #c0392b;
      transform: scale(0.95);
    }
    #power-bar {
      width: 200px;
      height: 10px;
      background: #444;
      border-radius: 5px;
      overflow: hidden;
      display: none;
    }
    #power-fill {
      height: 100%;
      background: #f1c40f;
      width: 0%;
      transition: width 0.1s;
    }
    .overlay {
      position: absolute;
      top: 10px;
      left: 10px;
      color: white;
      font-family: sans-serif;
      pointer-events: none;
    }
  `;

  constructor() {
    super();
    this.dice = {};
    this.diceInstances = [];
    this.diceMeshes = [];
    this.diceBodies = [];
    this.isDragging = false;
    this.mousePos = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -10); // Plane at y=10
    this.lastMousePos3D = new THREE.Vector3();
    this.mouseVelocity = new THREE.Vector3();
    this.lastTime = 0;
    this.settledTime = 0;
    this.isSettled = true;

    // Camera rotation
    this.isRotatingCamera = false;
    this.cameraAngle = 0;
    this.cameraRadius = Math.sqrt(15 * 15 + 15 * 15);
    this.lastMouseX = 0;

    this._onWindowResize = this.onWindowResize.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onMouseUp = this.onMouseUp.bind(this);
    this._onCanvasMouseDown = this.onCanvasMouseDown.bind(this);
  }

  firstUpdated() {
    this.initThree();
    this.initCannon();
    this.gameLoop();

    window.addEventListener("resize", this._onWindowResize);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mouseup", this._onMouseUp);

    const container = this.shadowRoot.getElementById("canvas-container");
    container.addEventListener("mousedown", this._onCanvasMouseDown);

    // Initial spawn if dice are present
    if (this.dice) {
      this.syncDice();
    }
  }

  updated(changedProperties) {
    if (changedProperties.has("dice")) {
      this.syncDice();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.animationId);
    window.removeEventListener("resize", this._onWindowResize);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mouseup", this._onMouseUp);
    const container = this.shadowRoot?.getElementById("canvas-container");
    if (container) container.removeEventListener("mousedown", this._onCanvasMouseDown);
  }

  initThree() {
    const container = this.shadowRoot.getElementById("canvas-container");
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 15, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    this.scene.add(dirLight);

    // Floor (Visual)
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // Walls (Visual - Optional, but good for reference)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x27ae60,
      transparent: true,
      opacity: 0.3,
    });
    const wallGeo = new THREE.BoxGeometry(20, 2, 1);

    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 1, -10.5);
    this.scene.add(backWall);

    const frontWall = new THREE.Mesh(wallGeo, wallMat);
    frontWall.position.set(0, 1, 10.5);
    this.scene.add(frontWall);

    const sideWallGeo = new THREE.BoxGeometry(1, 2, 20);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.position.set(-10.5, 1, 0);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.position.set(10.5, 1, 0);
    this.scene.add(rightWall);
  }

  initCannon() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82 * 2, 0); // Higher gravity for snappier feel
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 20; // Increased iterations for stability

    // Physics Materials
    const groundMat = new CANNON.Material();
    const diceMat = new CANNON.Material();

    const diceGroundContact = new CANNON.ContactMaterial(groundMat, diceMat, {
      friction: 0.3,
      restitution: 0.5,
    });
    this.world.addContactMaterial(diceGroundContact);

    const diceDiceContact = new CANNON.ContactMaterial(diceMat, diceMat, {
      friction: 0.3,
      restitution: 0.5,
    });
    this.world.addContactMaterial(diceDiceContact);

    this.diceMaterial = diceMat;

    // Floor Body
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0, material: groundMat });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    this.world.addBody(floorBody);

    // Walls Bodies (Invisible Dome/Container)
    // Made walls much thicker (100 units) to prevent tunneling
    // Floor is -10 to 10.
    // Wall inner face at 10. Center at 10 + 50 = 60.
    const thickness = 100;
    const height = 100;
    const offset = 10 + thickness / 2;

    this.addWall(0, height / 2, -offset, 200, height, thickness, groundMat); // Back
    this.addWall(0, height / 2, offset, 200, height, thickness, groundMat); // Front
    this.addWall(-offset, height / 2, 0, thickness, height, 200, groundMat); // Left
    this.addWall(offset, height / 2, 0, thickness, height, 200, groundMat); // Right

    // Ceiling (Invisible)
    const ceilingShape = new CANNON.Plane();
    const ceilingBody = new CANNON.Body({ mass: 0, material: groundMat });
    ceilingBody.addShape(ceilingShape);
    ceilingBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      Math.PI / 2
    );
    ceilingBody.position.set(0, 40, 0); // Higher ceiling
    this.world.addBody(ceilingBody);
  }

  addWall(x, y, z, w, h, d, material) {
    const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
    const body = new CANNON.Body({ mass: 0, material: material });
    body.addShape(shape);
    body.position.set(x, y, z);
    this.world.addBody(body);
  }

  syncDice() {
    if (!this.world || !this.scene) return;

    const newList = this.flattenDiceConfig(this.dice);

    const existingById = new Map(
      this.diceInstances.map((inst) => [inst.id, inst])
    );

    const nextInstances = [];

    newList.forEach(({ id, def }) => {
      const existing = existingById.get(id);
      if (existing && this.isSameDef(existing.def, def)) {
        nextInstances.push(existing);
        existingById.delete(id);
      } else {
        if (existing) {
          this.removeInstance(existing);
        }
        const inst = this.createDie(def);
        nextInstances.push({ id, def, ...inst });
      }
    });

    existingById.forEach((inst) => this.removeInstance(inst));

    this.diceInstances = nextInstances;
    this.diceMeshes = nextInstances.map((inst) => inst.mesh);
    this.diceBodies = nextInstances.map((inst) => inst.body);
    this.isSettled = false;
    this.settledTime = 0;
  }

  flattenDiceConfig(diceConfig) {
    if (!diceConfig) return [];
    const entries = Array.isArray(diceConfig)
      ? diceConfig.map((val, idx) => [idx, val])
      : Object.entries(diceConfig);

    const list = [];
    entries.forEach(([key, def]) => {
      if (!def) return;
      const quantity = def?.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        list.push({ id: `${key}:${i}`, def });
      }
    });
    return list;
  }

  isSameDef(a, b) {
    if (!a || !b) return false;
    return (
      a.type === b.type &&
      a.color === b.color &&
      JSON.stringify(a.faces || []) === JSON.stringify(b.faces || [])
    );
  }

  removeInstance(inst) {
    if (inst.mesh) this.scene.remove(inst.mesh);
    if (inst.body) this.world.removeBody(inst.body);
  }

  createDie(dieDef) {
    let geometry, shape;
    const size = 1;

    const DICE_TYPES = {
      coin: {
        getShapeGeometry: (diceSize) => {
          const height = 0.2;
          const geometry = new THREE.CylinderGeometry(
            diceSize,
            diceSize,
            height,
            32
          );
          const shape = new CANNON.Box(
            new CANNON.Vec3(diceSize, height / 2, diceSize)
          );
          return { geometry, shape };
        },
      },
      d4: {
        getShapeGeometry: (diceSize) => {
          const geometry = new THREE.TetrahedronGeometry(diceSize);
          return { geometry, shape: this.createConvexPolyhedron(geometry) };
        },
      },
      d6: {
        getShapeGeometry: (diceSize) => {
          const geometry = new THREE.BoxGeometry(diceSize, diceSize, diceSize);
          const shape = new CANNON.Box(
            new CANNON.Vec3(diceSize / 2, diceSize / 2, diceSize / 2)
          );
          return { geometry, shape };
        },
      },
      d8: {
        getShapeGeometry: (diceSize) => {
          const geometry = new THREE.OctahedronGeometry(diceSize);
          return { geometry, shape: this.createConvexPolyhedron(geometry) };
        },
      },
      d10: {
        getShapeGeometry: (diceSize) => {
          const geometry = this.createD10Geometry(diceSize);
          return { geometry, shape: this.createConvexPolyhedron(geometry) };
        },
      },
      d12: {
        getShapeGeometry: (diceSize) => {
          const geometry = new THREE.DodecahedronGeometry(diceSize);
          return { geometry, shape: this.createConvexPolyhedron(geometry) };
        },
      },
      d20: {
        getShapeGeometry: (diceSize) => {
          const geometry = new THREE.IcosahedronGeometry(diceSize);
          return { geometry, shape: this.createConvexPolyhedron(geometry) };
        },
      },
    };

    const { geometry: selectedGeometry, shape: selectedShape } = (
      DICE_TYPES[dieDef.type] || DICE_TYPES.d6
    ).getShapeGeometry(size);
    geometry = selectedGeometry;
    shape = selectedShape;

    // Material with color
    let material;

    if (dieDef.type === "d6" && dieDef.faces && dieDef.faces.length === 6) {
      material = dieDef.faces.map((text) =>
        this.createTextMaterial(text, dieDef.color)
      );
    } else if (
      dieDef.type === "coin" &&
      dieDef.faces &&
      dieDef.faces.length === 2
    ) {
      const sideMat = new THREE.MeshStandardMaterial({
        color: dieDef.color || 0xffffff,
      });
      const face1 = this.createTextMaterial(dieDef.faces[0], dieDef.color);
      const face2 = this.createTextMaterial(dieDef.faces[1], dieDef.color);
      material = [sideMat, face1, face2];
    } else if (dieDef.type === "d10") {
      const faces =
        dieDef.faces && dieDef.faces.length === 10
          ? dieDef.faces
          : ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

      geometry = geometry.toNonIndexed();
      geometry.clearGroups();

      const uvs = geometry.attributes.uv;

      // d10 has 10 kite-shaped faces, each made of 2 triangles = 20 triangles total
      for (let i = 0; i < 10; i++) {
        // Each kite face uses 2 triangles (6 vertices)
        geometry.addGroup(i * 6, 6, i);

        // Set UVs for both triangles of the kite
        for (let j = 0; j < 2; j++) {
          const baseIdx = i * 6 + j * 3;
          uvs.setXY(baseIdx, 0.5, 1);
          uvs.setXY(baseIdx + 1, 0, 0);
          uvs.setXY(baseIdx + 2, 1, 0);
        }
      }

      material = faces.map((text) =>
        this.createTextMaterial(text, dieDef.color)
      );
    } else if (dieDef.type === "d4") {
      // Each face shows 3 different numbers - the ones NOT on the opposite vertex
      // First number = top position (the result), then bottom-left, bottom-right
      const d4FaceNumbers = [
        ["4", "3", "1"],  // face 0 - result 4 (shows 1,3,4)
        ["3", "4", "2"],  // face 1 - result 3 (shows 2,3,4)
        ["2", "1", "4"],  // face 2 - result 2 (shows 1,2,4)
        ["1", "2", "3"],  // face 3 - result 1 (shows 1,2,3)
      ];

      geometry = geometry.toNonIndexed();
      geometry.clearGroups();

      // d4 tetrahedron has 4 triangular faces, each with 3 vertices = 12 vertices total
      const vertexCount = geometry.attributes.position.count;
      const uvArray = new Float32Array(vertexCount * 2);

      for (let i = 0; i < 4; i++) {
        geometry.addGroup(i * 3, 3, i);

        // UV mapping for triangular face
        const baseIdx = i * 3;
        uvArray[(baseIdx) * 2] = 0.5;      uvArray[(baseIdx) * 2 + 1] = 1;     // top vertex
        uvArray[(baseIdx + 1) * 2] = 0;    uvArray[(baseIdx + 1) * 2 + 1] = 0; // bottom left
        uvArray[(baseIdx + 2) * 2] = 1;    uvArray[(baseIdx + 2) * 2 + 1] = 0; // bottom right
      }

      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvArray, 2));

      material = d4FaceNumbers.map((nums) =>
        this.createD4TextMaterial(nums[0], nums[1], nums[2], dieDef.color)
      );
    } else if (dieDef.type === "d20") {
      const faces =
        dieDef.faces && dieDef.faces.length === 20
          ? dieDef.faces
          : Array.from({ length: 20 }, (_, i) => (i + 1).toString());

      geometry = geometry.toNonIndexed();
      geometry.clearGroups();

      const uvs = geometry.attributes.uv;

      for (let i = 0; i < 20; i++) {
        geometry.addGroup(i * 3, 3, i);

        // Map UVs to cover the texture
        // Simple triangle mapping: (0.5, 1), (0, 0), (1, 0)
        // This ensures the center of the texture (where the number is) is inside the triangle
        uvs.setXY(i * 3, 0.5, 1);
        uvs.setXY(i * 3 + 1, 0, 0);
        uvs.setXY(i * 3 + 2, 1, 0);
      }

      material = faces.map((text) =>
        this.createTextMaterial(text, dieDef.color)
      );
    } else {
      material = new THREE.MeshStandardMaterial({
        color: dieDef.color || 0xffffff,
      });
    }

    // Create Mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    this.scene.add(mesh);

    // Create Body
    const body = new CANNON.Body({
      mass: 1,
      material: this.diceMaterial,
      shape: shape,
    });

    // Initial position (hovering above board)
    // Spread them out
    const x = (Math.random() - 0.5) * 5;
    const z = (Math.random() - 0.5) * 5;
    body.position.set(x, 5, z); // Start high
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);

    // If coin, rotate shape
    // if (dieDef.type === 'coin') {
    //    const q = new CANNON.Quaternion();
    //    q.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    //    body.shapeOrientations[0] = q;
    // }

    this.world.addBody(body);
    return { mesh, body };
  }

  createD4TextMaterial(topNum, bottomLeftNum, bottomRightNum, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const bgColor = color || "#ffffff";

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 256);

    // Calculate contrast color
    const getContrastColor = (hexColor) => {
      let r = 0, g = 0, b = 0;
      if (hexColor.startsWith("#")) {
        const hex = hexColor.substring(1);
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }
      } else if (typeof hexColor === "number") {
        r = (hexColor >> 16) & 255;
        g = (hexColor >> 8) & 255;
        b = hexColor & 255;
      }
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "#000000" : "#ffffff";
    };

    const textColor = getContrastColor(bgColor);
    ctx.fillStyle = textColor;
    ctx.font = "bold 70px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Top number (upright) - this is the "read here" position / result
    ctx.fillText(topNum, 128, 80);

    // Bottom left number (rotated ~60° clockwise to follow left edge)
    ctx.save();
    ctx.translate(50, 210);
    ctx.rotate(Math.PI / 3); // 60 degrees
    ctx.fillText(bottomLeftNum, 0, 0);
    ctx.restore();

    // Bottom right number (rotated ~60° counter-clockwise to follow right edge)
    ctx.save();
    ctx.translate(206, 210);
    ctx.rotate(-Math.PI / 3); // -60 degrees
    ctx.fillText(bottomRightNum, 0, 0);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({ map: texture });
  }

  createTextMaterial(text, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    const bgColor = color || "#ffffff";

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 128, 128);

    // Calculate contrast color
    const getContrastColor = (hexColor) => {
      // Convert hex to RGB
      let r = 0,
        g = 0,
        b = 0;
      if (hexColor.startsWith("#")) {
        const hex = hexColor.substring(1);
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }
      } else if (typeof hexColor === "number") {
        r = (hexColor >> 16) & 255;
        g = (hexColor >> 8) & 255;
        b = hexColor & 255;
      }

      // Calculate luminance
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "#000000" : "#ffffff";
    };

    const textColor = getContrastColor(bgColor);

    // Text
    ctx.fillStyle = textColor;
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 64);

    // Border
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({ map: texture });
  }

  /**
   * Creates a pentagonal trapezohedron geometry for d10
   * A d10 has 10 kite-shaped faces arranged around a central axis
   */
  createD10Geometry(size) {
    const geometry = new THREE.BufferGeometry();

    // Pentagonal trapezohedron vertices
    // Top and bottom vertices on the axis
    const topHeight = size * 0.9;
    const bottomHeight = -size * 0.9;

    // Middle ring vertices (two rings, offset by 36 degrees)
    const upperRingHeight = size * 0.3;
    const lowerRingHeight = -size * 0.3;
    const ringRadius = size * 0.95;

    const vertices = [];
    const indices = [];

    // Vertex 0: top point
    vertices.push(0, topHeight, 0);
    // Vertex 1: bottom point
    vertices.push(0, bottomHeight, 0);

    // Upper ring vertices (2-6)
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5;
      vertices.push(
        Math.cos(angle) * ringRadius,
        upperRingHeight,
        Math.sin(angle) * ringRadius
      );
    }

    // Lower ring vertices (7-11), offset by 36 degrees
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 + Math.PI / 5;
      vertices.push(
        Math.cos(angle) * ringRadius,
        lowerRingHeight,
        Math.sin(angle) * ringRadius
      );
    }

    // Create 10 kite-shaped faces (each as 2 triangles)
    // 5 upper kites (top point to upper ring to lower ring)
    for (let i = 0; i < 5; i++) {
      const upperCurr = 2 + i;
      const upperNext = 2 + ((i + 1) % 5);
      const lowerCurr = 7 + i;

      // Upper kite: top -> upperCurr -> lowerCurr -> upperNext
      // Triangle 1: top, upperCurr, lowerCurr
      indices.push(0, upperCurr, lowerCurr);
      // Triangle 2: top, lowerCurr, upperNext
      indices.push(0, lowerCurr, upperNext);
    }

    // 5 lower kites (bottom point to lower ring to upper ring)
    for (let i = 0; i < 5; i++) {
      const lowerCurr = 7 + i;
      const lowerNext = 7 + ((i + 1) % 5);
      const upperNext = 2 + ((i + 1) % 5);

      // Lower kite: bottom -> lowerNext -> upperNext -> lowerCurr
      // Triangle 1: bottom, lowerNext, upperNext
      indices.push(1, lowerNext, upperNext);
      // Triangle 2: bottom, upperNext, lowerCurr
      indices.push(1, upperNext, lowerCurr);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Add UV attribute for texturing
    const uvs = new Float32Array(vertices.length / 3 * 2);
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

    return geometry;
  }

  createConvexPolyhedron(geometry) {
    const positionAttribute = geometry.attributes.position;
    const vertices = [];
    const faces = [];

    // Merge vertices
    const keyMap = {}; // "x_y_z" -> index

    // Helper to get or add vertex
    const getVertexIndex = (x, y, z) => {
      const key = `${x.toFixed(4)}_${y.toFixed(4)}_${z.toFixed(4)}`;
      if (keyMap[key] !== undefined) {
        return keyMap[key];
      }
      const index = vertices.length;
      vertices.push(new CANNON.Vec3(x, y, z));
      keyMap[key] = index;
      return index;
    };

    // Iterate over faces
    if (geometry.index) {
      for (let i = 0; i < geometry.index.count; i += 3) {
        const a = geometry.index.getX(i);
        const b = geometry.index.getX(i + 1);
        const c = geometry.index.getX(i + 2);

        const v1 = getVertexIndex(
          positionAttribute.getX(a),
          positionAttribute.getY(a),
          positionAttribute.getZ(a)
        );
        const v2 = getVertexIndex(
          positionAttribute.getX(b),
          positionAttribute.getY(b),
          positionAttribute.getZ(b)
        );
        const v3 = getVertexIndex(
          positionAttribute.getX(c),
          positionAttribute.getY(c),
          positionAttribute.getZ(c)
        );

        faces.push([v1, v2, v3]);
      }
    } else {
      for (let i = 0; i < positionAttribute.count; i += 3) {
        const v1 = getVertexIndex(
          positionAttribute.getX(i),
          positionAttribute.getY(i),
          positionAttribute.getZ(i)
        );
        const v2 = getVertexIndex(
          positionAttribute.getX(i + 1),
          positionAttribute.getY(i + 1),
          positionAttribute.getZ(i + 1)
        );
        const v3 = getVertexIndex(
          positionAttribute.getX(i + 2),
          positionAttribute.getY(i + 2),
          positionAttribute.getZ(i + 2)
        );

        faces.push([v1, v2, v3]);
      }
    }

    return new CANNON.ConvexPolyhedron({ vertices, faces });
  }

  checkSettled() {
    if (this.isDragging || this.isSettled || this.diceBodies.length === 0)
      return;

    const threshold = 0.1;
    let allSettled = true;

    for (const body of this.diceBodies) {
      const isMoving =
        body.velocity.lengthSquared() > threshold ||
        body.angularVelocity.lengthSquared() > threshold;
      if (isMoving) {
        allSettled = false;
        break;
      }
    }

    if (allSettled) {
      this.settledTime++;
      if (this.settledTime > 60) {
        // Wait ~1 second (60 frames) of stillness
        this.isSettled = true;
        this.calculateResults();
      }
    } else {
      this.settledTime = 0;
    }
  }

  calculateResults() {
    const results = [];

    this.diceInstances.forEach((inst) => {
      const dieDef = inst.def;
      const mesh = inst.mesh;
      let value;

      if (dieDef.type === "d6") {
        // BoxGeometry faces: +x, -x, +y, -y, +z, -z
        // Indices: 0, 1, 2, 3, 4, 5
        // We need to find which local axis is pointing UP (0, 1, 0)
        const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(
          mesh.quaternion.clone().invert()
        );

        // Find axis most aligned with localUp
        const axes = [
          new THREE.Vector3(1, 0, 0), // +x (Right) -> Face 0
          new THREE.Vector3(-1, 0, 0), // -x (Left) -> Face 1
          new THREE.Vector3(0, 1, 0), // +y (Top) -> Face 2
          new THREE.Vector3(0, -1, 0), // -y (Bottom) -> Face 3
          new THREE.Vector3(0, 0, 1), // +z (Front) -> Face 4
          new THREE.Vector3(0, 0, -1), // -z (Back) -> Face 5
        ];

        let maxDot = -Infinity;
        let faceIndex = -1;

        axes.forEach((axis, i) => {
          const dot = axis.dot(localUp);
          if (dot > maxDot) {
            maxDot = dot;
            faceIndex = i;
          }
        });

        // Map faceIndex to value
        // If faces array is provided, use it.
        // Standard d6 faces: 1, 2, 3, 4, 5, 6
        // But how are they mapped to the cube?
        // Usually: 1 opposite 6, 2 opposite 5, 3 opposite 4.
        // My material mapping was: 0, 1, 2, 3, 4, 5.
        // So faceIndex corresponds to the index in the faces array.
        if (dieDef.faces && dieDef.faces.length === 6) {
          value = dieDef.faces[faceIndex];
        } else {
          value = faceIndex + 1;
        }
      } else if (dieDef.type === "coin") {
        // Cylinder/Box. Top (+y) is Face 0, Bottom (-y) is Face 1.
        const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(
          mesh.quaternion.clone().invert()
        );
        if (localUp.y > 0) {
          value =
            dieDef.faces && dieDef.faces.length > 0 ? dieDef.faces[0] : "H";
        } else {
          value =
            dieDef.faces && dieDef.faces.length > 1 ? dieDef.faces[1] : "T";
        }
      } else if (dieDef.type === "d4") {
        // Tetrahedron. 4 faces.
        // Find the face normal most aligned with world up.
        const pos = mesh.geometry.attributes.position;
        let maxDot = -Infinity;
        let faceIndex = -1;

        for (let i = 0; i < 4; i++) {
          const v1 = new THREE.Vector3().fromBufferAttribute(pos, i * 3);
          const v2 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 1);
          const v3 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 2);

          const normal = new THREE.Vector3()
            .crossVectors(v2.clone().sub(v1), v3.clone().sub(v1))
            .normalize();

          normal.applyQuaternion(mesh.quaternion);

          const dot = normal.dot(new THREE.Vector3(0, 1, 0));
          if (dot > maxDot) {
            maxDot = dot;
            faceIndex = i;
          }
        }

        // Map face index to result: face 0=4, face 1=3, face 2=2, face 3=1
        const d4Results = [4, 3, 2, 1];
        if (dieDef.faces && dieDef.faces.length === 4) {
          value = dieDef.faces[faceIndex];
        } else {
          value = d4Results[faceIndex];
        }
      } else if (dieDef.type === "d20") {
        // Icosahedron. 20 faces.
        // We need to find the face normal most aligned with world up.
        // Since we used non-indexed geometry, we can iterate through groups or position attribute.
        // Each face has 3 vertices.
        const pos = mesh.geometry.attributes.position;
        let maxDot = -Infinity;
        let faceIndex = -1;

        // 20 faces * 3 vertices = 60 vertices
        for (let i = 0; i < 20; i++) {
          // Get normal of face i
          // Vertices
          const v1 = new THREE.Vector3().fromBufferAttribute(pos, i * 3);
          const v2 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 1);
          const v3 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 2);

          // Compute normal
          const normal = new THREE.Vector3()
            .crossVectors(v2.clone().sub(v1), v3.clone().sub(v1))
            .normalize();

          // Transform normal to world space
          normal.applyQuaternion(mesh.quaternion);

          const dot = normal.dot(new THREE.Vector3(0, 1, 0));
          if (dot > maxDot) {
            maxDot = dot;
            faceIndex = i;
          }
        }

        if (dieDef.faces && dieDef.faces.length === 20) {
          value = dieDef.faces[faceIndex];
        } else {
          value = faceIndex + 1;
        }
      } else {
        value = "?";
      }

      results.push({ type: dieDef.type, value: value, color: dieDef.color });
    });

    this.dispatchEvent(
      new CustomEvent("dice-settled", {
        detail: { results },
        bubbles: true,
        composed: true,
      })
    );
  }

  onWindowResize() {
    const container = this.shadowRoot.getElementById("canvas-container");
    if (!container) return;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  onMouseMove(e) {
    const rect = this.getBoundingClientRect();
    // Normalized device coordinates
    this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging) {
      this.raycaster.setFromCamera(this.mousePos, this.camera);
      const target = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, target);

      if (target) {
        // Limit target within bounds roughly
        target.x = Math.max(-9, Math.min(9, target.x));
        target.z = Math.max(-9, Math.min(9, target.z));

        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        if (dt > 0) {
          this.mouseVelocity
            .copy(target)
            .sub(this.lastMousePos3D)
            .divideScalar(dt);
        }
        this.lastMousePos3D.copy(target);
        this.lastTime = now;
      }
    }

    // Camera rotation
    if (this.isRotatingCamera && !this.isDragging) {
      const deltaX = this.mousePos.x - this.lastMouseX;
      this.cameraAngle += deltaX * 0.5;
    }
    this.lastMouseX = this.mousePos.x;
  }

  onCanvasMouseDown(e) {
    // Only start camera rotation if not clicking the throw button
    if (!this.isDragging) {
      this.isRotatingCamera = true;
      this.lastMouseX = this.mousePos.x;
    }
  }

  onMouseUp() {
    this.releaseThrow();
    this.isRotatingCamera = false;
  }

  startThrow() {
    this.isDragging = true;
    this.isSettled = false;
    this.lastTime = performance.now();

    // Calculate initial mouse 3D pos
    this.raycaster.setFromCamera(this.mousePos, this.camera);
    this.raycaster.ray.intersectPlane(this.dragPlane, this.lastMousePos3D);

    // Wake up and lift dice
    this.diceBodies.forEach((body, i) => {
      body.wakeUp();
      // Randomize initial lift slightly to avoid stacking perfectly
      const offset = new CANNON.Vec3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
      // We don't set position here, we let the gameLoop move them towards the mouse
      // But we can give them a little upward bump
      body.velocity.set(0, 5, 0);
      body.angularVelocity.set(Math.random(), Math.random(), Math.random());
    });
  }

  releaseThrow() {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Apply release velocity
    // Clamp velocity to avoid crazy speeds
    const maxSpeed = 50;
    if (this.mouseVelocity.length() > maxSpeed) {
      this.mouseVelocity.normalize().multiplyScalar(maxSpeed);
    }

    // Cannon effect: Add impulse in the direction of movement
    const direction = new THREE.Vector3().copy(this.mouseVelocity).normalize();
    const impulseStrength = 50; // Strong impulse for cannon effect

    this.diceBodies.forEach((body) => {
      // Apply the mouse velocity to the body
      const vel = new CANNON.Vec3(
        this.mouseVelocity.x,
        this.mouseVelocity.y,
        this.mouseVelocity.z
      );
      body.velocity.copy(vel);

      // Apply extra impulse (Cannon) if moving
      if (this.mouseVelocity.length() > 0.1) {
        const impulse = new CANNON.Vec3(
          direction.x * impulseStrength,
          direction.y * impulseStrength,
          direction.z * impulseStrength
        );
        body.applyImpulse(impulse, new CANNON.Vec3(0, 0, 0));
      }

      // Add randomness and spin
      body.velocity.x += (Math.random() - 0.5) * 5;
      body.velocity.y += (Math.random() - 0.5) * 5;
      body.velocity.z += (Math.random() - 0.5) * 5;

      body.angularVelocity.set(
        Math.random() * 20,
        Math.random() * 20,
        Math.random() * 20
      );
    });
  }

  gameLoop() {
    this.animationId = requestAnimationFrame(this.gameLoop.bind(this));

    if (this.world) {
      // If dragging, move dice towards mouse target
      if (this.isDragging) {
        const k = 15; // Increased Spring stiffness / attraction force (was 5)
        const damping = 0.5; // Reduced damping for snappier response (was 0.8)

        this.diceBodies.forEach((body, i) => {
          // Target position is lastMousePos3D + some offset for each die so they don't overlap perfectly
          // We can use their index to spread them out or just let them collide
          // Let's try to pull them towards the center but let physics handle collisions

          const target = new CANNON.Vec3(
            this.lastMousePos3D.x,
            this.lastMousePos3D.y,
            this.lastMousePos3D.z
          );

          // Simple P-controller for velocity
          // v_new = (target_pos - current_pos) * k
          const diff = target.vsub(body.position);
          const desiredVel = diff.scale(k);

          // Apply to velocity directly (kinematic-like control) or apply force?
          // Applying force is more physically correct but harder to control.
          // Setting velocity directly is easier for "grabbing".

          // Let's blend current velocity with desired velocity
          body.velocity.x =
            body.velocity.x * damping + desiredVel.x * (1 - damping);
          body.velocity.y =
            body.velocity.y * damping + desiredVel.y * (1 - damping);
          body.velocity.z =
            body.velocity.z * damping + desiredVel.z * (1 - damping);

          // Keep them awake
          body.wakeUp();
        });
      }

      this.world.step(1 / 60);

      // Sync meshes with bodies
      for (let i = 0; i < this.diceMeshes.length; i++) {
        const mesh = this.diceMeshes[i];
        const body = this.diceBodies[i];

        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      }

      this.checkSettled();
    }

    // Update camera position based on angle
    if (this.camera) {
      const baseAngle = Math.PI / 4;
      const angle = baseAngle + this.cameraAngle;
      this.camera.position.x = Math.sin(angle) * this.cameraRadius;
      this.camera.position.z = Math.cos(angle) * this.cameraRadius;
      this.camera.lookAt(0, 0, 0);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  render() {
    return html`
      <div id="canvas-container"></div>
      <div class="overlay">Dice Mat 3D</div>
      <div id="controls">
        <button
          @mousedown=${this.startThrow}
          @touchstart=${(e) => {
            e.preventDefault();
            this.startThrow();
          }}
          @touchend=${(e) => {
            e.preventDefault();
            this.releaseThrow();
          }}>
          HOLD TO GRAB & THROW
        </button>
      </div>
    `;
  }
}

customElements.define("dice-mat", DiceMat);
