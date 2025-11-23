import { LitElement, html, css } from "lit";
import { subscribe, addDice, updateDice, closeEditingDice, addNewDiceAndReplace } from "../state/game-state.js";

/**
 * A modal web component for editing or adding a new dice.
 * @element dice-editor
 */
export class DiceEditor extends LitElement {
  static properties = {
    _gameState: { state: true },
    _diceSides: { state: true },
    _diceColor: { state: true },
    _hasChanges: { state: true },
  };

  constructor() {
    super();
    /** @type {GameState | null} */
    this._gameState = null;
    /** @type {string[]} */
    this._diceSides = ["", ""];
    /** @type {string} */
    this._diceColor = "#000000";
    /** @type {UnsubscribeFunction | null} */
    this._unsubscribe = null;
    /** @type {boolean} */
    this._hasChanges = false;
  }

  connectedCallback() {
    super.connectedCallback();
    // Subscribe to game state changes
    this._unsubscribe = subscribe((state) => {
      const previousState = this._gameState;
      this._gameState = state;
      const editingIndex = state.editingDiceIndex;
      
      // Check if editing index has changed
      if (previousState?.editingDiceIndex !== editingIndex) {
        this._hasChanges = false;
        if (editingIndex === undefined) {
          // Close modal - reset sides
          this._diceSides = ["", ""];
          this._diceColor = "#000000";
        } else if (editingIndex === -1) {
          // Create new dice - empty sides
          this._diceSides = ["", ""];
          this._diceColor = "#000000";
        } else if (editingIndex >= 0) {
          // Edit existing dice
          if (editingIndex < state.dice.length) {
            const dice = state.dice[editingIndex];
            this._diceSides = [...dice.sides];
            this._diceColor = dice.color || "#000000";
            // Ensure at least 2 sides
            if (this._diceSides.length < 2) {
              this._diceSides = ["", ""];
            }
          } else {
            // Index out of bounds - close and log error
            console.error(`Invalid dice index: ${editingIndex}. Expected index < ${state.dice.length}`);
            closeEditingDice();
          }
        }
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  _checkChanges() {
    const editingIndex = this._gameState?.editingDiceIndex;
    if (editingIndex === undefined || editingIndex === -1) {
      this._hasChanges = false;
      return;
    }

    const originalDice = this._gameState?.dice[editingIndex];
    if (!originalDice) return;

    // Check name (from input value, but we need to access it or store it in state)
    // For simplicity, let's assume name change is handled by input event
    const nameInput = this.shadowRoot?.querySelector('#dice-name');
    const currentName = nameInput ? /** @type {HTMLInputElement} */ (nameInput).value : originalDice.name;

    const nameChanged = currentName !== originalDice.name;
    const colorChanged = this._diceColor !== originalDice.color;
    
    // Check sides
    const sidesChanged = JSON.stringify(this._diceSides) !== JSON.stringify(originalDice.sides);

    this._hasChanges = nameChanged || colorChanged || sidesChanged;
  }

  _handleInput(e) {
    // Trigger change check on any input
    // We need to wait for the value to update if it's bound
    requestAnimationFrame(() => this._checkChanges());
  }

  /**
   * Handle form submission
   * @param {Event} e
   */
  _handleSubmit(e) {
    e.preventDefault();
    this._saveDice(false);
  }

  _handleCreateNew() {
    this._saveDice(true);
  }

  _saveDice(asNew) {
    const form = this.shadowRoot?.querySelector('form');
    if (!form) return;

    const formData = new FormData(form);
    const name = formData.get("name")?.toString().trim() || "";
    const color = formData.get("color")?.toString().trim() || "#000000";
    
    if (!name) {
      return; // Form validation will handle this
    }

    // Get all side values from form
    const sides = [];
    for (let i = 0; i < this._diceSides.length; i++) {
      const sideValue = formData.get(`side-${i}`)?.toString().trim();
      if (sideValue) {
        sides.push(sideValue);
      }
    }
    
    if (sides.length < 2) {
      alert("Please add at least 2 sides to the dice");
      return;
    }

    const dice = { name, sides, color };
    const editingIndex = this._gameState?.editingDiceIndex;
    const editingOrderIndex = this._gameState?.editingOrderIndex;

    if (asNew) {
       addNewDiceAndReplace(dice, editingOrderIndex);
    } else {
      if (editingIndex === -1) {
        // Add new dice
        addDice(dice);
      } else if (editingIndex !== undefined && editingIndex >= 0) {
        // Update existing dice
        updateDice(editingIndex, dice);
      }
    }

    closeEditingDice();
  }

  /**
   * Add a new side to the dice
   */
  _addSide() {
    this._diceSides = [...this._diceSides, ""];
    this._checkChanges();
  }

  /**
   * Remove a side from the dice
   * @param {number} index
   */
  _removeSide(index) {
    if (this._diceSides.length > 2) {
      this._diceSides = this._diceSides.filter((_, i) => i !== index);
      this._checkChanges();
    }
  }

  render() {
    const editingIndex = this._gameState?.editingDiceIndex;
    
    if (editingIndex === undefined) {
      return html``;
    }

    const isNewDice = editingIndex === -1;
    const title = isNewDice ? "Add New Dice" : "Edit Dice";
    const diceName = isNewDice ? "" : this._gameState?.dice[editingIndex]?.name || "";

    return html`
      <div class="modal-backdrop" @click=${(e) => e.target === e.currentTarget && closeEditingDice()}>
        <div class="modal-content">
          <h2>${title}</h2>
          <form @submit=${this._handleSubmit}>
            <div class="form-group">
              <label for="dice-name">Name *</label>
              <input
                type="text"
                id="dice-name"
                name="name"
                value="${diceName}"
                required
                placeholder="Enter dice name"
                @input=${this._handleInput}
              />
            </div>

            <div class="form-group">
              <label for="dice-color">Color</label>
              <input
                type="color"
                id="dice-color"
                name="color"
                value="${this._diceColor}"
                style="width: 100%; height: 40px; padding: 2px;"
                @input=${(e) => { this._diceColor = e.target.value; this._handleInput(e); }}
              />
            </div>

            <div class="form-group">
              <label>Sides (minimum 2) *</label>
              <div class="sides-container">
                ${this._diceSides.map((side, index) => html`
                  <div class="side-row">
                    <input
                      type="text"
                      name="side-${index}"
                      value="${side}"
                      placeholder="Side ${index + 1}"
                      required
                      @input=${(e) => { 
                        const newSides = [...this._diceSides];
                        newSides[index] = e.target.value;
                        this._diceSides = newSides;
                        this._handleInput(e);
                      }}
                    />
                    <button
                      type="button"
                      class="btn-remove"
                      @click=${() => this._removeSide(index)}
                      ?disabled=${this._diceSides.length <= 2}
                      title="Remove side"
                    >
                      ✕
                    </button>
                  </div>
                `)}
              </div>
              <button type="button" class="btn-add-side" @click=${this._addSide}>
                + Add Side
              </button>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-cancel" @click=${closeEditingDice}>
                Cancel
              </button>
              ${!isNewDice && this._hasChanges ? html`
                <button type="button" class="btn-create-new" @click=${this._handleCreateNew}>
                  Create New Dice
                </button>
              ` : ''}
              <button type="submit" class="btn-submit">
                ${isNewDice ? "Add Dice" : "Update Dice"}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: contents;
    }

    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    h2 {
      margin: 0 0 20px 0;
      color: #222;
      font-size: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    input[type="text"] {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: #4285f4;
    }

    .sides-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .side-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .side-row input {
      flex: 1;
    }

    .btn-remove {
      width: 32px;
      height: 32px;
      padding: 0;
      border: 2px solid #e0e0e0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      color: #666;
      font-size: 16px;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .btn-remove:hover:not(:disabled) {
      background: #fee;
      border-color: #f44336;
      color: #f44336;
    }

    .btn-remove:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .btn-add-side {
      width: 100%;
      padding: 10px 16px;
      border: 2px dashed #bdbdbd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      color: #666;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-add-side:hover {
      border-color: #4285f4;
      color: #4285f4;
      background: #f0f7ff;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }

    button[type="submit"],
    .btn-cancel {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel {
      background: #f5f5f5;
      color: #666;
    }

    .btn-cancel:hover {
      background: #e0e0e0;
    }

    button[type="submit"] {
      background: #4285f4;
      color: white;
    }

    button[type="submit"]:hover {
      background: #3367d6;
    }

    button[type="submit"]:active {
      transform: scale(0.98);
    }

    .btn-create-new {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      background: #34a853;
      color: white;
    }

    .btn-create-new:hover {
      background: #2d8e47;
    }
  `;
}

customElements.define("dice-editor", DiceEditor);
