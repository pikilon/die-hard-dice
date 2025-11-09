import { LitElement, html, css } from "lit";
import { subscribe, setTitle } from "../state/game-state.js";

export class GameTitleComponent extends LitElement {
  static properties = {
    title: { type: String, state: true },
    isFocused: { type: Boolean, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    label {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: text;
    }

    .pencil {
      font-size: 0.8em;
      opacity: 0.6;
      user-select: none;
    }

    label:hover .pencil {
      opacity: 1;
    }

    input {
      font-size: inherit;
      font-family: inherit;
      font-weight: inherit;
      color: inherit;
      background: transparent;
      border: none;
      outline: none;
      padding: 0;
      margin: 0;
      width: 100%;
      min-width: 200px;
    }

    input::placeholder {
      color: #999;
      opacity: 0.7;
    }

    /* When not focused and has value, hide the border/input appearance */
    input:not(:focus) {
      cursor: pointer;
    }

    /* Show a subtle underline on focus */
    input:focus {
      border-bottom: 2px solid currentColor;
      padding-bottom: 2px;
    }
  `;

  constructor() {
    super();
    /** @type {string} */
    this.title = "";
    /** @type {boolean} */
    this.isFocused = false;
    /** @type {UnsubscribeFunction | null} */
    this._unsubscribe = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // Subscribe to game state changes
    this._unsubscribe = subscribe((state) => {
      this.title = state.title || "";
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  /**
   * Handle input changes
   * @param {Event} e
   */
  _handleInput(e) {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const newTitle = target.value;
    setTitle(newTitle);
  }

  _handleFocus() {
    this.isFocused = true;
  }

  _handleBlur() {
    this.isFocused = false;
  }

  _handleLabelClick() {
    // Focus the input when label is clicked
    const input = this.shadowRoot.querySelector("input");
    if (input) {
      input.focus();
    }
  }

  render() {
    return html`
      <label @click=${this._handleLabelClick}>
        <input
          type="text"
          .value=${this.title}
          @input=${this._handleInput}
          @focus=${this._handleFocus}
          @blur=${this._handleBlur}
          placeholder="Set the game title"
          aria-label="Game title" />
        <span class="pencil">✏️</span>
      </label>
    `;
  }
}

customElements.define("game-title", GameTitleComponent);
