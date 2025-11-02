// @ts-check
// url-state.js
// Handles reflecting game state in the URL and initializing from it

import { setGame } from "./game-state.js";

/** @typedef {import('../types/game.d.ts').GameState} GameState */

/**
 * Encode state to URL search params
 * @param {GameState} gameSet
 */
export function updateUrlFromState(gameSet) {
  const params = new URLSearchParams();
  params.set("game", JSON.stringify(gameSet));
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", url);
}

// Parse state from URL search params
export function initStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const gameString = params.get("game") || "{}";
  setGame(JSON.parse(gameString));
}
