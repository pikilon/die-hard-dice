// Handles reflecting game state in the URL and initializing from it

import { setGame } from "./game-state.js";
import jsurl from "jsurl";

/**
 * Encode state to URL search params
 * @param {GameState} gameSet
 */
export function updateUrlFromState(gameSet) {
  // Serialize the game state and put it into the hash part of the URL
  // Use encodeURIComponent to make sure the string is safe inside the hash.
  const raw = jsurl.stringify(gameSet);
  const hash = encodeURIComponent(raw);

  // Remove any old `game` search param, preserving any other search params
  const search = new URLSearchParams(window.location.search);
  search.delete("game");
  const searchString = search.toString() ? `?${search.toString()}` : "";

  const url = `${window.location.pathname}${searchString}#${hash}`;
  window.history.replaceState({}, "", url);
}

// Parse state from URL search params
export function initStateFromUrl() {
  // First try to read the game state from the URL hash (new behavior)
  let gameString = "{}";

  if (window.location.hash && window.location.hash.length > 1) {
    // Remove '#' then decode
    const raw = window.location.hash.slice(1);
    try {
      gameString = decodeURIComponent(raw) || "{}";
    } catch (e) {
      // If decoding fails for any reason, fall back to raw
      gameString = raw || "{}";
    }
  } else {
    // Backwards compatibility: fall back to the `game` search param
    const params = new URLSearchParams(window.location.search);
    gameString = params.get("game") || "{}";
  }

  setGame(jsurl.parse(gameString));
}
