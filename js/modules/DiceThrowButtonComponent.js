import { gameState } from "./gameState.js";

/**
 * Web Component que expone solo el botón de lanzamiento.
 * Se desactiva mientras los dados están en vuelo.
 */
class DiceThrowButtonComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.unsubscribe = null;
    this.button = null;
  }

  connectedCallback() {
    this.render();
    this.button = this.shadowRoot.querySelector("button");
    this.setupEventListeners();
    this.updateButtonState(gameState.getState("isThrowing"));

    this.unsubscribe = gameState.subscribe("isThrowing", (isThrowing) => {
      this.updateButtonState(isThrowing);
    });
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }



        button {
          font-size: 14pt;
          padding: 10px 20px;
          border: 1px solid rgba(21, 26, 26, 0.5);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;

          &:hover:enabled {
            background: rgba(255, 255, 255, 1);
            border-color: rgba(21, 26, 26, 0.8);
          }
  
          &:active:enabled {
            transform: scale(0.97);
          }
  
          &:disabled {
            cursor: not-allowed;
            opacity: 0.6;
          }
        }

        @media (max-width: 768px) {
          button {
            font-size: 18pt;
            padding: 16px 32px;
            border-radius: 8px;
            min-width: 160px;
          }
        }

      </style>


        <button type="button">Throw</button>

    `;
  }

  setupEventListeners() {
    if (!this.button) return;

    const handleThrow = (ev) => {
      ev.stopPropagation();
      if (this.button.disabled) {
        return;
      }

      const isThrowing = gameState.getState("isThrowing");
      if (isThrowing) {
        this.updateButtonState(true);
        return;
      }

      this.dispatchEvent(
        new CustomEvent("throw-dice", {
          bubbles: true,
          composed: true,
        })
      );
    };

    ["mouseup", "touchend"].forEach((evt) => {
      this.button.addEventListener(evt, handleThrow);
    });

    this.button.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        handleThrow(ev);
      }
    });
  }

  updateButtonState(isThrowing) {
    if (!this.button) return;

    this.button.disabled = isThrowing;
    this.button.textContent = isThrowing ? "Throwing..." : "Throw dice";
    this.button.setAttribute("aria-busy", String(isThrowing));
  }
}

customElements.define("dice-throw-button", DiceThrowButtonComponent);

export { DiceThrowButtonComponent };
