/**
 * Utilidades para convertir entre notación de dados y el formato de estado
 */

import { gameState } from './gameState.js';

/**
 * Array de definiciones de dados (debe coincidir con diceDictionary del estado)
 * Índice 0: d4, 1: d6, 2: d8, 3: d10, 4: d12, 5: d20, 6: d100
 */
export const DEFAULT_DICE = [
  { title: "d4", type: "d4", sides: ["1", "2", "3", "4"] },
  { title: "d6", type: "d6", sides: ["1", "2", "3", "4", "5", "6"] },
  { title: "d8", type: "d8", sides: ["1", "2", "3", "4", "5", "6", "7", "8"] },
  { title: "d10", type: "d10", sides: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] },
  { title: "d12", type: "d12", sides: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] },
  { title: "d20", type: "d20", sides: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"] },
  { title: "d100", type: "d100", sides: ["00", "10", "20", "30", "40", "50", "60", "70", "80", "90"] },
  // Custom dice examples
  { title: "d6-custom", type: "d6", sides: ["X", "Y", "Z", ":)", "V", "🙃"] },
  { title: "d4-letter", type: "d4", sides: ["A", "B", "C", "D"] },
  { title: "d100-d10based", type: "d100", sides: ["00", "10", "20", "30", "40", "50", "60", "70", "80", "90"] },
];

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
  if (!notation || notation === '0') {
    return [];
  }

  const diceCount = {};
  // Regex para extraer cantidad y tipo de dado (ej: "4d6", "d20", "2d8")
  const diceRegex = /(\d*)d(\d+)/gi;
  let match;

  while ((match = diceRegex.exec(notation)) !== null) {
    const quantity = match[1] ? parseInt(match[1]) : 1;
    const diceType = 'd' + match[2];
    
    // Contar dados del mismo tipo
    diceCount[diceType] = (diceCount[diceType] || 0) + quantity;
  }

  // Convertir a formato gameSet con dictionaryIndex
  const gameSet = [];
  for (const [diceType, quantity] of Object.entries(diceCount)) {
    const index = DEFAULT_DICE.findIndex(d => d.title === diceType);
    if (index !== -1) {
      gameSet.push({
        dictionaryIndex: index,
        quantity: quantity
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
    return '0';
  }

  return gameSet.map(item => {
    const dice = DEFAULT_DICE[item.dictionaryIndex];
    if (!dice) {
      console.warn(`Invalid dictionaryIndex: ${item.dictionaryIndex}`);
      return '';
    }
    const prefix = item.quantity > 1 ? item.quantity : '';
    return `${prefix}${dice.title}`;
  }).filter(s => s).join(' + ');
}



/**
 * Convierte un array de resultados a formato string legible
 * @param {string[]} results - Array de resultados
 * @param {number} sum - Suma total
 * @returns {string} - Format: "A, B, 4, 3<br>4 + 3 = 7"
 */
export function resultsToString(results, sum) {
  if (!results || results.length === 0) {
    return '';
  }
  
  // Line 1: All faces separated by comma
  const allFaces = results.join(', ');
  
  // Line 2: Only numeric values with sum
  const numericResults = results.filter(r => !isNaN(parseFloat(r)));
  
  let line2 = '';
  if (numericResults.length > 0) {
    line2 = numericResults.join(' + ') + ' = ' + sum;
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
  oldNotation.set.forEach(diceType => {
    diceCount[diceType] = (diceCount[diceType] || 0) + 1;
  });

  // Convertir a nuevo formato con dictionaryIndex
  return Object.entries(diceCount).map(([diceType, quantity]) => {
    const index = DEFAULT_DICE.findIndex(d => d.title === diceType);
    return index !== -1 ? { dictionaryIndex: index, quantity } : null;
  }).filter(d => d !== null);
}

/**
 * Convierte el gameSet al formato antiguo de notation.set
 * @param {Array<{dictionaryIndex: number, quantity: number}>} gameSet
 * @param {Array} [diceDictionary] - Optional custom dice dictionary (defaults to DEFAULT_DICE)
 * @returns {Array<string|{type: string, sides: string[]}>} - Array de tipos de dados o objetos con tipo y caras personalizadas
 */
export function gameSetToOldFormat(gameSet, diceDictionary = DEFAULT_DICE) {
  const result = [];
  
  gameSet.forEach(item => {
    const dice = diceDictionary[item.dictionaryIndex];
    if (dice) {
      const isCustomSides = !isStandardDice(dice);
      const geometryType = dice.type || dice.title; // Use type for geometry, fallback to title
      for (let i = 0; i < item.quantity; i++) {
        if (isCustomSides) {
          result.push({ type: geometryType, sides: dice.sides });
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
    d4: ["1", "2", "3", "4"],
    d6: ["1", "2", "3", "4", "5", "6"],
    d8: ["1", "2", "3", "4", "5", "6", "7", "8"],
    d10: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    d12: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    d20: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
    d100: ["00", "10", "20", "30", "40", "50", "60", "70", "80", "90"]
  };
  
  // Use dice.type for lookup (falls back to dice.title for compatibility)
  const diceType = dice.type || dice.title;
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
  return dice ? dice.title : '';
}

export { DEFAULT_DICE as DICE_DICTIONARY };
