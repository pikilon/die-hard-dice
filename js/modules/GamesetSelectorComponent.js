import { gamesetsStore } from "./gamesetsStore.js";

/**
 * Gameset Selector Component
 * Dropdown to switch, clone, and remove gamesets
 */
class GamesetSelectorComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.unsubscribe = null;
  }

  connectedCallback() {
    this.render();
    this.unsubscribe = gamesetsStore.subscribe(() => {
      this.render();
    });
  }

  disconnectedCallback() {
    this.unsubscribe?.();
  }

  render() {
    const currentGameset = gamesetsStore.getCurrentGameset();
    const allGamesets = gamesetsStore.getAllGamesets();
    const isSystem = gamesetsStore.isSystemGameset(currentGameset.id);
    const hideLabel = this.hasAttribute("hide-label");

    this.shadowRoot.innerHTML = /*html*/ `
      <style>
        :host {
          display: block;
          padding: 12px 12px 8px 12px;
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .select-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.7);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        select {
          flex: 1;
          padding: 8px 10px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          background: white;
          font-size: 14px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }

        select:hover {
          border-color: rgba(0, 0, 0, 0.3);
        }

        select:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        optgroup {
          font-weight: 600;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);
        }

        option {
          padding: 4px 8px;
          font-size: 14px;
        }

        .actions {
          display: flex;
          gap: 6px;
        }

        button {
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

        button:hover {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.3);
        }

        button:active {
          transform: scale(0.98);
        }

        button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        button:disabled:hover {
          background: white;
          border-color: rgba(0, 0, 0, 0.2);
        }

        button.clone {
          color: #0066cc;
          border-color: #0066cc;
        }

        button.clone:hover:not(:disabled) {
          background: rgba(0, 102, 204, 0.1);
          border-color: #0052a3;
        }

        button.remove {
          color: #d32f2f;
          border-color: #d32f2f;
        }

        button.remove:hover:not(:disabled) {
          background: rgba(211, 47, 47, 0.1);
          border-color: #b71c1c;
        }

        .system-badge {
          display: inline-block;
          padding: 2px 6px;
          margin-left: 6px;
          background: rgba(0, 102, 204, 0.1);
          color: #0066cc;
          font-size: 10px;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
      </style>

      <div class="container">
        <div class="select-row">
        
          <select id="gameset-select">
            ${this._renderOptions(allGamesets, currentGameset.id)}
          </select>
        </div>
      </div>
    `;

    this._attachListeners();
  }

  _renderOptions(gamesets, currentId) {
    const systemGamesets = gamesets.filter((gs) => gs.isSystem);
    const customGamesets = gamesets.filter((gs) => !gs.isSystem);

    let html = "";

    if (systemGamesets.length > 0) {
      html += '<optgroup label="System Gamesets">';
      systemGamesets.forEach((gs) => {
        const selected = gs.id === currentId ? "selected" : "";
        html += `<option value="${gs.id}" ${selected}>${gs.title}</option>`;
      });
      html += "</optgroup>";
    }

    if (customGamesets.length > 0) {
      html += '<optgroup label="Custom Gamesets">';
      customGamesets.forEach((gs) => {
        const selected = gs.id === currentId ? "selected" : "";
        html += `<option value="${gs.id}" ${selected}>${gs.title}</option>`;
      });
      html += "</optgroup>";
    }

    return html;
  }

  _attachListeners() {
    const select = this.shadowRoot.getElementById("gameset-select");
    const cloneBtn = this.shadowRoot.getElementById("clone-btn");
    const removeBtn = this.shadowRoot.getElementById("remove-btn");

    select?.addEventListener("change", (e) => {
      const gamesetId = e.target.value;
      gamesetsStore.switchGameset(gamesetId);
    });

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

      const confirmed = confirm(
        `Are you sure you want to remove "${currentGameset.title}"?`,
      );
      if (confirmed) {
        gamesetsStore.removeGameset(currentGameset.id);
      }
    });
  }
}

customElements.define("gameset-selector", GamesetSelectorComponent);

export { GamesetSelectorComponent };
