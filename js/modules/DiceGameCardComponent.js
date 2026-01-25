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
    return ["dictionary-index", "gameset-index", "onlyOneDiceLeft"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.dictionaryIndex = null;
    this.gamesetIndex = null;
    this.onlyOneDiceLeft = false;
    this.unsubscribeGameSet = null;
    this.unsubscribeDictionary = null;
  }

  connectedCallback() {
    this.dictionaryIndex = this._parseIndex(
      this.getAttribute("dictionary-index"),
    );
    this.gamesetIndex = this._parseIndex(this.getAttribute("gameset-index"));
    this.render();
    this._syncFromState();

    this.unsubscribeGameSet = gameState.subscribe("gameSet", () => {
      this._updateOnlyOneDiceLeft();
      this._syncFromState();
    });

    this.unsubscribeDictionary = gameState.subscribe("diceDictionary", () => {
      this._syncFromState();
    });
  }

  disconnectedCallback() {
    this.unsubscribeGameSet?.();
    this.unsubscribeDictionary?.();
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === "dictionary-index") {
      const parsed = this._parseIndex(newValue);
      if (parsed !== this.dictionaryIndex) {
        this.dictionaryIndex = parsed;
        this._syncFromState();
      }
    } else if (name === "gameset-index") {
      const parsed = this._parseIndex(newValue);
      if (parsed !== this.gamesetIndex) {
        this.gamesetIndex = parsed;
        this._syncFromState();
      }
    } else if (name === "onlyOneDiceLeft") {
      this.onlyOneDiceLeft = newValue === "true";
    }
  }

  render() {
    console.log("DiceGameCardComponent rendering", this.onlyOneDiceLeft);
    this.shadowRoot.innerHTML = html`
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

        .hidden {
          display: none;
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
              maxlength="2"
              aria-label="Dice quantity" />
            <input
              type="color"
              id="colorPicker"
              class="color-picker"
              aria-label="Change dice color"
              title="Change dice color" />
          </div>
          <div>
            <button
              id="delete"
              class="delete-btn hidden"
              aria-label="Delete custom dice">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;

    const del = this.shadowRoot.getElementById("delete");
    const colorPicker = this.shadowRoot.getElementById("colorPicker");
    const quantityInput = this.shadowRoot.getElementById("quantity");

    quantityInput?.addEventListener("input", (ev) => {
      const inputEl = ev.target;
      const numeric = inputEl.value.replace(/\D+/g, "");
      if (numeric === "") return;
      const clamped = Math.min(10, parseInt(numeric, 10) || 0);
      inputEl.value = String(clamped);
    });

    quantityInput?.addEventListener("change", (ev) => {
      ev.stopPropagation();
      const clamped = Math.min(
        10,
        Math.max(0, parseInt(ev.target.value, 10) || 0),
      );
      ev.target.value = String(clamped);
      const newQty = clamped;
      const gameSetState = gameState.getState("gameSet") || [];
      const [firstDice] = gameSetState;
      const onlyOneDieLeft =
        gameSetState && gameSetState.length <= 1 && firstDice.quantity <= 1;
      if (onlyOneDieLeft && newQty === 0) return;

      const delta = newQty - this._getQuantityFromState();
      if (delta !== 0) {
        this._changeQuantity(delta);
      }
    });

    del?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const ok = window.confirm(
        "If you delete this custom die, you will need to create it again to add it.",
      );
      if (ok) this._confirmDelete();
    });
    colorPicker?.addEventListener("change", (ev) => {
      ev.stopPropagation();
      this._changeColor(ev.target.value);
    });
  }

  _parseIndex(value) {
    const num = parseInt(value, 10);
    return Number.isFinite(num) ? num : null;
  }

  _getDiceDefinition() {
    const dictionary = gameState.getState("diceDictionary");
    if (this.dictionaryIndex == null || !dictionary[this.dictionaryIndex])
      return null;
    return dictionary[this.dictionaryIndex];
  }

  _getQuantityFromState() {
    const gameSet = gameState.getState("gameSet");
    if (this.gamesetIndex !== null && gameSet[this.gamesetIndex]) {
      return gameSet[this.gamesetIndex].quantity;
    }
    const entry = gameSet.find(
      (item) => item.dictionaryIndex === this.dictionaryIndex,
    );
    return entry ? entry.quantity : 0;
  }

  _changeQuantity(delta) {
    if (this.dictionaryIndex == null) return;
    const currentSet = gameState.getState("gameSet");

    let existing, existingIndex;
    if (this.gamesetIndex !== null) {
      existingIndex = this.gamesetIndex;
      existing = currentSet[existingIndex];
    } else {
      existingIndex = currentSet.findIndex(
        (d) => d.dictionaryIndex === this.dictionaryIndex,
      );
      existing = currentSet[existingIndex];
    }

    const currentQty = existing ? existing.quantity : 0;
    const nextQty = Math.max(0, currentQty + delta);

    const isCustom = isCustomDiceIndex(this.dictionaryIndex);

    if (nextQty === currentQty) return;

    if (nextQty === 0 && !isCustom) {
      // Remove entry
      const updated = currentSet.filter((_, idx) => idx !== existingIndex);
      gameState.setGameSet(updated);
    } else {
      // Update entry
      const updated = currentSet.map((d, idx) =>
        idx === existingIndex ? { ...d, quantity: nextQty } : d,
      );
      gameState.setGameSet(updated);
    }
  }

  _changeColor(color) {
    if (this.dictionaryIndex == null || !color) return;
    const currentSet = gameState.getState("gameSet");

    let existingIndex;
    if (this.gamesetIndex !== null) {
      existingIndex = this.gamesetIndex;
    } else {
      existingIndex = currentSet.findIndex(
        (d) => d.dictionaryIndex === this.dictionaryIndex,
      );
    }

    if (existingIndex === -1) return;

    const updated = currentSet.map((d, idx) =>
      idx === existingIndex ? { ...d, color: color } : d,
    );

    gameState.setGameSet(updated);
  }

  _syncFromState() {
    const diceDef = this._getDiceDefinition();
    if (!diceDef) return;

    const titleEl = this.shadowRoot.getElementById("title");
    const subtitleEl = this.shadowRoot.getElementById("subtitle");
    const quantityEl = this.shadowRoot.getElementById("quantity");
    const previewEl = this.shadowRoot.getElementById("preview");
    const deleteBtn = this.shadowRoot.getElementById("delete");
    const colorPicker = this.shadowRoot.getElementById("colorPicker");

    if (titleEl) {
      titleEl.textContent = diceDef.title;
    }
    if (subtitleEl) {
      subtitleEl.textContent = `Sides: ${diceDef.sides.length}`;
    }

    if (previewEl) {
      previewEl.setAttribute("type", diceDef.title);
      previewEl.sides = diceDef.sides;
    }

    const qty = this._getQuantityFromState();
    if (quantityEl) {
      quantityEl.value = String(qty);
    }

    // Set color picker value from gameSet entry
    if (colorPicker) {
      let color = "#202020"; // Default to dark color
      const gameSet = gameState.getState("gameSet");
      if (this.gamesetIndex !== null && gameSet[this.gamesetIndex]) {
        color = gameSet[this.gamesetIndex].color || "#202020";
      } else {
        const entry = gameSet.find(
          (item) => item.dictionaryIndex === this.dictionaryIndex,
        );
        color = entry?.color || "#202020";
      }
      colorPicker.value = color;
    }

    if (deleteBtn) {
      const isCustom = isCustomDiceIndex(this.dictionaryIndex);
      deleteBtn.classList.toggle("hidden", !isCustom);
      deleteBtn.disabled = qty > 0;
    }
  }

  _confirmDelete() {
    if (this.dictionaryIndex == null) return;
    gameState.removeDiceFromDictionary(this.dictionaryIndex);
  }

  _updateOnlyOneDiceLeft() {
    const gameSet = gameState.getState("gameSet") || [];
    console.log('gameSet', gameSet);
    const newValue = gameSet.length === 1;
    if (newValue !== this.onlyOneDiceLeft) {
      this.onlyOneDiceLeft = newValue;
      this.setAttribute("onlyOneDiceLeft", String(newValue));
    }
  }
}

customElements.define("dice-game-card", DiceGameCardComponent);

export { DiceGameCardComponent };
