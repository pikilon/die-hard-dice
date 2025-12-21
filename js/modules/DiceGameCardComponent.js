import { gameState } from './gameState.js';
import { isCustomDiceIndex } from './notationUtils.js';
import './DicePreviewComponent.js';

/**
 * Card to visualize and edit a single dice entry from the game set.
 * - Shows dice preview, title and quantity controls.
 * - Keeps quantity in sync with gameState and never goes below 0.
 */
class DiceGameCardComponent extends HTMLElement {
  static get observedAttributes() {
    return ['dictionary-index'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.dictionaryIndex = null;
    this.unsubscribeGameSet = null;
    this.unsubscribeDictionary = null;
  }

  connectedCallback() {
    this.dictionaryIndex = this._parseIndex(this.getAttribute('dictionary-index'));
    this.render();
    this._syncFromState();

    this.unsubscribeGameSet = gameState.subscribe('gameSet', () => {
      this._syncFromState();
    });

    this.unsubscribeDictionary = gameState.subscribe('diceDictionary', () => {
      this._syncFromState();
    });
  }

  disconnectedCallback() {
    this.unsubscribeGameSet?.();
    this.unsubscribeDictionary?.();
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === 'dictionary-index') {
      const parsed = this._parseIndex(newValue);
      if (parsed !== this.dictionaryIndex) {
        this.dictionaryIndex = parsed;
        this._syncFromState();
      }
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
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
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 10px;
          align-items: center;
          padding: 10px;
        }

        .preview-wrapper {
          background: rgba(0, 0, 0, 0.03);
          border-radius: 8px;
          padding: 6px;
        }

        .title {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .quantity {
          min-width: 42px;
          text-align: center;
          font-size: 18px;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        button {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          background: rgba(0, 0, 0, 0.05);
          color: #333;
          font-size: 18px;
          cursor: pointer;
          transition: transform 0.08s ease, background 0.12s ease, border 0.12s ease;
        }

        button:hover {
          background: rgba(0, 0, 0, 0.1);
          border-color: rgba(0, 0, 0, 0.3);
        }

        button:active {
          transform: translateY(1px);
        }

        .subtitle {
          font-size: 12px;
          opacity: 0.6;
          margin: 0;
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
          transition: background 0.12s ease, border 0.12s ease;
        }

        .delete-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .delete-btn:not(:disabled):hover {
          background: rgba(255, 77, 79, 0.16);
          border-color: rgba(255, 77, 79, 0.6);
        }

        .hidden { display: none; }
      </style>
      <div class="card">
        <div class="preview-wrapper">
          <dice-preview id="preview" size="90"></dice-preview>
        </div>
        <div>
          <div class="title" id="title"></div>
          <p class="subtitle" id="subtitle"></p>
          <button id="delete" class="delete-btn hidden" aria-label="Delete custom dice">Delete</button>
          <div class="controls">
            <button id="decrease" aria-label="Decrease quantity">-</button>
            <div class="quantity" id="quantity">0</div>
            <button id="increase" aria-label="Increase quantity">+</button>
          </div>
        </div>
      </div>
    `;

    const decreaseButton = this.shadowRoot.getElementById('decrease');
    const inc = this.shadowRoot.getElementById('increase');
    const del = this.shadowRoot.getElementById('delete');
    decreaseButton?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const gameSetState = gameState.getState('gameSet') || [];
      const [firstDice] = gameSetState
      const onlyOneDieLeft = gameSetState && gameSetState.length <= 1 && firstDice.quantity <= 1;
      if (onlyOneDieLeft) return;

      this._changeQuantity(-1);
    });
    inc?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this._changeQuantity(1);
    });
    del?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const ok = window.confirm('If you delete this custom die, you will need to create it again to add it.');
      if (ok) this._confirmDelete();
    });
  }

  _parseIndex(value) {
    const num = parseInt(value, 10);
    return Number.isFinite(num) ? num : null;
  }

  _getDiceDefinition() {
    const dictionary = gameState.getState('diceDictionary');
    if (this.dictionaryIndex == null || !dictionary[this.dictionaryIndex]) return null;
    return dictionary[this.dictionaryIndex];
  }

  _getQuantityFromState() {
    const gameSet = gameState.getState('gameSet');
    const entry = gameSet.find((item) => item.dictionaryIndex === this.dictionaryIndex);
    return entry ? entry.quantity : 0;
  }

  _changeQuantity(delta) {
    if (this.dictionaryIndex == null) return;
    const currentSet = gameState.getState('gameSet');
    const existing = currentSet.find((d) => d.dictionaryIndex === this.dictionaryIndex);
    const currentQty = existing ? existing.quantity : 0;
    const nextQty = Math.max(0, currentQty + delta);

    const isCustom = isCustomDiceIndex(this.dictionaryIndex);

    if (nextQty === currentQty) return;

    const withoutThis = currentSet.filter((d) => d.dictionaryIndex !== this.dictionaryIndex);
    const updated = nextQty === 0 && !isCustom
      ? withoutThis
      : [...withoutThis, { dictionaryIndex: this.dictionaryIndex, quantity: nextQty }];

    gameState.setGameSet(updated);
  }

  _syncFromState() {
    const diceDef = this._getDiceDefinition();
    if (!diceDef) return;

    const titleEl = this.shadowRoot.getElementById('title');
    const subtitleEl = this.shadowRoot.getElementById('subtitle');
    const quantityEl = this.shadowRoot.getElementById('quantity');
    const previewEl = this.shadowRoot.getElementById('preview');
    const deleteBtn = this.shadowRoot.getElementById('delete');

    if (titleEl) {
      titleEl.textContent = diceDef.title;
    }
    if (subtitleEl) {
      subtitleEl.textContent = `Sides: ${diceDef.sides.length}`;
    }

    if (previewEl) {
      previewEl.setAttribute('type', diceDef.title);
      previewEl.sides = diceDef.sides;
    }

    const qty = this._getQuantityFromState();
    if (quantityEl) {
      quantityEl.textContent = String(qty);
    }

    if (deleteBtn) {
      const isCustom = isCustomDiceIndex(this.dictionaryIndex);
      deleteBtn.classList.toggle('hidden', !isCustom);
      deleteBtn.disabled = qty > 0;
    }
  }

  _confirmDelete() {
    if (this.dictionaryIndex == null) return;
    gameState.removeDiceFromDictionary(this.dictionaryIndex);
  }
}

customElements.define('dice-game-card', DiceGameCardComponent);

export { DiceGameCardComponent };
