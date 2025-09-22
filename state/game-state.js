// Pub/Sub Game State Management
import { updateUrlFromState } from "./url-state.js";

const gameState = {
  title: "the game title",
  dice: [],
  diceOrder: [],
};

const subscribers = new Set();

function notify() {
  const newState = { ...gameState, dice: [...gameState.dice], diceOrder: [...gameState.diceOrder] };
  for (const cb of subscribers) {
    cb(newState);
  }
  updateUrlFromState(newState);
}

export function subscribe(callback) {
  subscribers.add(callback);
  // Immediately call with current state
  callback({ ...gameState, dice: [...gameState.dice], diceOrder: [...gameState.diceOrder] });
  return () => subscribers.delete(callback);
}

export function setGame(newState) {
  gameState.title = newState?.title || "";
  gameState.dice = newState?.dice || [];
  gameState.diceOrder = newState?.diceOrder || [];
  notify();
}

export function setTitle(title) {
  gameState.title = title;
  notify();
}

export function addDice(dice) {
  gameState.dice.push(dice);
  gameState.diceOrder.push(gameState.dice.length - 1);
  notify();
}

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

export function updateDice(index, newDice) {
  if (index >= 0 && index < gameState.dice.length) {
    gameState.dice[index] = newDice;
    notify();
  }
}

export function updateDiceOrder(newDiceOrder) {
  if (Array.isArray(newDiceOrder) && newDiceOrder.length === gameState.dice.length) {
    gameState.diceOrder = [...newDiceOrder];
    notify();
  }
}

export function getGameState() {
  return { ...gameState, dice: [...gameState.dice], diceOrder: [...gameState.diceOrder] };
}
