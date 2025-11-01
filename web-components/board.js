import { LitElement, html, css } from "lit";
import "../web-components/dice.js";
import { subscribe } from "../state/game-state.js";

export class BoardComponent extends LitElement {
  static properties = {
    dice: { type: Array },
    diceOrder: { type: Array },
  };

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
    }
    .stage {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    }
  `;

  constructor() {
    super();
    this.dice = [];
    this.diceOrder = [];
    this._unsubscribe = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // Subscribe to game state changes
    this._unsubscribe = subscribe((state) => {
      this.dice = state.dice;
      this.diceOrder = state.diceOrder;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Unsubscribe when component is removed
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  _getDiceComponents = () => this.shadowRoot.querySelectorAll("die-dice");

  getCurrentValues = () =>
    Array.from(this._getDiceComponents()).map((dice) => dice.getCurrentValue());

  rollAllDice = () => this._getDiceComponents().map((dice) => dice.roll());

  render() {
    return html`
      <div class="stage">
        ${this.diceOrder.map((diceIndex) => {
          const dice = this.dice[diceIndex];
          if (!dice) return null;
          return html`<die-dice .sides=${dice.sides}></die-dice>`;
        })}
      </div>
    `;
  }
}

customElements.define("die-board", BoardComponent);
