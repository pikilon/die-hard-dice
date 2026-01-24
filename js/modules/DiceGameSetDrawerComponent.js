import { gameState } from "./gameState.js";
import "./DiceGameCardComponent.js";
import "./DiceAddFromDictionaryComponent.js";
import "./DiceGameSetHeaderComponent.js";
import "./GamesetSelectorComponent.js";

/**
 * Drawer that lists the current game set as interactive cards.
 * - Opens from the left side (opposite to the dictionary list on the right).
 * - Cards scroll vertically when overflowing.
 * - Toggle button to open/close.
 */
class DiceGameSetDrawerComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.isOpen = false;
    this.unsubscribeGameSet = null;
    this.unsubscribeDictionary = null;
  }

  connectedCallback() {
    this.render();
    this._renderCards();
    this._setupToggle();

    this.unsubscribeGameSet = gameState.subscribe("gameSet", () => {
      this._renderCards();
    });

    this.unsubscribeDictionary = gameState.subscribe("diceDictionary", () => {
      this._renderCards();
    });
  }

  disconnectedCallback() {
    this.unsubscribeGameSet?.();
    this.unsubscribeDictionary?.();
  }

  render() {
    this.shadowRoot.innerHTML = /*html*/ `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1300;
          pointer-events: none;
        }

        .toggle {
          pointer-events: auto;
          position: absolute;
          top: 12px;
          right: -42px;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          background: rgba(255, 255, 255, 0.8);
          color: #333;
          font-size: 18px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: transform 0.18s ease, background 0.18s ease, border 0.18s ease;
        }

        .toggle:hover {
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(0, 0, 0, 0.3);
        }

        .drawer {
          pointer-events: auto;
          width: 0;
          max-height: 100dvh;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(0, 0, 0, 0.15);
          border-radius: 0 12px 12px 0;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transition: width 0.22s ease, overflow 0.12s ease;
          interpolate-size: allow-keywords;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .drawer.open {
          width: auto;
          /* Let native select popup escape the drawer when open */
          overflow: visible;
        }

        .cards {
          padding: 10px;
          overflow-y: auto;
          overflow-x: hidden;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .empty {
          color: rgba(0, 0, 0, 0.6);
          font-size: 14px;
          padding: 14px;
          text-align: center;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .close-btn {
          display: none;
        }

        .desktop-selector {
          display: block;
        }

        .add-dice-container {
          flex-shrink: 0;
          padding: 10px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        @media (max-width: 768px) {
          .add-dice-container {
            padding: 12px;
          }
          .toggle {
            width: 48px;
            height: 48px;
            font-size: 24px;
            position: fixed;
            top: 12px;
            left: 12px;
            right: auto;
          }

          .drawer.open ~ .toggle {
            display: none;
          }

          .drawer {
            position: fixed;
            top: 0;
            left: 0;
            height: 100dvh;
            max-height: 100dvh;
            border-radius: 0;
          }

          .drawer.open {
            width: 100vw;
            max-width: 100vw;
          }

          .close-btn {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            flex-shrink: 0;
          }

          .mobile-header-selector {
            display: block;
            flex: 1;
            margin-right: 12px;
          }

          .desktop-selector {
            display: none;
          }

          .close-btn button {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            border: 1px solid rgba(0, 0, 0, 0.2);
            background: rgba(0, 0, 0, 0.05);
            color: #333;
            font-size: 24px;
            cursor: pointer;
            flex-shrink: 0;
          }

          .cards {
            padding: 12px;
            gap: 12px;
            overflow-y: auto;
            flex: 1;
            min-height: 0;
          }

          .empty {
            font-size: 16px;
            padding: 18px;
          }
        }

        /* add-card styles are encapsulated within the component */
      </style>
      <div class="drawer" id="drawer">
        <div class="close-btn">
          <div class="mobile-header-selector">
            <gameset-selector hide-label></gameset-selector>
          </div>
          <button id="closeBtn" aria-label="Close drawer">×</button>
        </div>
        <gameset-selector class="desktop-selector"></gameset-selector>
        <dice-gameset-header></dice-gameset-header>
        <div class="add-dice-container" id="addDiceContainer"></div>
        <div class="cards" id="cards"></div>
      </div>
      <button class="toggle" id="toggle" aria-label="Toggle game set drawer">☰</button>
    `;
  }

  _setupToggle() {
    const toggle = this.shadowRoot.getElementById("toggle");
    const drawer = this.shadowRoot.getElementById("drawer");
    if (!toggle || !drawer) return;

    const applyState = () => {
      drawer.classList.toggle("open", this.isOpen);
      toggle.style.transform = this.isOpen
        ? "translateX(4px)"
        : "translateX(0)";
      toggle.textContent = this.isOpen ? "×" : "☰";
    };

    toggle.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.isOpen = !this.isOpen;
      applyState();
    });

    const closeBtn = this.shadowRoot.getElementById("closeBtn");
    closeBtn?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.isOpen = false;
      applyState();
    });

    applyState();
  }

  _renderCards() {
    const cardsContainer = this.shadowRoot.getElementById("cards");
    const addDiceContainer = this.shadowRoot.getElementById("addDiceContainer");
    const mobileTitle = this.shadowRoot.getElementById("mobileTitle");
    if (!cardsContainer) return;

    cardsContainer.innerHTML = "";

    const state = gameState.getState();
    const { gameSet, diceDictionary, title } = state;

    
    // Add component for selecting and adding dice from dictionary (outside scroll)
    if (addDiceContainer && !addDiceContainer.querySelector("dice-add-from-dictionary")) {
      const addComponent = document.createElement("dice-add-from-dictionary");
      addDiceContainer.appendChild(addComponent);
    }

    const sortedSet = [...gameSet].map((entry, index) => ({ ...entry, _index: index })).sort(
      (a, b) => a.dictionaryIndex - b.dictionaryIndex
    );

    sortedSet.forEach((entry) => {
      const diceDef = diceDictionary[entry.dictionaryIndex];
      if (!diceDef) return;
      const card = document.createElement("dice-game-card");
      card.setAttribute("dictionary-index", String(entry.dictionaryIndex));
      card.setAttribute("gameset-index", String(entry._index));
      cardsContainer.appendChild(card);
    });

    if (sortedSet.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No dice in your set. Tap a die to add it.";
      cardsContainer.appendChild(empty);
    }
  }

  // Add logic now lives in dice-add-from-dictionary component
}

customElements.define("dice-gameset-drawer", DiceGameSetDrawerComponent);

export { DiceGameSetDrawerComponent };
