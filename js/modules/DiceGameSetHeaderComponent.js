import { gameState } from "./gameState.js";
import { gamesetsStore } from "./gamesetsStore.js";

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

        .actions {
          display: flex;
          gap: 6px;
          padding: 0 14px 12px 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .actions button {
          flex: 1;
          padding: 7px 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          background: white;
          color: rgba(0, 0, 0, 0.8);
          font-size: 13px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          cursor: pointer;
          transition: all 0.15s ease;
          font-weight: 500;
        }

        .actions button:hover {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.3);
        }

        .actions button:active {
          transform: scale(0.98);
        }

        .actions button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .actions button.clone {
          color: #0066cc;
          border-color: #0066cc;
        }

        .actions button.clone:hover:not(:disabled) {
          background: rgba(0, 102, 204, 0.1);
        }

        .actions button.remove {
          color: #d32f2f;
          border-color: #d32f2f;
        }

        .actions button.remove:hover:not(:disabled) {
          background: rgba(211, 47, 47, 0.1);
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
      <div class="actions">
        <button class="clone" id="clone-btn" title="Clone this gameset">📋 Clone</button>
        <button class="remove" id="remove-btn" title="Remove this gameset">🗑️ Remove</button>
      </div>
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

    // Clone/Remove buttons
    const cloneBtn = this.shadowRoot.getElementById("clone-btn");
    const removeBtn = this.shadowRoot.getElementById("remove-btn");

    cloneBtn?.addEventListener("click", () => {
      const currentGameset = gamesetsStore.getCurrentGameset();
      const newId = gamesetsStore.cloneGameset(currentGameset.id);
      if (newId) {
        gamesetsStore.switchGameset(newId);
      }
    });

    removeBtn?.addEventListener("click", () => {
      const currentGameset = gamesetsStore.getCurrentGameset();
      if (gamesetsStore.isSystemGameset(currentGameset.id)) {
        return;
      }
      const confirmed = confirm(`Are you sure you want to remove "${currentGameset.title}"?`);
      if (confirmed) {
        gamesetsStore.removeGameset(currentGameset.id);
      }
    });

    this._updateRemoveButton();
    gamesetsStore.subscribe(() => this._updateRemoveButton());
  }

  _updateRemoveButton() {
    const removeBtn = this.shadowRoot?.getElementById("remove-btn");
    if (!removeBtn) return;
    const currentGameset = gamesetsStore.getCurrentGameset();
    const isSystem = gamesetsStore.isSystemGameset(currentGameset.id);
    removeBtn.disabled = isSystem;
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
