import { LitElement, html, css } from "lit";
import { createDice } from "../state/game-state.js";

class GameActions extends LitElement {
  constructor() {
    super();
  }

  render() {
    return html`
      <div>
        <button @click=${createDice}>Add Die</button>
      </div>
    `;
  }
}

customElements.define("game-actions", GameActions);
