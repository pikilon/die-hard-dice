import { gameState } from "./gameState.js";
import { isCustomDiceIndex } from "./notationUtils.js";
import "./DicePreviewComponent.js";
import { html } from "templates";

/**
 * Card to visualize and edit a single dice entry from the game set.
 * - Shows dice preview, title and quantity controls.
 * - Keeps quantity in sync with gameState and never goes below 0.
 */
class DiceGameCardComponent extends HTMLElement {
  static get observedAttributes() {
    return ["dictionary-index", "gameset-index"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.dictionaryIndex = null;
    this.gamesetIndex = null;
    this.unsubscribeGameSet = null;
    this.unsubscribeDictionary = null;

    this.gameSetDiceQuantity = 1;
    this.currentGameSetEntry = null;
    this.currentDictionaryEntry = null;
    // Local state cache
    this.diceDef = null;
    this.quantity = 0;
    this.color = "#202020";
    this.boundHandlers = null; // Store handler references
  }

  connectedCallback() {
    this.dictionaryIndex = Number(this.getAttribute("dictionary-index"));
    this.gamesetIndex = Number(this.getAttribute("gameset-index"));

    this.render();
    this._attachEventListeners();

    this.unsubscribeGameSet = gameState.subscribeInitialize(
      "gameSet",
      (gameSet = []) => {
        this.gameSetDiceQuantity = gameSet.length;
        this.currentGameSetEntry = gameSet[this.gamesetIndex];

        this._applyStateToUI();
      },
    );

    this.unsubscribeDictionary = gameState.subscribeInitialize(
      "diceDictionary",
      (diceDictionary = []) => {
        this.currentDictionaryEntry = diceDictionary[this.dictionaryIndex];

        this._applyStateToUI();
      },
    );
  }

  disconnectedCallback() {
    this.unsubscribeGameSet?.();
    this.unsubscribeDictionary?.();
    // Clean up listeners
    if (this.boundHandlers) {
      const quantityInput = this.shadowRoot.getElementById("quantity");
      const colorPicker = this.shadowRoot.getElementById("colorPicker");
      const deleteBtn = this.shadowRoot.getElementById("delete");

      quantityInput?.removeEventListener("input", this.boundHandlers.onQuantityInput);
      colorPicker?.removeEventListener("change", this.boundHandlers.onColorChange);
      deleteBtn?.removeEventListener("click", this.boundHandlers.onDelete);
    }
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    const parsed = Number(newValue);

    if (name === "dictionary-index" && parsed !== this.dictionaryIndex) {
      this.dictionaryIndex = parsed;
      this._applyStateToUI();
      return;
    }

    if (name === "gameset-index" && parsed !== this.gamesetIndex) {
      this.gamesetIndex = parsed;

      this._applyStateToUI();
    }
  }

  render() {
    this.shadowRoot.innerHTML = HTML_TEMPLATE;
  }

  _attachEventListeners() {
    const quantityInput = this.shadowRoot.getElementById("quantity");
    const colorPicker = this.shadowRoot.getElementById("colorPicker");
    const deleteBtn = this.shadowRoot.getElementById("delete");

    const newSet = gameState.getState("gameSet") || [];
    const currentEntry = newSet[this.gamesetIndex];
    const getRemovedSet = () => newSet.toSpliced(this.gamesetIndex, 1);

    // Store bound handlers for cleanup
    this.boundHandlers = {
      onQuantityInput: (ev) => {
        const quantity = Number(ev.target.value);
        const isTheLastOne = this.gameSetDiceQuantity <= 1 && quantity === 0;
        if (isTheLastOne) {
          ev.target.value = 1;
          return;
        }

        const removeFromList =
          quantity === 0 && !isCustomDiceIndex(this.dictionaryIndex);
        if (removeFromList) {
          gameState.setGameSet(getRemovedSet());
          return;
        }

        newSet[this.gamesetIndex] = { ...currentEntry, quantity };
        gameState.setGameSet(newSet);
      },

      onColorChange: (ev) => {
        newSet[this.gamesetIndex] = { ...currentEntry, color: ev.target.value };
        gameState.setGameSet(newSet);
      },

      onDelete: () => {
        if (!isCustomDiceIndex(this.dictionaryIndex)) {
          gameState.setGameSet(getRemovedSet());
          return;
        }

        const ok = window.confirm(
          "If you delete this custom die, you will need to create it again to add it.",
        );
        if (!ok) return;

        gameState.removeDiceFromDictionary(this.dictionaryIndex);
      }
    };

    quantityInput.addEventListener("input", this.boundHandlers.onQuantityInput);
    colorPicker.addEventListener("change", this.boundHandlers.onColorChange);
    deleteBtn.addEventListener("click", this.boundHandlers.onDelete);
  }

  _applyStateToUI() {
    if (!this.currentDictionaryEntry || !this.currentGameSetEntry) return;

    const { title = "", sides = [] } = this.currentDictionaryEntry;
    const { quantity = 0, color = "#202020" } = this.currentGameSetEntry;

    const titleEl = this.shadowRoot.getElementById("title");
    const subtitleEl = this.shadowRoot.getElementById("subtitle");
    const quantityEl = this.shadowRoot.getElementById("quantity");
    const previewEl = this.shadowRoot.getElementById("preview");
    const deleteBtn = this.shadowRoot.getElementById("delete");
    const colorPicker = this.shadowRoot.getElementById("colorPicker");

    titleEl.innerHTML = title;

    subtitleEl.textContent = `Sides: ${sides.length}`;
    quantityEl.value = quantity;
    colorPicker.value = color;
    previewEl.setAttribute("type", title);
    previewEl.sides = sides;

    const canBeDeleted = this.gameSetDiceQuantity > 1;
    deleteBtn.disabled = !canBeDeleted;
    deleteBtn.title = canBeDeleted
      ? "Remove this die"
      : "Cannot delete the last die";
  }
}

customElements.define("dice-game-card", DiceGameCardComponent);

export { DiceGameCardComponent };

const HTML_TEMPLATE = html`
  <style>
    :host {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 10px;
      overflow: hidden;
      color: #333;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }

    .card {
      display: flex;
      gap: 1em;
      align-items: center;
      padding: 10px;
    }

    .preview-wrapper {
      background: rgba(0, 0, 0, 0.03);
      border-radius: 8px;
      padding: 6px;
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.3em;
    }

    .title {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .controls {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .quantity-input {
      width: 3lh;
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      padding: 0;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .subtitle {
      font-size: 12px;
      opacity: 0.6;
      margin: 0;
    }

    .color-picker {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      cursor: pointer;
      padding: 2px;
      flex-shrink: 0;

      &:hover {
        border-color: rgba(0, 0, 0, 0.3);
      }
    }

    .delete-btn {
      margin-top: 6px;
      padding: 8px 10px;
      width: 100%;
      border-radius: 8px;
      border: 1px solid rgba(255, 77, 79, 0.4);
      background: rgba(255, 77, 79, 0.08);
      color: #b32024;
      font-weight: 600;
      cursor: pointer;
      transition:
        background 0.12s ease,
        border 0.12s ease;

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      &:not(:disabled):hover {
        background: rgba(255, 77, 79, 0.16);
        border-color: rgba(255, 77, 79, 0.6);
      }
    }
  </style>
  <div class="card">
    <div class="preview-wrapper">
      <dice-preview id="preview" size="90"></dice-preview>
    </div>
    <div class="info">
      <div class="title" id="title"></div>
      <p class="subtitle" id="subtitle"></p>
      <div class="controls">
        <input
          type="number"
          id="quantity"
          class="quantity-input"
          step="1"
          min="0"
          max="10"
          aria-label="Dice quantity" />
        <input
          type="color"
          id="colorPicker"
          class="color-picker"
          aria-label="Change dice color"
          title="Change dice color" />
      </div>
      <div>
        <button id="delete" class="delete-btn" aria-label="Delete custom dice">
          Delete
        </button>
      </div>
    </div>
  </div>
`;
