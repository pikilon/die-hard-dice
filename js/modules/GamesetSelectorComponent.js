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

    this.shadowRoot.innerHTML = /*html*/ `
      <style>
          select {
            width: 100%;
            flex: 1;
            padding: 8px 10px;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            background: white;
            font-size: 14px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            cursor: pointer;
            transition: border-color 0.15s ease;

            &:hover {
              border-color: rgba(0, 0, 0, 0.3);
            }

            &:focus {
              outline: none;
              border-color: #0066cc;
              box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
            }
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
        }
      </style>


          <select id="gameset-select">
            ${this._renderOptions(allGamesets, currentGameset.id)}
          </select>

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
