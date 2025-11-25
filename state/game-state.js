// Pub/Sub Game State Management
import { updateUrlFromState } from "./url-state.js";

/** @type {GameState} */
const DEFAULT_EMPTY_GAME_STATE = {
  title: "",
  dice: [],
  diceOrder: [],
  editingDiceIndex: undefined,
  editingOrderIndex: undefined,
};

const subscribers = new Set();

/**
 * Notifies all subscribers about state changes and updates the URL
 * @private
 */
function notify() {
  const newState = {
    ...DEFAULT_EMPTY_GAME_STATE,
    dice: [...DEFAULT_EMPTY_GAME_STATE.dice],
    diceOrder: [...DEFAULT_EMPTY_GAME_STATE.diceOrder],
  };
  for (const cb of subscribers) {
    cb(newState);
  }
  updateUrlFromState(newState);
}

/**
 * Subscribes a callback function to game state changes
 * @param {GameStateCallback} callback - Function to call when state changes
 * @returns {UnsubscribeFunction} Unsubscribe function
 */
export function subscribe(callback) {
  subscribers.add(callback);
  // Immediately call with current state
  callback({
    ...DEFAULT_EMPTY_GAME_STATE,
    dice: [...DEFAULT_EMPTY_GAME_STATE.dice],
    diceOrder: [...DEFAULT_EMPTY_GAME_STATE.diceOrder],
  });
  return () => subscribers.delete(callback);
}

/**
 * Sets the entire game state
 * @param {Partial<GameState>} newState - New state object to set
 */
export function setGame(newState) {
  DEFAULT_EMPTY_GAME_STATE.title = newState?.title || "";
  DEFAULT_EMPTY_GAME_STATE.dice = newState?.dice || [];
  DEFAULT_EMPTY_GAME_STATE.diceOrder = newState?.diceOrder || [];
  notify();
}

/**
 * Updates the game title
 * @param {string} title - New title for the game
 */
export function setTitle(title) {
  DEFAULT_EMPTY_GAME_STATE.title = title;
  notify();
}

/**
 * Adds a new dice to the game state
 * @param {Dice} dice - Dice object to add
 */
export function addDice(dice) {
  DEFAULT_EMPTY_GAME_STATE.dice.push(dice);
  const newDiceIndex = DEFAULT_EMPTY_GAME_STATE.dice.length - 1;
  DEFAULT_EMPTY_GAME_STATE.diceOrder.push(newDiceIndex);
  notify();
}

/**
 * Adds an instance of an existing dice to the order
 * @param {number} diceIndex - Index of the dice in the dice array
 */
export function addDiceInstance(diceIndex) {
  if (diceIndex >= 0 && diceIndex < DEFAULT_EMPTY_GAME_STATE.dice.length) {
    DEFAULT_EMPTY_GAME_STATE.diceOrder.push(diceIndex);
    notify();
  }
}

/**
 * Removes an instance of a dice from the order.
 * If it's the last instance of that dice type, removes the dice definition as well.
 * @param {number} orderIndex - Index in the diceOrder array to remove
 */
export function removeDiceInstance(orderIndex) {
  if (orderIndex < 0 || orderIndex >= DEFAULT_EMPTY_GAME_STATE.diceOrder.length) return;

  const diceIndex = DEFAULT_EMPTY_GAME_STATE.diceOrder[orderIndex];
  
  // Remove from order
  DEFAULT_EMPTY_GAME_STATE.diceOrder.splice(orderIndex, 1);

  // Check if this dice definition is still used
  const isUsed = DEFAULT_EMPTY_GAME_STATE.diceOrder.includes(diceIndex);

  if (!isUsed) {
    // Remove from dice definitions
    DEFAULT_EMPTY_GAME_STATE.dice.splice(diceIndex, 1);
    
    // Shift indices in diceOrder
    DEFAULT_EMPTY_GAME_STATE.diceOrder = DEFAULT_EMPTY_GAME_STATE.diceOrder.map(idx => {
      if (idx > diceIndex) return idx - 1;
      return idx;
    });
  }
  
  notify();
}

/**
 * Deletes a dice at the specified index
 * @param {number} index - Index of the dice to delete
 */
export function deleteDice(index) {
  if (index >= 0 && index < DEFAULT_EMPTY_GAME_STATE.dice.length) {
    DEFAULT_EMPTY_GAME_STATE.dice.splice(index, 1);
    DEFAULT_EMPTY_GAME_STATE.diceOrder.splice(index, 1);
    // Update diceOrder indices after deletion
    DEFAULT_EMPTY_GAME_STATE.diceOrder = DEFAULT_EMPTY_GAME_STATE.diceOrder.map(
      (orderIndex) => (orderIndex > index ? orderIndex - 1 : orderIndex)
    );
    notify();
  }
}

/**
 * Updates a dice at the specified index
 * @param {number} index - Index of the dice to update
 * @param {Dice} newDice - New dice object
 */
export function updateDice(index, newDice) {
  if (index >= 0 && index < DEFAULT_EMPTY_GAME_STATE.dice.length) {
    DEFAULT_EMPTY_GAME_STATE.dice[index] = newDice;
    notify();
  }
}

/**
 * Updates the order of dice
 * @param {number[]} newDiceOrder - New array of indices representing dice order
 */
export function updateDiceOrder(newDiceOrder) {
  if (
    Array.isArray(newDiceOrder) &&
    newDiceOrder.length === DEFAULT_EMPTY_GAME_STATE.dice.length
  ) {
    DEFAULT_EMPTY_GAME_STATE.diceOrder = [...newDiceOrder];
    notify();
  }
}

/**
 * Sets the index of the dice to edit
 * @param {number} [diceIndex] - Index of the dice in gameState.dice array, or undefined to clear
 * @param {number} [orderIndex] - Index of the dice in gameState.diceOrder array
 */
export function editDice(diceIndex = undefined, orderIndex = undefined) {
  DEFAULT_EMPTY_GAME_STATE.editingDiceIndex = diceIndex;
  DEFAULT_EMPTY_GAME_STATE.editingOrderIndex = orderIndex;
  notify();
}

/**
 * Adds a new dice and replaces the instance at orderIndex with the new dice
 * @param {Dice} dice - New dice object
 * @param {number} orderIndex - Index in diceOrder to replace
 */
export function addNewDiceAndReplace(dice, orderIndex) {
  // Add new dice
  DEFAULT_EMPTY_GAME_STATE.dice.push(dice);
  const newDiceIndex = DEFAULT_EMPTY_GAME_STATE.dice.length - 1;
  
  // Replace in order
  if (orderIndex !== undefined && orderIndex >= 0 && orderIndex < DEFAULT_EMPTY_GAME_STATE.diceOrder.length) {
    DEFAULT_EMPTY_GAME_STATE.diceOrder[orderIndex] = newDiceIndex;
  } else {
    // Fallback if no order index (shouldn't happen in this flow but good for safety)
    DEFAULT_EMPTY_GAME_STATE.diceOrder.push(newDiceIndex);
  }
  
  notify();
}

/**
 * Sets the UI state to create a new dice
 */
export function createDice() {
  return editDice(-1);
}

/**
 * Clears the dice editing state, closing the edit modal
 */
export function closeEditingDice() {
  return editDice();
}

/**
 * Returns a copy of the current game state
 * @returns {GameState} Copy of the current game state
 */
export function getGameState() {
  return {
    ...DEFAULT_EMPTY_GAME_STATE,
    dice: [...DEFAULT_EMPTY_GAME_STATE.dice],
    diceOrder: [...DEFAULT_EMPTY_GAME_STATE.diceOrder],
  };
}
