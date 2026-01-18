import { isCustomDiceIndex, validateDiceSides } from "./notationUtils.js";

const STATE_QUERY_PARAM = "state";

function sanitizeTitle(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function sanitizeGameSet(gameSet) {
  if (!Array.isArray(gameSet)) {
    return [];
  }

  return gameSet
    .map((item) => ({
      dictionaryIndex: Number(item?.dictionaryIndex),
      quantity: Number(item?.quantity),
    }))
    .filter(
      ({ dictionaryIndex, quantity }) =>
        Number.isInteger(dictionaryIndex) &&
        dictionaryIndex >= 0 &&
        Number.isInteger(quantity) &&
        quantity > 0
    );
}

function normalizeDiceDefinition(diceDefinition) {
  if (!diceDefinition || typeof diceDefinition !== "object") {
    return null;
  }

  const title = typeof diceDefinition.title === "string" ? diceDefinition.title.trim() : "";
  if (title.length < 2) {
    return null;
  }

  const rawSides = Array.isArray(diceDefinition.sides)
    ? diceDefinition.sides.map((side) => String(side ?? "").trim()).filter((side) => side.length > 0)
    : [];
  const sides = validateDiceSides(rawSides);
  if (!Array.isArray(sides) || sides.length < 2) {
    return null;
  }

  return { title, sides: [...sides] };
}

function sanitizeCustomDice(customDice) {
  if (!Array.isArray(customDice)) {
    return [];
  }

  return customDice
    .map(normalizeDiceDefinition)
    .filter((dice) => dice !== null);
}

export function encodeGameStateForUrl(state) {
  if (!state) {
    return null;
  }

  const customDice = Array.isArray(state.diceDictionary)
    ? state.diceDictionary
        .map((dice, index) => {
          if (!isCustomDiceIndex(index)) return null;
          return normalizeDiceDefinition(dice);
        })
        .filter((dice) => dice !== null)
    : [];

  const payload = {
    title: sanitizeTitle(state.title),
    gameSet: sanitizeGameSet(state.gameSet),
    customDice,
  };

  try {
    return encodeURIComponent(JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to serialize game state for URL", error);
    return null;
  }
}

export function decodeGameStateFromUrl(search = "") {
  if (typeof search !== "string") {
    return null;
  }

  const params = new URLSearchParams(search);
  const encoded = params.get(STATE_QUERY_PARAM);
  if (!encoded) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(decodeURIComponent(encoded));
  } catch (error) {
    console.warn("Failed to parse game state from URL", error);
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const result = {};
  if (Object.prototype.hasOwnProperty.call(parsed, "title")) {
    result.title = sanitizeTitle(parsed.title);
  }

  if (Object.prototype.hasOwnProperty.call(parsed, "gameSet")) {
    result.gameSet = sanitizeGameSet(parsed.gameSet);
  }

  if (Object.prototype.hasOwnProperty.call(parsed, "customDice")) {
    result.customDice = sanitizeCustomDice(parsed.customDice);
  }

  return result;
}

export function syncUrlWithGameState(state) {
  if (typeof window === "undefined") {
    return;
  }

  const encodedState = encodeGameStateForUrl(state);
  if (encodedState === null) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(STATE_QUERY_PARAM, encodedState);
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
}
