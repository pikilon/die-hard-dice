// Pub/Sub Game State Management
import { updateUrlFromState } from "./url-state.js";

/**
 * @typedef {Object} Dice
 * @property {string} name - The name of the dice
 * @property {number} sides - The number of sides on the dice
 * @property {number} count - The count of dice
 */

/**
 * @typedef {Object} GameState
 * @property {string} title - The title of the game
 * @property {Dice[]} dice - Array of dice objects
 * @property {number[]} diceOrder - Array of indices representing the order of dice
 */

const gameState = {
  title: "the game title",
  dice: [],
  diceOrder: [],
};

const subscribers = new Set();

/**
 * Notifies all subscribers about state changes and updates the URL
 * @private
 */
function notify() {
  const newState = { ...gameState, dice: [...gameState.dice], diceOrder: [...gameState.diceOrder] };
  for (const cb of subscribers) {
    cb(newState);
  }
  updateUrlFromState(newState);
}

/**
 * Subscribes a callback function to game state changes
 * @param {function(GameState): void} callback - Function to call when state changes
 * @returns {function(): boolean} Unsubscribe function
 */
export function subscribe(callback) {
  subscribers.add(callback);
  // Immediately call with current state
  callback({ ...gameState, dice: [...gameState.dice], diceOrder: [...gameState.diceOrder] });
  return () => subscribers.delete(callback);
}

/**
 * Sets the entire game state
 * @param {Partial<GameState>} newState - New state object to set
 */
export function setGame(newState) {
  gameState.title = newState?.title || "";
  gameState.dice = newState?.dice || [];
  gameState.diceOrder = newState?.diceOrder || [];
  notify();
}

/**
 * Updates the game title
 * @param {string} title - New title for the game
 */
export function setTitle(title) {
  gameState.title = title;
  notify();
}

/**
 * Adds a new dice to the game state
 * @param {Dice} dice - Dice object to add
 */
export function addDice(dice) {
  gameState.dice.push(dice);
  gameState.diceOrder.push(gameState.dice.length - 1);
  notify();
}

/**
 * Deletes a dice at the specified index
 * @param {number} index - Index of the dice to delete
 */
export function deleteDice(index) {
  if (index >= 0 && index < gameState.dice.length) {
    gameState.dice.splice(index, 1);
    gameState.diceOrder.splice(index, 1);
    // Update diceOrder indices after deletion
    gameState.diceOrder = gameState.diceOrder.map(orderIndex => 
      orderIndex > index ? orderIndex - 1 : orderIndex
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
  if (index >= 0 && index < gameState.dice.length) {
    gameState.dice[index] = newDice;
    notify();
  }
}

/**
 * Updates the order of dice
 * @param {number[]} newDiceOrder - New array of indices representing dice order
 */
export function updateDiceOrder(newDiceOrder) {
  if (Array.isArray(newDiceOrder) && newDiceOrder.length === gameState.dice.length) {
    gameState.diceOrder = [...newDiceOrder];
    notify();
  }
}

/**
 * Returns a copy of the current game state
 * @returns {GameState} Copy of the current game state
 */
export function getGameState() {
  return { ...gameState, dice: [...gameState.dice], diceOrder: [...gameState.diceOrder] };
}
