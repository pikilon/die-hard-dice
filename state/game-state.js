// Pub/Sub Game State Management
import { updateUrlFromState } from "./url-state.js";

/** @type {GameState} */
const DEFAULT_EMPTY_GAME_STATE = {
  title: "the game title",
  dice: [],
  diceOrder: [],
  editingDiceIndex: undefined,
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
 */
export function editDice(diceIndex = undefined) {
  DEFAULT_EMPTY_GAME_STATE.editingDiceIndex = diceIndex;
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
