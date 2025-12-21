/**
 * Utilidades para convertir entre notación de dados y el formato de estado
 */

import { gameState } from "./gameState.js";

/**
 * Array de definiciones de dados (debe coincidir con diceDictionary del estado)
 * Índice 0: coin, 1: d4, 2: d6, 3: d8, 4: d10, 5: d12, 6: d20, 7: d100
 * El tipo de dado se determina automáticamente por la longitud del array de sides
 */
export const DEFAULT_DICE = [
  { title: "coin", sides: ["👑", "⚔️"] },
  { title: "d4", sides: ["1", "2", "3", "4"] },
  { title: "d6", sides: ["1", "2", "3", "4", "5", "6"] },
  { title: "d8", sides: ["1", "2", "3", "4", "5", "6", "7", "8"] },
  { title: "d10", sides: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] },
  {
    title: "d12",
    sides: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  },
  {
    title: "d20",
    sides: [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
    ],
  },
  // d100 represented as d10 with tens
  {
    title: "d100",
    sides: ["00", "10", "20", "30", "40", "50", "60", "70", "80", "90"],
  },
];

/**
 * Maps sides length to standard dice type
 * Rules:
 * - 0 or 1 sides: defaults to 2 sides (d2/coin)
 * - 2 sides: d2
 * - 3 sides: d4
 * - 4 sides: d4
 * - 5-7 sides: d8
 * - 8 sides: d8
 * - 9-11 sides: d10
 * - 12 sides: d12
 * - 13-20 sides: d20
 * - 21+ sides: d20 (uses random slice of 20 in throw)
 * @param {Array<string>} sides - Array of sides
 * @returns {string} - The dice type (e.g., 'd6', 'd20')
 */
export function getDiceTypeFromSides(sides) {
  // Normalize input
  const sidesArray = Array.isArray(sides) ? sides : [];
  const length = sidesArray.length;

  if (length >= 20) return "d20";
  if (length >= 12) return "d12";
  if (length >= 10) return "d10";
  if (length >= 8) return "d8";
  if (length >= 6) return "d6";
  if (length >= 4) return "d4";
  return "coin"; // 2 or 3 sides
}

/**
 * Maps dice type to expected face count for rendering
 * @param {string} diceType - Dice type (e.g., 'd6', 'd20')
 * @returns {number} - Expected face count
 */
function getExpectedFaceCount(diceType) {
  const counts = {
    coin: 2,
    d2: 2,
    d4: 4,
    d6: 6,
    d8: 8,
    d10: 10,
    d12: 12,
    d20: 20,
  };
  return counts[diceType] || 20;
}



/**
 * Ensures dice has valid sides and slices to expected face count
 * - If 0 or 1 sides: defaults to ["1", "2"]
 * - If more sides than geometry supports: slices to expected count
 * @param {Array<string>} sides - Array of sides
 * @returns {Array<string>} - Validated and sliced sides array
 */
export function validateDiceSides(sides) {
  if (!Array.isArray(sides) || sides.length === 0) return ["1", "2"];
  if (sides.length === 1) return [sides[0], "2"];

  // Get the expected face count for this sides array
  const diceType = getDiceTypeFromSides(sides);
  const expectedCount = getExpectedFaceCount(diceType);

  // Slice to expected count if needed
  if (sides.length > expectedCount) {
    return sides.slice(0, expectedCount);
  }

  return sides;
}

/**
 * Convierte una notación string a formato gameSet
 * @param {string} notation - Notación tipo "4d6 + 2d8"
 * @returns {Array<{dictionaryIndex: number, quantity: number}>}
 *
 * @example
 * notationToGameSet("4d6 + 2d8")
 * // Returns: [
 * //   { dictionaryIndex: 1, quantity: 4 },
 * //   { dictionaryIndex: 2, quantity: 2 }
 * // ]
 */
export function notationToGameSet(notation) {
  if (!notation || notation === "0") {
    return [];
  }

  const diceCount = {};
  // Regex para extraer cantidad y tipo de dado (ej: "4d6", "d20", "2d8")
  const diceRegex = /(\d*)d(\d+)/gi;
  let match;

  while ((match = diceRegex.exec(notation)) !== null) {
    const quantity = match[1] ? parseInt(match[1]) : 1;
    const diceType = "d" + match[2];

    // Contar dados del mismo tipo
    diceCount[diceType] = (diceCount[diceType] || 0) + quantity;
  }

  // Convertir a formato gameSet con dictionaryIndex
  const gameSet = [];
  for (const [diceType, quantity] of Object.entries(diceCount)) {
    const index = DEFAULT_DICE.findIndex((d) => d.title === diceType);
    if (index !== -1) {
      gameSet.push({
        dictionaryIndex: index,
        quantity: quantity,
      });
    } else {
      console.warn(`Unknown dice type: ${diceType}`);
    }
  }

  return gameSet;
}

/**
 * Convierte un gameSet a notación string
 * @param {Array<{dictionaryIndex: number, quantity: number}>} gameSet
 * @returns {string} - Notación tipo "4d6 + 2d8"
 *
 * @example
 * gameSetToNotation([
 *   { dictionaryIndex: 1, quantity: 4 },
 *   { dictionaryIndex: 2, quantity: 2 }
 * ])
 * // Returns: "4d6 + 2d8"
 */
