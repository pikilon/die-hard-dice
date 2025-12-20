import * as THREE from "three";
import { createDiceByType } from "../dice.js";

/**
 * Web Component que renderiza un dado individual en un canvas 3D.
 * - Rotación automática controlada por la prop `speed` (por defecto lenta)
 * - Arrastrar con el ratón o touch rota el dado y detiene la rotación automática
 * - Tamaño cuadrado controlado por la prop `size` (px), por defecto 150
 * - Propiedad `sides` (no atributo) para caras custom
 */
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
    this.autoRotate = true;
    this.dragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.diceMesh = null;
    this.rafId = null;
  }

  set sides(value) {
    if (Array.isArray(value)) {
      this.customSides = [...value];
      this.resetDie();
    }
  }

  get sides() {
    return this.customSides ? [...this.customSides] : null;
  }

  connectedCallback() {
    this.render();
    this.initThree();
    this.animate();
  }

  disconnectedCallback() {
    this.stopAnimation();
    this.dispose();
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

        canvas {
          width: 100%;
          height: 100%;
          display: block;
          cursor: grab;
        }

        canvas:active {
          cursor: grabbing;
        }
      </style>
      <canvas id="viewport"></canvas>
    `;
  }

  initThree() {
    const viewport = this.shadowRoot.getElementById("viewport");
    if (!viewport) return;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(24, 1, 1, 600);
    this.camera.position.set(0, 0, 230);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.65);
    keyLight.position.set(1.5, 1.4, 2.2);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(-1.2, -0.6, 1.8);
    this.scene.add(ambient, keyLight, fillLight);

    this.renderer = new THREE.WebGLRenderer({
      canvas: viewport,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.size, this.size);
    this.renderer.setClearColor(0x000000, 0);

    this.addDiceMesh();
    this.setupInteractions();
  }

  addDiceMesh() {
    if (!this.scene) return;
    if (this.diceMesh) {
      this.scene.remove(this.diceMesh);
      this.diceMesh = null;
    }

    try {
      this.diceMesh = createDiceByType(this.type, this.customSides);
    } catch (err) {
      console.warn(
        "DicePreviewComponent: unknown type, falling back to d6",
        err
      );
      this.diceMesh = createDiceByType("d6");
    }

    const scaleFactor = this.size / 150;
    this.diceMesh.scale.setScalar(scaleFactor * 1.05);
    this.scene.add(this.diceMesh);
  }

  setupInteractions() {
    if (!this.renderer) return;
    const canvas = this.renderer.domElement;

    const onPointerDown = (ev) => {
      this.autoRotate = false;
      this.dragging = true;
      this.lastPointer = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerMove = (ev) => {
      if (!this.dragging || !this.diceMesh) return;
      const dx = ev.clientX - this.lastPointer.x;
      const dy = ev.clientY - this.lastPointer.y;
      this.lastPointer = { x: ev.clientX, y: ev.clientY };
      this.diceMesh.rotation.y += dx * 0.01;
      this.diceMesh.rotation.x += dy * 0.01;
    };

    const stopDragging = () => {
      this.dragging = false;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointerleave", stopDragging);

    this.cleanupInteractions = () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointerleave", stopDragging);
    };
  }

  animate() {
    if (!this.renderer || !this.scene || !this.camera) return;

    if (this.autoRotate && this.diceMesh) {
      this.diceMesh.rotation.y += this.speed;
      this.diceMesh.rotation.x += this.speed * 0.4;
    }

    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(() => this.animate());
  }

  stopAnimation() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  dispose() {
    this.cleanupInteractions?.();
    this.stopAnimation();
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.diceMesh = null;
  }

  updateSize() {
    const hostStyle = this.style;
    hostStyle.width = `${this.size}px`;
    hostStyle.height = `${this.size}px`;
    const canvas = this.shadowRoot.getElementById("viewport");
    if (canvas) {
      canvas.width = this.size;
      canvas.height = this.size;
    }
    if (this.renderer) {
      this.renderer.setSize(this.size, this.size);
    }
  }

  resetDie() {
    if (!this.scene) return;
    this.addDiceMesh();
  }
}

customElements.define("dice-preview", DicePreviewComponent);

export { DicePreviewComponent };
