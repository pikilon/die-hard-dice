import { gameState } from "./gameState.js";
import { DicePreviewComponent } from "./DicePreviewComponent.js";

const css = /*css*/ `
:host { display: contents; }

.dialog {
  border: none;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.25);
  padding: 0;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

form { 
  padding: 2em; 
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-shrink: 0; }
.header h2 { margin: 0; font-size: 16px; }

.preview-container { display: flex; justify-content: center; margin-bottom: 16px; flex-shrink: 0; }
.preview-container dice-preview { border-radius: 8px; }

.field { margin-bottom: 12px; flex-shrink: 0; }
.field.sides-field { 
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.label { font-size: 12px; color: rgba(0,0,0,0.7); margin-bottom: 6px; display: block; }
.input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.2); font-size: 13px; }

.sides-scroll-wrapper {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
}

.sides {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.side-row { display: grid; grid-template-columns: 1fr 36px; gap: 8px; align-items: center; }
.side-input { 
  padding: 10px 8px; 
  border-radius: 8px; 
  border: 1px solid rgba(0,0,0,0.2); 
  font-size: 13px;
  width: 100%;
  text-align: center;
}
.side-remove { border: none; background: #f5f5f5; border-radius: 8px; cursor: pointer; height: 36px; width: 36px; }
.side-remove[disabled] { opacity: 0.5; cursor: not-allowed; }

.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; flex-shrink: 0; }
.button { all: unset; padding: 10px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; }
.button.primary { background: #2563eb; color: white; }
.button.secondary { background: #e5e7eb; color: #111; }

.add-side { margin-top: 8px; flex-shrink: 0; }
`;

class CreateCustomDiceDialogComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._unsub = null;
  }

  connectedCallback() {
    this.render();
    this._bindEvents();

    // Open initially if state says creating (-1)
    const idx = gameState.getState("createEditDiceIndex");
    if (idx === -1) this._open();

    // Subscribe to future changes (no edit logic yet)
    this._unsub = gameState.subscribe("createEditDiceIndex", (val) => {
      if (val === -1) this._open();
      if (val === -2) this._close();
      // For >=0 editing, we will implement later
    });
  }

  disconnectedCallback() {
    this._unsub?.();
    this._unbindEvents();
  }

  render() {
    this.shadowRoot.innerHTML = /*html*/ `
      <style>${css}</style>
      <dialog class="dialog" id="dialog">
        <form id="diceForm" novalidate>
          <div class="header">
            <h2>Create Custom Dice</h2>
          </div>

          <div class="preview-container">
            <dice-preview id="dicePreview" size="120"></dice-preview>
          </div>

          <div class="field">
            <label class="label" for="title">Title</label>
            <input class="input" id="title" name="title" type="text" required minlength="2" placeholder="My Dice" />
          </div>

          <div class="field sides-field">
            <span class="label" id="sidesLabel">Side: 2</span>
            <div class="sides-scroll-wrapper">
              <div class="sides" id="sidesContainer"></div>
            </div>
            <div class="actions add-side">
              <button type="button" id="addSideBtn" class="button secondary">Add side</button>
            </div>
          </div>

          <div class="actions">
            <button type="button" id="cancelBtn" class="button secondary">Cancel</button>
            <button type="submit" id="acceptBtn" class="button primary">Accept</button>
          </div>
        </form>
      </dialog>

      <template id="sideRowTpl">
        <div class="side-row">
          <input class="side-input" type="text" name="side" maxlength="2" />
          <button type="button" class="side-remove" aria-label="Remove">✕</button>
        </div>
      </template>
    `;

    // Initialize with two default sides
    const container = this.shadowRoot.getElementById("sidesContainer");
    this._appendSideRow(container, "1", true);
    this._appendSideRow(container, "2", true);
    this._updateRemoveButtons();
    this._updateSidesLabel();
    this._updatePreview();
  }

  _bindEvents() {
    const dialog = this.shadowRoot.getElementById("dialog");
    const form = this.shadowRoot.getElementById("diceForm");
    const cancelBtn = this.shadowRoot.getElementById("cancelBtn");
    const addSideBtn = this.shadowRoot.getElementById("addSideBtn");

    this._onCancel = () => {
      this._close();
      gameState.setCreateEditDiceIndex(-2);
    };
    cancelBtn?.addEventListener("click", this._onCancel);

    this._onAdd = () => {
      const container = this.shadowRoot.getElementById("sidesContainer");
      const rows = Array.from(container.querySelectorAll('.side-row'));
      const lastInput = rows[rows.length - 1]?.querySelector('input[name="side"]');
      const prevVal = (lastInput?.value ?? '').trim();
      let initial = prevVal;
      const n = parseInt(prevVal, 10);
      if (!Number.isNaN(n)) {
        initial = String(n + 1);
      }
      this._appendSideRow(container, initial);
      this._updateRemoveButtons();
      this._updateSidesLabel();
      this._updatePreview();
    };
    addSideBtn?.addEventListener("click", this._onAdd);

    this._onSubmit = (e) => {
      e.preventDefault();
      const titleEl = this.shadowRoot.getElementById("title");
      const title = titleEl?.value?.trim() ?? '';
      // native validations
      if (!titleEl.checkValidity()) {
        titleEl.reportValidity();
        return;
      }

      const container = this.shadowRoot.getElementById("sidesContainer");
      const values = Array.from(container.querySelectorAll('input[name="side"]'))
        .map((el) => (el.value ?? '').trim())
        .filter((v) => v.length > 0);

      // Ensure at least 2 sides (we prevent below 2 by UI, but double-check)
      if (values.length < 2) {
        // mark the first two as required; reportValidity will highlight
        const firstTwo = Array.from(container.querySelectorAll('input[name="side"]')).slice(0, 2);
        firstTwo.forEach((el) => el.required = true);
        firstTwo[0]?.reportValidity();
        return;
      }

      // Add to dictionary and game set
      const newIndex = gameState.addDiceToDictionary({ title, sides: values });
      gameState.addDieToGameSetByIndex(newIndex, 1);

      // Close dialog
      this._close();
      gameState.setCreateEditDiceIndex(-2);
    };
    form?.addEventListener("submit", this._onSubmit);

    // Close when dialog itself cancelled (ESC)
    this._onCancelDialog = (e) => {
      // <dialog> cancel event
      gameState.setCreateEditDiceIndex(-2);
    };
    dialog?.addEventListener("cancel", this._onCancelDialog);
  }

  _unbindEvents() {
    const dialog = this.shadowRoot.getElementById("dialog");
    const form = this.shadowRoot.getElementById("diceForm");
    const cancelBtn = this.shadowRoot.getElementById("cancelBtn");
    const addSideBtn = this.shadowRoot.getElementById("addSideBtn");
    cancelBtn?.removeEventListener("click", this._onCancel);
    addSideBtn?.removeEventListener("click", this._onAdd);
    form?.removeEventListener("submit", this._onSubmit);
    dialog?.removeEventListener("cancel", this._onCancelDialog);
  }

  _appendSideRow(container, value = "", required = false) {
    const tpl = this.shadowRoot.getElementById("sideRowTpl");
    const frag = tpl.content.cloneNode(true);
    const row = frag.querySelector(".side-row");
    const input = frag.querySelector(".side-input");
    const remove = frag.querySelector(".side-remove");
    if (input) {
      input.value = value;
      input.required = required;
    }
    container.appendChild(frag);
    
    // Get the actual DOM elements after appending
    const rows = Array.from(container.querySelectorAll('.side-row'));
    const appendedRow = rows[rows.length - 1];
    const appendedInput = appendedRow?.querySelector('.side-input');
    const appendedRemove = appendedRow?.querySelector('.side-remove');
    
    // Update preview when side value changes
    appendedInput?.addEventListener("input", () => {
      this._updatePreview();
    });
    
    appendedRemove?.addEventListener("click", () => {
      const currentRows = Array.from(container.querySelectorAll('.side-row'));
      if (currentRows.length <= 2) return; // keep minimum of 2
      appendedRow.remove();
      this._updateRemoveButtons();
      this._updateSidesLabel();
      this._updatePreview();
    });
  }

  _updateRemoveButtons() {
    const container = this.shadowRoot.getElementById("sidesContainer");
    const rows = Array.from(container.querySelectorAll('.side-row'));
    const removes = rows.map(r => r.querySelector('.side-remove'));
    const disable = rows.length <= 2;
    removes.forEach(btn => { if (btn) btn.disabled = disable; });
  }

  _updateSidesLabel() {
    const container = this.shadowRoot.getElementById("sidesContainer");
    const label = this.shadowRoot.getElementById("sidesLabel");
    if (!label) return;
    const count = container.querySelectorAll('.side-row').length;
    label.textContent = `Side: ${count}`;
  }

  _updatePreview() {
    const container = this.shadowRoot.getElementById("sidesContainer");
    const preview = this.shadowRoot.getElementById("dicePreview");
    if (!preview) return;
    
    const values = Array.from(container.querySelectorAll('input[name="side"]'))
      .map((el) => (el.value ?? '').trim())
      .filter((v) => v.length > 0);
    
    // Ensure at least 2 sides for preview
    const sides = values.length >= 2 ? values : ["1", "2"];
    preview.sides = sides;
    preview.render?.();
    preview.updateSnapshot?.();
  }

  _open() {
    const dialog = this.shadowRoot.getElementById("dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }

  _close() {
    const dialog = this.shadowRoot.getElementById("dialog");
    if (dialog && dialog.open) dialog.close();
  }
}

customElements.define("create-custom-dice-dialog", CreateCustomDiceDialogComponent);

export { CreateCustomDiceDialogComponent };
