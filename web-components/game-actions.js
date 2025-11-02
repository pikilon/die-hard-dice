// @ts-check
import { LitElement, html } from "lit";
import { createDice } from "../state/game-state.js";
import { ELEMENTS } from "../html-selectors.js";
import { subscribe } from "../state/game-state.js";

/** @typedef {import('../types/game.d.ts').Dice} Dice */
/** @typedef {import('../types/game.d.ts').UnsubscribeFunction} UnsubscribeFunction */

class GameActions extends LitElement {
  constructor() {
    super();
    /** @type {Dice[]} */
    this.dice = [];
    /** @type {UnsubscribeFunction | null} */
    this._unsubscribe = null;
  }

  // subscribe to game state to get dice
  connectedCallback() {
    super.connectedCallback();
    this._unsubscribe = subscribe((state) => {
      this.dice = state.dice;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  render() {
    
    return html`
      <div>
        <button @click=${createDice}>Add Die</button>
        <roll-all-dice-button></roll-all-dice-button>
        ${this.dice.length
          ? html`<button @click=${() => {
              const board = /** @type {any} */ (ELEMENTS.BOARD);
              if (board?.rollAllDice) board.rollAllDice();
            }}>
              Roll All Dice
            </button>`
          : ""}
      </div>
    `;
  }
}
customElements.define("game-actions", GameActions);
