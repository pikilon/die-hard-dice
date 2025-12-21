import { gameState } from './gameState.js';

/**
 * Component that shows a dropdown of available dice (dictionary)
 * and adds the selected die to the current game set.
 */
class DiceAddFromDictionaryComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.unsubscribeDictionary = null;
    this.isOpen = false;
    this.dictionary = gameState.getState('diceDictionary') || [];
  }

  connectedCallback() {
    this.render();
    this._bindEvents();

    // Subscribe to dice dictionary updates
    this.unsubscribeDictionary = gameState.subscribe('diceDictionary', (dict) => {
      this.dictionary = dict || [];
      this._renderOptions();
    });
  }

  disconnectedCallback() {
    this.unsubscribeDictionary?.();
    this._unbindEvents();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .add-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .label { font-size: 12px; color: rgba(0,0,0,0.7); }

        .trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.15);
          background: rgba(255,255,255,0.95);
          color: #333;
          font-size: 13px;
          cursor: pointer;
          user-select: none;
        }

        .options {
          display: none;
          position: relative;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 6px 18px rgba(0,0,0,0.12);
          max-height: 200px;
          overflow-y: auto;
        }

        .options.open { display: block; }

        .option {
          padding: 8px 10px;
          font-size: 13px;
          color: #333;
          cursor: pointer;
        }

        .option:hover { background: rgba(0,0,0,0.06); }
      </style>
      <div class="add-card">
        <span class="label">Add die:</span>
        <div class="trigger" id="trigger">
          <span id="current">Select a die to add</span>
          <span aria-hidden="true">▾</span>
        </div>
        <div class="options" id="options" aria-expanded="false"></div>
      </div>
    `;

    this._renderOptions();
  }

  _renderOptions() {
    const options = this.shadowRoot.getElementById('options');
    if (!options) return;
    options.innerHTML = '';
    this.dictionary.forEach((die, index) => {
      const item = document.createElement('div');
      item.className = 'option';
      item.textContent = die.title;
      item.dataset.index = String(index);
      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = parseInt(item.dataset.index || '-1', 10);
        if (Number.isFinite(idx) && idx >= 0) {
          this._addDieToGameSet(idx);
          // Reset UI
          const current = this.shadowRoot.getElementById('current');
          if (current) current.textContent = 'Select a die to add';
          this._toggle(false);
        }
      });
      options.appendChild(item);
    });
  }

  _bindEvents() {
    const trigger = this.shadowRoot.getElementById('trigger');
    const options = this.shadowRoot.getElementById('options');
    if (!trigger || !options) return;

    this._onTriggerClick = (ev) => {
      ev.stopPropagation();
      this._toggle(!this.isOpen);
    };
    trigger.addEventListener('click', this._onTriggerClick);

    this._onDocClick = () => {
      if (this.isOpen) this._toggle(false);
    };
    // Close when clicking outside the component
    document.addEventListener('click', this._onDocClick);
  }

  _unbindEvents() {
    const trigger = this.shadowRoot.getElementById('trigger');
    if (trigger && this._onTriggerClick) trigger.removeEventListener('click', this._onTriggerClick);
    if (this._onDocClick) document.removeEventListener('click', this._onDocClick);
  }

  _toggle(open) {
    const options = this.shadowRoot.getElementById('options');
    if (!options) return;
    this.isOpen = !!open;
    options.classList.toggle('open', this.isOpen);
    options.setAttribute('aria-expanded', String(this.isOpen));
  }

  _addDieToGameSet(dictionaryIndex) {
    const current = gameState.getState('gameSet');
    const existing = current.find((d) => d.dictionaryIndex === dictionaryIndex);
    if (existing) {
      const updated = current.map((d) =>
        d.dictionaryIndex === dictionaryIndex
          ? { ...d, quantity: d.quantity + 1 }
          : d
      );
      gameState.setGameSet(updated);
    } else {
      const updated = [...current, { dictionaryIndex, quantity: 1 }];
      gameState.setGameSet(updated);
    }
  }
}

customElements.define('dice-add-from-dictionary', DiceAddFromDictionaryComponent);

export { DiceAddFromDictionaryComponent };
