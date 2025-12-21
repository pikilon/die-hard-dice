import { gameState } from "./gameState.js";
import "./DiceGameCardComponent.js";
import "./DiceAddFromDictionaryComponent.js";

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
    this.shadowRoot.innerHTML = `
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
        }

        .header span {
          font-size: 14px;
          opacity: 0.7;
        }

        .cards {
          padding: 10px;
          /* Allow stylable select popup to escape while still scrolling */
          overflow: visible;
          max-height: calc(100dvh - 70px);
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

        /* add-card styles are encapsulated within the component */
      </style>
      <div class="drawer" id="drawer">
        <div class="header">
          <div>Game Set</div>
          <span id="count">0 dice</span>
        </div>
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

    applyState();
  }

  _renderCards() {
    const cardsContainer = this.shadowRoot.getElementById("cards");
    const counter = this.shadowRoot.getElementById("count");
    if (!cardsContainer || !counter) return;

    cardsContainer.innerHTML = "";

    const state = gameState.getState();
    const { gameSet, diceDictionary } = state;

    // Add component for selecting and adding dice from dictionary
    const addComponent = document.createElement("dice-add-from-dictionary");
    cardsContainer.appendChild(addComponent);

    const sortedSet = [...gameSet].sort(
      (a, b) => a.dictionaryIndex - b.dictionaryIndex
    );
    let totalDice = 0;

    sortedSet.forEach((entry) => {
      const diceDef = diceDictionary[entry.dictionaryIndex];
      if (!diceDef) return;
      totalDice += entry.quantity;
      const card = document.createElement("dice-game-card");
      card.setAttribute("dictionary-index", String(entry.dictionaryIndex));
      cardsContainer.appendChild(card);
    });

    counter.textContent = `${totalDice} dice`;

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
