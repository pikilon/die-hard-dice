import { DicePreviewComponent } from "./DicePreviewComponent.js";
import { gameState } from "./gameState.js";

const css = /*css*/ `
:host {
  display: block;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    width: 100%;
}



  .select {
    appearance: base-select;
    width: 100%;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.95);
    color: #222;
    font-size: 13px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    --thumb-size: 64px;
    cursor: pointer;
    position: relative;
    z-index: 20;

    &::picker-icon {
      display: none;
    }

    button {
      all: unset;
      display: flex;
    justify-content: space-between;
    align-items: center;
      width: 100%;
      padding: 6px 12px;
      cursor: pointer;
    }

    .close-dropdown {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: space-between;
      width: 100%;

      & + .option-text {
        display: none;
      }
      button & {
        display: none;
        & + .option-text {
          display: block;
        }
      }

    }


    &::picker(select) {
      appearance: base-select;
      border: 1px solid rgba(0, 0, 0, 0.18);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
      background: #fff;
      width: 90%;
      box-sizing: border-box;
      
    }
    option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      cursor: pointer;
      min-width: 0;


      &:hover {
        background-color: rgba(0, 0, 0, 0.06);
      }
      /* Hide the default selected-option checkmark inside the picker */
      &::checkmark {
        display: none;
      }
      .avatar {
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.04);
      }

      .option-text {
        min-width: 0;
      }

      .title {
        font-weight: 600;
      }

      .subtitle {
        font-size: 11px;
        color: rgba(0, 0, 0, 0.6);
      }
    }

  }


`;

/**
 * Component that shows a dropdown of available dice (dictionary)
 * and adds the selected die to the current game set.
 */
class DiceAddFromDictionaryComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.unsubscribeDictionary = null;
    this.dictionary = gameState.getState("diceDictionary") || [];
    this.previewCache = new Map();
  }

  connectedCallback() {
    this.render();
    this._bindEvents();
    this._buildPreviews();
    this._renderOptions();

    // Subscribe to dice dictionary updates
    this.unsubscribeDictionary = gameState.subscribe(
      "diceDictionary",
      (dict) => {
        this.dictionary = dict || [];
        this._buildPreviews();
        this._renderOptions();
      },
    );
  }

  disconnectedCallback() {
    this.unsubscribeDictionary?.();
    this._unbindEvents();
  }

  render() {
    this.shadowRoot.innerHTML = /*html*/ `
      <style>
      ${css}
      </style>
        <select id="diceSelect" class="select" aria-label="Add die to game" autocomplete="off">
          <button>

              <selectedcontent></selectedcontent>
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="m7 10l5 5l5-5z"/>
              </svg>

          </button>
        </select>
        <!-- Templates for building options -->
        <template id="diceOptionTpl">
          <option value="__INDEX__">
            <span class="avatar"><dice-preview size="64"></dice-preview></span>
            <div class="option-text">
              <div class="title">__TITLE__</div>
              <div class="subtitle">__SIDES__ sides</div>
            </div>
          </option>
        </template>
        <template id="dicePlaceholderTpl">
          <option value="" selected>
          <div class="close-dropdown">
            <span>Cancel</span>
            <span>×</span>
          </div>
            <div class="option-text">
              <div class="title">Select a die to add</div>
              <div class="subtitle"></div>
            </div>
          </option>
        </template>
        <template id="diceCreateTpl">
          <option value="__CREATE__">
            <div class="option-text">
              <div class="title">Create a new dice</div>
              <div class="subtitle">Add custom sides</div>
            </div>
          </option>
        </template>
    `;
  }

  _buildPreviews() {
    this.previewCache.clear();
    const size = 56;
    this.dictionary.forEach((die, index) => {
      try {
        const preview = new DicePreviewComponent();
        preview.size = size;
        preview.sides = die.sides;
        preview.render?.();
        preview.updateSnapshot?.();
        const imgEl = preview.shadowRoot?.getElementById("snapshot");
        const src = imgEl?.src || imgEl?.getAttribute("src");
        if (src) this.previewCache.set(index, src);
      } catch (err) {
        console.warn(
          "DiceAddFromDictionaryComponent: preview generation failed",
          err,
        );
      }
    });
  }

  _renderOptions() {
    const select = this.shadowRoot.getElementById("diceSelect");
    if (!select) return;
    // Build options using templates in shadow DOM
    const optionTpl = this.shadowRoot.getElementById("diceOptionTpl");
    const placeholderTpl = this.shadowRoot.getElementById("dicePlaceholderTpl");
    const createTpl = this.shadowRoot.getElementById("diceCreateTpl");
    if (!optionTpl || !placeholderTpl) return;

    // Remove existing options but keep non-option children (button/selectedcontent)
    select.querySelectorAll("option").forEach((opt) => opt.remove());
    // Add placeholder option first
    select.appendChild(placeholderTpl.content.cloneNode(true));
    // Add imageless create option under the first
    if (createTpl) {
      select.appendChild(createTpl.content.cloneNode(true));
    }

    this.dictionary.forEach((die, index) => {
      const sidesCount = Array.isArray(die.sides) ? die.sides.length : 0;
      const safeTitle = String(die.title);

      const frag = optionTpl.content.cloneNode(true);
      const optEl = frag.querySelector("option");
      const titleEl = frag.querySelector(".title");
      const subEl = frag.querySelector(".subtitle");

      if (optEl) optEl.value = String(index);
      if (titleEl) titleEl.textContent = safeTitle;
      if (subEl) subEl.textContent = `${sidesCount} sides`;

      // Append first, then configure dice-preview to ensure it has a shadow DOM
      select.appendChild(frag);
      const appendedOption = select.querySelector("option:last-of-type");
      const previewEl = appendedOption?.querySelector("dice-preview");
      if (previewEl) {
        previewEl.sides = Array.isArray(die.sides) ? [...die.sides] : [];
        // Ensure snapshot is generated even if connectedCallback timing differs
        previewEl.render?.();
        previewEl.updateSnapshot?.();
      }
    });

    // Keep placeholder selected; selectedcontent always shows it
    select.value = "";
  }

  _bindEvents() {
    const select = this.shadowRoot.getElementById("diceSelect");
    if (!select) return;

    const onSelectChange = ({ target }) => {
      if (!target.value) return;
      const { value } = target;
      if (value === "__CREATE__") {
        gameState.setCreateEditDiceIndex(-1);
        target.value = "";
        return;
      }
      this._addDieToGameSet(parseInt(value, 10));
      target.value = "";
    };

    select.addEventListener("change", onSelectChange);
  }

  _unbindEvents() {
    const select = this.shadowRoot.getElementById("diceSelect");
    if (select && this._onChange)
      select.removeEventListener("change", this._onChange);
    if (select && this._onPointerDown)
      select.removeEventListener("pointerdown", this._onPointerDown);
  }

  _addDieToGameSet(dictionaryIndex) {
    const current = gameState.getState("gameSet");

    // Look for an entry with the same dictionaryIndex that has no explicit color set
    // (i.e., uses the default color)
    const existingDefault = current.find(
      (d) => d.dictionaryIndex === dictionaryIndex && !d.color,
    );

    if (existingDefault) {
      // Merge with the default color entry by increasing quantity
      const updated = current.map((d) =>
        d.dictionaryIndex === dictionaryIndex && !d.color
          ? { ...d, quantity: d.quantity + 1 }
          : d,
      );
      gameState.setGameSet(updated);
    } else {
      // Create a new entry (either because no entry exists, or all existing entries have colors)
      const updated = [...current, { dictionaryIndex, quantity: 1 }];
      gameState.setGameSet(updated);
    }
  }
}

customElements.define(
  "dice-add-from-dictionary",
  DiceAddFromDictionaryComponent,
);

export { DiceAddFromDictionaryComponent };
