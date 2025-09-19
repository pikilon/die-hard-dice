import { LitElement, html, css } from "lit";

export class DieDice extends LitElement {
  static properties = {
    sides: { type: Array },
    _current: { state: true },
  };

  constructor() {
    super();
    this.sides = [];
    this._current = "";
  }

  updated(changedProps) {
    if (
      changedProps.has("sides") &&
      Array.isArray(this.sides) &&
      this.sides.length > 0
    ) {
      this._current = this.sides[0];
    }
  }

  roll() {
    if (!Array.isArray(this.sides) || this.sides.length === 0) return undefined;
    const idx = Math.floor(Math.random() * this.sides.length);
    this._current = this.sides[idx];
    return this._current;
  }

  render() {
    return html` <div class="side">${this._current}</div> `;
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
