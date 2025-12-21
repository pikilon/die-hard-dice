import { DicePreviewComponent } from "./DicePreviewComponent.js";
import { gameState } from "./gameState.js";
import { validateDiceSides } from "./notationUtils.js";

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
      }
    );
  }

  disconnectedCallback() {
    this.unsubscribeDictionary?.();
    this._unbindEvents();
  }

  render() {
    this.shadowRoot.innerHTML = /*html*/ `
      <style>
        :host {
          display: block;
        }

          .add-card {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 10px;
            border-radius: 10px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            z-index: 10;

            .label {
              font-size: 12px;
              color: rgba(0, 0, 0, 0.7);
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
                display: block;
                width: 100%;
                padding: 10px 12px;
                cursor: pointer;
              }

              &::picker(select) {
                appearance: base-select;
                border: 1px solid rgba(0, 0, 0, 0.18);
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
                padding: 3px 0;
                background: #fff;
                min-width: 240px;

                option {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  padding: 8px 10px;
                  cursor: pointer;

                  &:hover { background-color: rgba(0, 0, 0, 0.06); }
                }
              }
            }

            .selected-row {
              display: grid;
              grid-template-columns: 1fr 24px;
              align-items: center;
              gap: 10px;
            }

            .custom-option {
              display: grid;
              grid-template-columns: var(--thumb-size) 1fr;
              gap: 10px;
              align-items: center;
              min-height: calc(var(--thumb-size) + 6px);

              .avatar {
                border-radius: 8px;
                background: rgba(0, 0, 0, 0.04);
              }

              .title { font-weight: 600; }

              .subtitle { font-size: 11px; color: rgba(0, 0, 0, 0.6); }
            }
          }
          }
        }
      </style>
      <div class="add-card">
        <span class="label">Add die:</span>
        <select id="diceSelect" class="select" aria-label="Add die to game" autocomplete="off">
          <button>
            <div class="selected-row">
              <selectedcontent></selectedcontent>
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="m7 10l5 5l5-5z"/>
              </svg>
            </div>
          </button>
        </select>
        <!-- Templates for building options -->
        <template id="diceOptionTpl">
          <option value="__INDEX__">
            <div class="custom-option">
              <span class="avatar"><dice-preview size="64"></dice-preview></span>
              <div>
                <div class="title">__TITLE__</div>
                <div class="subtitle">__SIDES__ sides</div>
              </div>
            </div>
          </option>
        </template>
        <template id="dicePlaceholderTpl">
          <option value="" selected>
            <div class="custom-option">
              <div>
                <div class="title">Select a die to add</div>
                <div class="subtitle"></div>
              </div>
            </div>
          </option>
        </template>
      </div>
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
          err
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
    if (!optionTpl || !placeholderTpl) return;

    // Remove existing options but keep non-option children (button/selectedcontent)
    select.querySelectorAll("option").forEach((opt) => opt.remove());
    // Add placeholder option first
    select.appendChild(placeholderTpl.content.cloneNode(true));

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

    this._onChange = (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLSelectElement)) return;
      const idx = parseInt(target.value || "-1", 10);
      if (Number.isFinite(idx) && idx >= 0) {
        this._addDieToGameSet(idx);
        target.value = "";
      }
    };

    this._onPointerDown = () => {
      if (typeof select.showPicker === "function") {
        try {
          select.showPicker();
        } catch {}
      }
    };

    select.addEventListener("change", this._onChange);
    select.addEventListener("pointerdown", this._onPointerDown);
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
    const existing = current.find((d) => d.dictionaryIndex === dictionaryIndex);
    if (existing) {
      const updated = current.map((d) =>
        d.dictionaryIndex === dictionaryIndex
          ? { ...d, quantity: d.quantity + 1 }
          : d
      );
      gameState.setGameSet(updated);
    } else {
      const updated = [...current, { dictionaryIndex, quantity: 1 }];
      gameState.setGameSet(updated);
    }
  }
}

customElements.define(
  "dice-add-from-dictionary",
  DiceAddFromDictionaryComponent
);

export { DiceAddFromDictionaryComponent };
