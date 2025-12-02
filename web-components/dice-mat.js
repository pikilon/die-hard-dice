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
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
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
    this.diceMeshes = [];
    this.diceBodies = [];
    this.isPressed = false;
    this.launchPower = 0;
    this.mousePos = new THREE.Vector2();
    this.launchDirection = new THREE.Vector3(0, 1, -1); // Default forward
  }

  firstUpdated() {
    this.initThree();
    this.initCannon();
    this.gameLoop();
    
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Initial spawn if dice are present
    if (this.dice) {
      this.spawnDice();
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('dice')) {
      this.spawnDice();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
  }

  initThree() {
    const container = this.shadowRoot.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
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
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, transparent: true, opacity: 0.3 });
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
    this.world.solver.iterations = 10;

    // Physics Materials
    const groundMat = new CANNON.Material();
    const diceMat = new CANNON.Material();
    
    const diceGroundContact = new CANNON.ContactMaterial(groundMat, diceMat, {
      friction: 0.3,
      restitution: 0.5
    });
    this.world.addContactMaterial(diceGroundContact);
    
    const diceDiceContact = new CANNON.ContactMaterial(diceMat, diceMat, {
      friction: 0.3,
      restitution: 0.5
    });
    this.world.addContactMaterial(diceDiceContact);

    this.diceMaterial = diceMat;

    // Floor Body
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0, material: groundMat });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(floorBody);

    // Walls Bodies (Invisible Dome/Container)
    // Made walls much higher (20 units) to prevent dice from flying out
    this.addWall(0, 10, -10.5, 20, 20, 1, groundMat); // Back
    this.addWall(0, 10, 10.5, 20, 20, 1, groundMat); // Front
    this.addWall(-10.5, 10, 0, 1, 20, 20, groundMat); // Left
    this.addWall(10.5, 10, 0, 1, 20, 20, groundMat); // Right

    // Ceiling (Invisible)
    const ceilingShape = new CANNON.Plane();
    const ceilingBody = new CANNON.Body({ mass: 0, material: groundMat });
    ceilingBody.addShape(ceilingShape);
    ceilingBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
    ceilingBody.position.set(0, 20, 0);
    this.world.addBody(ceilingBody);
  }

  addWall(x, y, z, w, h, d, material) {
    const shape = new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2));
    const body = new CANNON.Body({ mass: 0, material: material });
    body.addShape(shape);
    body.position.set(x, y, z);
    this.world.addBody(body);
  }

  spawnDice() {
    // Clear existing dice
    this.diceMeshes.forEach(m => this.scene.remove(m));
    this.diceBodies.forEach(b => this.world.removeBody(b));
    this.diceMeshes = [];
    this.diceBodies = [];

    if (!this.dice) return;

    let offset = 0;
    Object.values(this.dice).forEach(dieDef => {
      for (let i = 0; i < (dieDef.quantity || 1); i++) {
        this.createDie(dieDef, offset);
        offset += 1.5;
      }
    });
  }

  createDie(dieDef, offset) {
    let geometry, shape;
    const size = 1;
    
    // Basic geometry selection
    switch (dieDef.type) {
      case 'coin':
        geometry = new THREE.CylinderGeometry(size, size, 0.2, 32);
        // Use Box for physics stability to prevent vertical embedding
        // Cylinder is radius 'size', height 0.2
        // Box halfExtents: x=size, y=0.1, z=size
        shape = new CANNON.Box(new CANNON.Vec3(size, 0.1, size));
        break;
      case 'd4':
        geometry = new THREE.TetrahedronGeometry(size);
        // Cannon doesn't have Tetrahedron, use ConvexPolyhedron or approximate.
        // For simplicity in this demo, we'll use a Box or Sphere approximation if Convex is too complex to build manually here.
        // But we can build a ConvexPolyhedron from the Three geometry vertices.
        shape = this.createConvexPolyhedron(geometry);
        break;
      case 'd6':
        geometry = new THREE.BoxGeometry(size, size, size);
        shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
        break;
      case 'd8':
        geometry = new THREE.OctahedronGeometry(size);
        shape = this.createConvexPolyhedron(geometry);
        break;
      case 'd10':
        // Approximation using Icosahedron or similar
        geometry = new THREE.IcosahedronGeometry(size); 
        shape = this.createConvexPolyhedron(geometry);
        break;
      case 'd12':
        geometry = new THREE.DodecahedronGeometry(size);
        shape = this.createConvexPolyhedron(geometry);
        break;
      case 'd20':
        geometry = new THREE.IcosahedronGeometry(size);
        shape = this.createConvexPolyhedron(geometry);
        break;
      default:
        geometry = new THREE.BoxGeometry(size, size, size);
        shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
    }

    // Material with color
    let material;
    
    if (dieDef.type === 'd6' && dieDef.faces && dieDef.faces.length === 6) {
      material = dieDef.faces.map(text => this.createTextMaterial(text, dieDef.color));
    } else if (dieDef.type === 'coin' && dieDef.faces && dieDef.faces.length === 2) {
      const sideMat = new THREE.MeshStandardMaterial({ color: dieDef.color || 0xffffff });
      const face1 = this.createTextMaterial(dieDef.faces[0], dieDef.color);
      const face2 = this.createTextMaterial(dieDef.faces[1], dieDef.color);
      material = [sideMat, face1, face2];
    } else if (dieDef.type === 'd20') {
      const faces = (dieDef.faces && dieDef.faces.length === 20) ? dieDef.faces : Array.from({length: 20}, (_, i) => (i+1).toString());
      
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
      
      material = faces.map(text => this.createTextMaterial(text, dieDef.color));
    } else {
      material = new THREE.MeshStandardMaterial({ color: dieDef.color || 0xffffff });
    }
    
    // Create Mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.diceMeshes.push(mesh);

    // Create Body
    const body = new CANNON.Body({
      mass: 1,
      material: this.diceMaterial,
      shape: shape
    });
    
    // Initial position (hovering above board)
    // Spread them out
    const x = (Math.random() - 0.5) * 5;
    const z = (Math.random() - 0.5) * 5;
    body.position.set(x, 5, z); // Start high
    body.velocity.set(0,0,0);
    body.angularVelocity.set(0,0,0);
    
    // If coin, rotate shape
    // if (dieDef.type === 'coin') {
    //    const q = new CANNON.Quaternion();
    //    q.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    //    body.shapeOrientations[0] = q;
    // }

    this.world.addBody(body);
    this.diceBodies.push(body);
  }

  createTextMaterial(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    
    // Text
    ctx.fillStyle = '#000000'; // Assume black text for now, or contrast
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 64);
    
    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({ map: texture });
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
        const b = geometry.index.getX(i+1);
        const c = geometry.index.getX(i+2);
        
        const v1 = getVertexIndex(positionAttribute.getX(a), positionAttribute.getY(a), positionAttribute.getZ(a));
        const v2 = getVertexIndex(positionAttribute.getX(b), positionAttribute.getY(b), positionAttribute.getZ(b));
        const v3 = getVertexIndex(positionAttribute.getX(c), positionAttribute.getY(c), positionAttribute.getZ(c));
        
        faces.push([v1, v2, v3]);
      }
    } else {
      for (let i = 0; i < positionAttribute.count; i += 3) {
        const v1 = getVertexIndex(positionAttribute.getX(i), positionAttribute.getY(i), positionAttribute.getZ(i));
        const v2 = getVertexIndex(positionAttribute.getX(i+1), positionAttribute.getY(i+1), positionAttribute.getZ(i+1));
        const v3 = getVertexIndex(positionAttribute.getX(i+2), positionAttribute.getY(i+2), positionAttribute.getZ(i+2));
        
        faces.push([v1, v2, v3]);
      }
    }

    return new CANNON.ConvexPolyhedron({ vertices, faces });
  }

  onWindowResize() {
    const container = this.shadowRoot.getElementById('canvas-container');
    if (!container) return;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  onMouseMove(e) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    // But for "throw direction", we just want relative movement or position relative to center.
    const rect = this.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.mousePos.set(x, y);

    if (this.isPressed) {
      // Update launch direction based on mouse pos relative to center bottom?
      // Let's say mouse X controls left/right angle.
      // Mouse Y controls up/down angle?
      this.launchDirection.set(x, 0.5, -1).normalize();
    }
  }

  startThrow() {
    this.isPressed = true;
    this.launchPower = 0;
    const bar = this.shadowRoot.getElementById('power-bar');
    const fill = this.shadowRoot.getElementById('power-fill');
    bar.style.display = 'block';
    
    // Reset dice positions to "hand" position (e.g. near camera)
    this.diceBodies.forEach((body, i) => {
      body.position.set((Math.random()-0.5)*2, 10, 8 + (Math.random()-0.5));
      body.velocity.set(0,0,0);
      body.angularVelocity.set(0,0,0);
      // Wake up
      body.wakeUp();
    });

    this.chargeInterval = setInterval(() => {
      this.launchPower = Math.min(this.launchPower + 1, 100);
      fill.style.width = `${this.launchPower}%`;
    }, 20);
  }

  releaseThrow() {
    if (!this.isPressed) return;
    this.isPressed = false;
    clearInterval(this.chargeInterval);
    
    const bar = this.shadowRoot.getElementById('power-bar');
    bar.style.display = 'none';

    const force = 10 + (this.launchPower / 100) * 40; // Base force + variable

    this.diceBodies.forEach(body => {
      // Add some randomness to direction
      const dir = this.launchDirection.clone();
      dir.x += (Math.random() - 0.5) * 0.2;
      dir.z += (Math.random() - 0.5) * 0.2;
      dir.normalize();
      
      const impulse = new CANNON.Vec3(dir.x * force, dir.y * force, dir.z * force);
      // Apply impulse to center
      body.applyImpulse(impulse, new CANNON.Vec3(0,0,0));
      
      // Add random rotation
      const rot = new CANNON.Vec3(Math.random(), Math.random(), Math.random()).scale(10);
      body.angularVelocity.set(rot.x, rot.y, rot.z);
    });
  }

  gameLoop() {
    this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
    
    if (this.world) {
      this.world.step(1 / 60);
      
      // Sync meshes with bodies
      for (let i = 0; i < this.diceMeshes.length; i++) {
        const mesh = this.diceMeshes[i];
        const body = this.diceBodies[i];
        
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  render() {
    return html`
      <div id="canvas-container"></div>
      <div class="overlay">
        Dice Mat 3D
      </div>
      <div id="controls">
        <div id="power-bar"><div id="power-fill"></div></div>
        <button 
          @mousedown=${this.startThrow} 
          @mouseup=${this.releaseThrow}
          @mouseleave=${this.releaseThrow}
          @touchstart=${(e) => { e.preventDefault(); this.startThrow(); }}
          @touchend=${(e) => { e.preventDefault(); this.releaseThrow(); }}
        >
          HOLD TO THROW
        </button>
      </div>
    `;
  }
}

customElements.define('dice-mat', DiceMat);
