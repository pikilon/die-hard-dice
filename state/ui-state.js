// Pub/Sub UI State Management

/**
 * @typedef {Object} Dice
 * @property {string} name - The name of the dice
 * @property {number} sides - The number of sides on the dice
 * @property {number} count - The count of dice
 */

/**
 * @typedef {Object} UIState
 * @property {Dice|undefined} selectedDice - The dice currently selected for the modal, or undefined if no modal is open
 */

const uiState = {
  selectedDice: undefined,
};

const subscribers = new Set();

/**
 * Notifies all subscribers about UI state changes
 * @private
 */
function notify() {
  const newState = { ...uiState };
  for (const cb of subscribers) {
    cb(newState);
  }
}

/**
 * Subscribes a callback function to UI state changes
 * @param {function(UIState): void} callback - Function to call when UI state changes
 * @returns {function(): boolean} Unsubscribe function that returns true if successfully unsubscribed
 */
export function subscribe(callback) {
  subscribers.add(callback);
  // Immediately call with current state
  callback({ ...uiState });
  return () => subscribers.delete(callback);
}

/**
 * Sets the selected dice for the modal
 * @param {Dice|undefined} dice - Dice object to display in modal, or undefined to close modal
 */
export function setSelectedDice(dice) {
  uiState.selectedDice = dice;
  notify();
}

/**
 * Clears the selected dice, effectively closing the modal
 */
export function clearSelectedDice() {
  uiState.selectedDice = undefined;
  notify();
}

/**
 * Returns a copy of the current UI state
 * @returns {UIState} Copy of the current UI state
 */
export function getUIState() {
  return { ...uiState };
}
