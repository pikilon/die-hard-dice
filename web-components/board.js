import { LitElement, html, css } from "lit";
import "../web-components/dice.js";
import { getGameState } from "../state/game-state.js";

export class BoardComponent extends LitElement {
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
    button {
      margin-top: 1rem;
    }
  `;

  constructor() {
    super();
    this.diceElements = [];
  }

  firstUpdated() {
    this._setupDices();
  }

  _setupDices() {
    // Get game state and render dice
    const gameState = getGameState();
    this.diceElements = [];
    this.diceData = (gameState.diceOrder || []).map((diceIndex) => {
      const dice = gameState.dice[diceIndex];
      if (!dice) return null;
      return {
        sides: dice.sides.split("|")
      };
    }).filter(Boolean);
    this.requestUpdate();
  }

  _rollAll() {
    // Roll all dice and log results
    const results = this.shadowRoot.querySelectorAll('die-dice');
    const rolled = Array.from(results).map(die => die.roll());
    console.log('Rolled:', rolled);
  }

  render() {
    return html`
      <div class="stage">
        ${this.diceData?.map(
          dice => html`<die-dice .sides=${dice.sides}></die-dice>`
        )}
      </div>
      <button @click=${this._rollAll}>Roll All dices</button>
    `;
  }
}

customElements.define('die-board', BoardComponent);
