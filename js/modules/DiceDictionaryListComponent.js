import { gameState } from './gameState.js';
import { DEFAULT_DICE } from './notationUtils.js';
import './DicePreviewComponent.js';

/**
 * Muestra una lista de dados del diccionario actual (por defecto DEFAULT_DICE)
 * usando el web component <dice-preview>. Solo es visible cuando el juego
 * no está lanzando dados.
 */
class DiceDictionaryListComponent extends HTMLElement {
  static get observedAttributes() {
    return ['preview-size'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.unsubscribeDictionary = null;
    this.unsubscribeThrowing = null;
    this.previewSize = parseInt(this.getAttribute('preview-size') || '130', 10);
  }

  connectedCallback() {
    this.render();
    this.renderList();

    this.unsubscribeDictionary = gameState.subscribe('diceDictionary', () => {
      this.renderList();
    });

    this.unsubscribeThrowing = gameState.subscribe('isThrowing', (isThrowing) => {
      this.toggleVisibility(!isThrowing);
    });

    const isThrowing = gameState.getState('isThrowing');
    this.toggleVisibility(!isThrowing);
  }

  disconnectedCallback() {
    this.unsubscribeDictionary?.();
    this.unsubscribeThrowing?.();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'preview-size' && oldValue !== newValue) {
      const parsed = parseInt(newValue || '130', 10);
      this.previewSize = Number.isFinite(parsed) ? parsed : 130;
      this.renderList();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          right: 20px;
          bottom: 120px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          max-width: 520px;
          z-index: 1200;
          pointer-events: none;
        }

        :host(.hidden) {
          display: none;
        }

        .item {
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .title {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.85);
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
      </style>
      <div id="list"></div>
    `;
  }

  renderList() {
    const list = this.shadowRoot.getElementById('list');
    if (!list) return;
    list.innerHTML = '';

    const dictionary = gameState.getState('diceDictionary') || DEFAULT_DICE;

    dictionary.forEach((die, dictionaryIndex) => {
      const item = document.createElement('div');
      item.className = 'item';

      const preview = document.createElement('dice-preview');
      preview.setAttribute('type', die.title);
      preview.setAttribute('size', String(this.previewSize));
      preview.sides = die.sides;

      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = die.title;

      const handleClick = (ev) => {
        ev.stopPropagation();
        this.addDieToGameSet(dictionaryIndex);
      };

      // Bind both on the container and on the preview to ensure it fires
      item.addEventListener('click', handleClick);
      preview.addEventListener('click', handleClick);

      item.appendChild(preview);
      item.appendChild(title);
      list.appendChild(item);
    });
  }

  addDieToGameSet(dictionaryIndex) {
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

  toggleVisibility(shouldShow) {
    if (shouldShow) {
      this.classList.remove('hidden');
    } else {
      this.classList.add('hidden');
    }
  }
}

customElements.define('dice-dictionary-list', DiceDictionaryListComponent);

export { DiceDictionaryListComponent };