export function gameSetToNotation(gameSet) {
  if (!gameSet || gameSet.length === 0) {
    return "0";
  }

  return gameSet
    .map((item) => {
      const dice = DEFAULT_DICE[item.dictionaryIndex];
      if (!dice) {
        console.warn(`Invalid dictionaryIndex: ${item.dictionaryIndex}`);
        return "";
      }
      const prefix = item.quantity > 1 ? item.quantity : "";
      return `${prefix}${dice.title}`;
    })
    .filter((s) => s)
    .join(" + ");
}

/**
 * Convierte un array de resultados a formato string legible
 * @param {string[]} results - Array de resultados
 * @param {number} sum - Suma total
 * @returns {string} - Format: "A, B, 4, 3<br>4 + 3 = 7"
 */
export function resultsToString(results, sum) {
  if (!results || results.length === 0) {
    return "";
  }

  // Line 1: All faces separated by comma
  const allFaces = results.join(", ");

  // Line 2: Only numeric values with sum
  const numericResults = results.filter((r) => !isNaN(parseFloat(r)));

  let line2 = "";
  if (numericResults.length > 0) {
    line2 = numericResults.join(" + ") + " = " + sum;
  }

  // Combine with line break
  if (line2) {
    return `${allFaces}<br>${line2}`;
  }
  return allFaces;
}

/**
 * Parsea una notación antigua (del formato viejo) y la convierte al nuevo formato
 * @param {Object} oldNotation - Objeto notation del formato antiguo
 * @returns {Array<{dictionaryIndex: number, quantity: number}>}
 */
export function parseOldNotation(oldNotation) {
  if (!oldNotation || !oldNotation.set) {
    return [];
  }

  const diceCount = {};

  // Contar dados por tipo
  oldNotation.set.forEach((diceType) => {
    diceCount[diceType] = (diceCount[diceType] || 0) + 1;
  });

  // Convertir a nuevo formato con dictionaryIndex
  return Object.entries(diceCount)
    .map(([diceType, quantity]) => {
      const index = DEFAULT_DICE.findIndex((d) => d.title === diceType);
      return index !== -1 ? { dictionaryIndex: index, quantity } : null;
    })
    .filter((d) => d !== null);
}

/**
 * Convierte el gameSet al formato antiguo de notation.set
 * @param {Array<{dictionaryIndex: number, quantity: number}>} gameSet
 * @param {Array} [diceDictionary] - Optional custom dice dictionary (defaults to DEFAULT_DICE)
 * @returns {Array<string|{type: string, sides: string[]}>} - Array de tipos de dados o objetos con tipo y caras personalizadas
 */
export function gameSetToOldFormat(gameSet, diceDictionary = DEFAULT_DICE) {
  const result = [];

  gameSet.forEach((item) => {
    const dice = diceDictionary[item.dictionaryIndex];
    if (dice) {
      // Validate sides (0-1 becomes 2)
      const validatedSides = validateDiceSides(dice.sides);
      const isCustomSides = !isStandardDice(dice);
      // Get geometry type from sides length
      const geometryType = getDiceTypeFromSides(validatedSides);

      for (let i = 0; i < item.quantity; i++) {
        // Always pass sides for coins so faces and results use emoji
        if (geometryType === "coin" || isCustomSides) {
          result.push({ type: geometryType, sides: validatedSides });
        } else {
          result.push(geometryType);
        }
      }
    }
  });

  return result;
}

/**
 * Checks if a dice definition has standard sides (numeric 1-n or 0-9 for d10)
 * @param {Object} dice - Dice definition with title and sides
 * @returns {boolean} - True if standard, false if custom
 */
export function isStandardDice(dice) {
  const standardSides = {
    coin: ["👑", "⚔️"],
    d4: ["1", "2", "3", "4"],
    d6: ["1", "2", "3", "4", "5", "6"],
    d8: ["1", "2", "3", "4", "5", "6", "7", "8"],
    d10: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    d12: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    d20: [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
    ],
    d2: ["1", "2"],
  };

  // Get the dice type from sides length
  const diceType = getDiceTypeFromSides(dice.sides);
  const standard = standardSides[diceType];
  if (!standard) return false;
  if (dice.sides.length !== standard.length) return false;

  return dice.sides.every((side, i) => side === standard[i]);
}

/**
 * Obtiene las caras estándar para un tipo de dado por índice
 * @param {number} dictionaryIndex - Índice en el diccionario
 * @returns {string[]} - Array de caras
 */
export function getSidesByIndex(dictionaryIndex) {
  const dice = DEFAULT_DICE[dictionaryIndex];
  return dice ? [...dice.sides] : [];
}

/**
 * Obtiene el título de un dado por índice
 * @param {number} dictionaryIndex - Índice en el diccionario
 * @returns {string} - Título del dado (ej: "d6")
 */
export function getTitleByIndex(dictionaryIndex) {
  const dice = DEFAULT_DICE[dictionaryIndex];
  return dice ? dice.title : "";
}

export { DEFAULT_DICE as DICE_DICTIONARY };
export function isCustomDiceIndex(dictionaryIndex = 0) {
  const index = Number.isInteger(dictionaryIndex) ? dictionaryIndex : -1;
  return index >= DEFAULT_DICE.length;
}