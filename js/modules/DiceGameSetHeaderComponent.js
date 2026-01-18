import { gameState } from "./gameState.js";

/**
 * Header for the game set drawer.
 * - Displays the total dice count.
 * - Lets the user edit the game title stored in gameState.
 */
class DiceGameSetHeaderComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.unsubscribeTitle = null;
    this.unsubscribeGameSet = null;
  }

  connectedCallback() {
    this.render();
    this._syncTitle();
    this._syncCount();
    this._setupHandlers();

    this.unsubscribeTitle = gameState.subscribe("title", () => {
      this._syncTitle();
    });

    this.unsubscribeGameSet = gameState.subscribe("gameSet", () => {
      this._syncCount();
    });
  }

  disconnectedCallback() {
    this.unsubscribeTitle?.();
    this.unsubscribeGameSet?.();
  }

  render() {
    this.shadowRoot.innerHTML = /*html*/ `
      <style>
        :host {
          display: block;
        }

        .header {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          color: #333;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          letter-spacing: 0.3px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-width: 240px;
          gap: 12px;
        }

        .title-group {
          display: flex;
          flex: 1;
          gap: 8px;
          align-items: center;
          min-width: 0;
        }

        .title-input {
          flex: 1;
          min-width: 0;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.3px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          background: rgba(255, 255, 255, 0.9);
          color: #222;
          outline: none;
          transition: border 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .title-input:focus {
          border-color: #2684ff;
          box-shadow: 0 0 0 3px rgba(38, 132, 255, 0.18);
          background: #fff;
        }

        .title-input::placeholder {
          color: rgba(0, 0, 0, 0.35);
        }

        .count {
          font-size: 14px;
          opacity: 0.7;
          white-space: nowrap;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
      </style>
      <header class="header">
        <div class="title-group">
          <label class="sr-only" for="title-input">Game title</label>
          <input
            id="title-input"
            class="title-input"
            type="text"
            name="game-title"
            autocomplete="off"
            maxlength="80"
            placeholder="Name this game"
            aria-label="Game title"
          />
        </div>
        <span id="count" class="count">0 dice</span>
      </header>
    `;
  }

  _setupHandlers() {
    const input = this.shadowRoot.getElementById("title-input");
    if (!input) return;

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        input.blur();
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        this._syncTitle();
        input.blur();
      }
    });

    input.addEventListener("blur", () => {
      this._commitTitle();
    });
  }

  _commitTitle() {
    const input = this.shadowRoot?.getElementById("title-input");
    if (!input) return;

    const nextTitle = input.value.trim() || "Dice Game";
    gameState.setTitle(nextTitle);
    input.value = nextTitle;
  }

  _syncTitle() {
    const input = this.shadowRoot?.getElementById("title-input");
    if (!input) return;

    const currentTitle = gameState.getState("title") || "Dice Game";
    if (input.value !== currentTitle) {
      input.value = currentTitle;
    }
  }

  _syncCount() {
    const countEl = this.shadowRoot?.getElementById("count");
    if (!countEl) return;

    const gameSet = gameState.getState("gameSet") || [];
    const totalDice = gameSet.reduce((acc, item) => acc + Number(item?.quantity ?? 0), 0);
    countEl.textContent = `${totalDice} dice`;
  }
}

customElements.define("dice-gameset-header", DiceGameSetHeaderComponent);

export { DiceGameSetHeaderComponent };
