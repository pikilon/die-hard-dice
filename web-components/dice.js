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

  render() {
    return html`<div class="side">${this._current}</div>`;
  }

  static styles = css`
    :host {
      display: inline-block;
    }
    .side {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border-radius: 16px;
      border: 3px solid #e0e0e0;
      box-shadow:
        0 2px 8px 0 rgba(0,0,0,0.18),
        0 0.5px 1.5px 0 rgba(0,0,0,0.10) inset;
      font-size: 2.5rem;
      font-weight: bold;
      color: #222;
      user-select: none;
      margin: 0 auto;
      transition: box-shadow 0.2s, border-color 0.2s;
    }
    .side:active {
      box-shadow: 0 1px 4px 0 rgba(0,0,0,0.12);
      border-color: #bdbdbd;
    }
  `;
}

customElements.define("die-dice", DieDice);
