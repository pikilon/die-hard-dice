// Pub/Sub Game State Management
import { updateUrlFromState } from "./url-state.js";

const gameState = {
  title: "the game title",
  dice: [],
};

const subscribers = new Set();

function notify() {
  const newState = { ...gameState, dice: [...gameState.dice] };
  for (const cb of subscribers) {
    cb(newState);
  }
  updateUrlFromState(newState);
}

export function subscribe(callback) {
  subscribers.add(callback);
  // Immediately call with current state
  callback({ ...gameState, dice: [...gameState.dice] });
  return () => subscribers.delete(callback);
}

export function setGame(newState) {
  gameState.title = newState?.title || "";
  gameState.dice = newState?.dice || [];
  notify();
}

export function setTitle(title) {
  gameState.title = title;
  notify();
}

export function addDice(dice) {
  gameState.dice.push(dice);
  notify();
}

export function deleteDice(index) {
  if (index >= 0 && index < gameState.dice.length) {
    gameState.dice.splice(index, 1);
    notify();
  }
}

export function updateDice(index, newDice) {
  if (index >= 0 && index < gameState.dice.length) {
    gameState.dice[index] = newDice;
    notify();
  }
}

export function getGameState() {
  return { ...gameState, dice: [...gameState.dice] };
}
