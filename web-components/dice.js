import { LitElement, html, css } from "lit";

/**
 * A web component representing a die with customizable sides.
 * @element die-dice
 */
export class DieDice extends LitElement {
  static get properties() {
    return {
      sides: { type: Array },
      color: { type: String },
      _current: { state: true },
      _menuOpen: { state: true },
    };
  }

  /**
   * @constructor
   */
  constructor() {
    super();
    /** @type {string[]} */
    this.sides = [];
    /** @type {string} */
    this.color = "#000000";
    /** @type {string} */
    this._current = "";
    /** @type {boolean} */
    this._menuOpen = false;
    this._boundCloseMenu = this._closeMenu.bind(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this._boundCloseMenu);
    window.removeEventListener('contextmenu', this._boundCloseMenu);
  }

  /**
   * @param {Map<string, any>} changedProps
   */
  updated(changedProps) {
    const propsHasChanged = changedProps.has("sides");

    if (propsHasChanged) {
      this._current = this.sides[0];
    }
  }

  /**
   * Rolls the die and returns the result.
   * @returns {string}
   */
  roll() {
    const { sides } = this;
    if (sides.length === 0) return "";
    if (sides.length === 1) return sides[0];
    const idx = Math.floor(Math.random() * sides.length);
    this._current = sides[idx];
    return this._current;
  }
  /**
   * Gets the current value of the die.
   * @returns {string}
   */
  getCurrentValue() {
    return this._current;
  }

  _closeMenu() {
    this._menuOpen = false;
    window.removeEventListener('click', this._boundCloseMenu);
    window.removeEventListener('contextmenu', this._boundCloseMenu);
  }

  _handleContextMenu(e) {
    e.preventDefault();
    this._menuOpen = true;
    
    requestAnimationFrame(() => {
      window.addEventListener('click', this._boundCloseMenu);
      window.addEventListener('contextmenu', this._boundCloseMenu);
    });
  }

  _handleEdit(e) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('dice-edit', { bubbles: true, composed: true }));
    this._closeMenu();
  }

  _handleClone(e) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('dice-clone', { bubbles: true, composed: true }));
    this._closeMenu();
  }

  _handleDelete(e) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('dice-delete', { bubbles: true, composed: true }));
    this._closeMenu();
  }

  render() {
    return html`
      <div class="side" style="background-color: ${this.color}" @contextmenu=${this._handleContextMenu}>
        <span style="color: white; mix-blend-mode: difference;">${this._current}</span>
        ${this._menuOpen ? html`
          <div class="menu">
            <button @click=${this._handleEdit}>Editar</button>
            <button @click=${this._handleClone}>Clonar</button>
            <button @click=${this._handleDelete}>Eliminar</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: inline-block;
    }
    .side {
      position: relative;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border-radius: 16px;
      border: 3px solid #e0e0e0;
      box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.18),
        0 0.5px 1.5px 0 rgba(0, 0, 0, 0.1) inset;
      font-size: 2.5rem;
      font-weight: bold;
      color: #222;
      user-select: none;
      margin: 0 auto;
      transition: box-shadow 0.2s, border-color 0.2s;
    }
    .side:active {
      box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.12);
      border-color: #bdbdbd;
    }
    .menu {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 10;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 100px;
    }
    .menu button {
      background: none;
      border: none;
      padding: 8px 16px;
      cursor: pointer;
      text-align: left;
      font-size: 1rem;
      color: #333;
      width: 100%;
    }
    .menu button:hover {
      background-color: #f0f0f0;
    }
  `;
}

customElements.define("die-dice", DieDice);
