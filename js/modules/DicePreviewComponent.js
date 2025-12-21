import * as THREE from "three";
import { createDiceByType } from "../dice.js";
import { getDiceTypeFromSides, validateDiceSides } from "./notationUtils.js";

/**
 * Web Component que renderiza un dado individual en un canvas 3D.
 * - Rotación automática controlada por la prop `speed` (por defecto lenta)
 * - Arrastrar con el ratón o touch rota el dado y detiene la rotación automática
 * - Tamaño cuadrado controlado por la prop `size` (px), por defecto 150
 * - Propiedad `sides` (no atributo) para caras custom
 */
// --- Offscreen shared renderer for snapshots ---
let previewShared = null;
const snapshotCache = new Map();

function snapshotKey(type, sides, size) {
  const s = Array.isArray(sides) ? sides.join("|") : "";
  return `${type}|${size}|${s}`;
}

function getSharedPreview(size) {
  if (!previewShared) {
    const canvas = document.createElement("canvas");
    // Single low-power context used for all snapshots
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(24, 1, 1, 600);
    camera.position.set(0, 0, 230);

    // Lights once, reused
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.65);
    keyLight.position.set(1.5, 1.4, 2.2);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(-1.2, -0.6, 1.8);
    scene.add(ambient, keyLight, fillLight);

    previewShared = { renderer, scene, camera, canvas };
  }
  if (size && previewShared) {
    previewShared.renderer.setSize(size, size);
  }
  return previewShared;
}

function generateSnapshot(type, sides, size) {
  const shared = getSharedPreview(size);
  const { renderer, scene, camera } = shared;

  let diceMesh;
  try {
    diceMesh = createDiceByType(type, sides || null);
  } catch (err) {
    console.warn("DicePreviewComponent: unknown type for snapshot, fallback d6", err);
    diceMesh = createDiceByType("d6");
  }

  const scaleFactor = size / 150;
  diceMesh.scale.setScalar(scaleFactor * 1.05);

  // Pleasant angle
  diceMesh.rotation.y = 0.6;
  diceMesh.rotation.x = 0.35;

  scene.add(diceMesh);
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  scene.remove(diceMesh);
  // Help GC
  // Dispose geometry only; materials may be shared/cached elsewhere
  if (diceMesh.geometry) diceMesh.geometry.dispose?.();
  return url;
}

function getOrCreateSnapshot(type, sides, size) {
  const key = snapshotKey(type, sides, size);
  const cached = snapshotCache.get(key);
  if (cached) return cached;
  const url = generateSnapshot(type, sides, size);
  snapshotCache.set(key, url);
  // simple cap to avoid unbounded growth
  const MAX_CACHE = 64;
  if (snapshotCache.size > MAX_CACHE) {
    const first = snapshotCache.keys().next().value;
    snapshotCache.delete(first);
  }
  return url;
}

class DicePreviewComponent extends HTMLElement {
  static get observedAttributes() {
    return ["type", "speed", "size"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.type = this.getAttribute("type") || "d6";
    this.size = parseInt(this.getAttribute("size") || "150", 10);
    this.speed = parseFloat(this.getAttribute("speed") || "0.003");
    this.customSides = null;
    // 2D snapshot mode to avoid multiple WebGL contexts
    this.imgEl = null;
  }

  set sides(value) {
    if (Array.isArray(value)) {
      // Validate sides (0-1 becomes 2) and slice to expected face count
      const validatedSides = validateDiceSides(value);
      // Get type from sides length
      this.type = getDiceTypeFromSides(validatedSides);
      // Store validated/sliced sides
      this.customSides = [...validatedSides];
      this.resetDie();
    }
  }

  get sides() {
    return this.customSides ? [...this.customSides] : null;
  }

  connectedCallback() {
    this.render();
    this.updateSnapshot();
  }

  disconnectedCallback() {
    // Nothing persistent per component anymore
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "type") {
      this.type = newValue || "d6";
      this.resetDie();
    }
    if (name === "speed") {
      const parsed = parseFloat(newValue);
      this.speed = Number.isFinite(parsed) ? parsed : 0.003;
      // No auto-rotation in snapshot mode, ignore
    }
    if (name === "size") {
      const parsed = parseInt(newValue || "150", 10);
      this.size = Number.isFinite(parsed) ? parsed : 150;
      this.updateSize();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          width: ${this.size}px;
          height: ${this.size}px;
        }
        img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          background: transparent;
        }
      </style>
      <img id="snapshot" alt="dice preview" />
    `;
    this.imgEl = this.shadowRoot.getElementById("snapshot");
  }

  updateSnapshot() {
    if (!this.imgEl) return;
    try {
      const url = getOrCreateSnapshot(this.type, this.customSides, this.size);
      this.imgEl.src = url;
    } catch (e) {
      console.warn("DicePreviewComponent: snapshot generation failed", e);
    }
  }

  updateSize() {
    const hostStyle = this.style;
    hostStyle.width = `${this.size}px`;
    hostStyle.height = `${this.size}px`;
    // Re-render at new size
    this.updateSnapshot();
  }

  resetDie() {
    this.updateSnapshot();
  }
}

customElements.define("dice-preview", DicePreviewComponent);

export { DicePreviewComponent };
