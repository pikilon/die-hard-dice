import { LitElement, html, css } from "lit";

/**
 * @typedef {Object} DieDiceProps
 * @property {string[]} sides - The sides of the die.
 * @property {string} _current - The currently displayed side.
 */

/**
 * A web component representing a die with customizable sides.
 * @element die-dice
 */
export class DieDice extends LitElement {
  /**
   * @type {typeof DieDiceProps}
   */
  static properties = {
    /** @type {string[]} */
    sides: { type: Array },
    /** @type {string} */
    _current: { state: true },
  };

  /**
   * @constructor
   */
  constructor() {
    super();
    /** @type {string[]} */
    this.sides = [];
    /** @type {string} */
    this._current = "";
  }

  updated(changedProps) {
    const propsHasChanged = changedProps.has("sides");

    if (changedProps.has("sides")) {
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

  render() {
    return html`<div class="side">${this._current}</div>`;
  }

  static styles = css`
    .side {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    button {
      font-size: 1rem;
      padding: 0.5rem 1rem;
      cursor: pointer;
    }
  `;
}

customElements.define("die-dice", DieDice);
