/**
 * Utilidades para convertir entre notación de dados y el formato de estado
 */

/**
 * Mapeo de tipos de dados a sus caras
 */
const DICE_SIDES = {
  'd4': ["1", "2", "3", "4"],
  'd6': ["1", "2", "3", "4", "5", "6"],
  'd8': ["1", "2", "3", "4", "5", "6", "7", "8"],
  'd10': ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  'd12': ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  'd20': ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
  'd100': ["00", "10", "20", "30", "40", "50", "60", "70", "80", "90"],
};

/**
 * Convierte una notación string a formato gameSet
 * @param {string} notation - Notación tipo "4d6 + 2d8"
 * @returns {Array<{quantity: number, sides: string[]}>}
 * 
 * @example
 * notationToGameSet("4d6 + 2d8")
 * // Returns: [
 * //   { quantity: 4, sides: ["1", "2", "3", "4", "5", "6"] },
 * //   { quantity: 2, sides: ["1", "2", "3", "4", "5", "6", "7", "8"] }
 * // ]
 */
export function notationToGameSet(notation) {
  if (!notation || notation === '0') {
    return [];
  }

  const gameSet = [];
  // Regex para extraer cantidad y tipo de dado (ej: "4d6", "d20", "2d8")
  const diceRegex = /(\d*)d(\d+)/gi;
  let match;

  while ((match = diceRegex.exec(notation)) !== null) {
    const quantity = match[1] ? parseInt(match[1]) : 1;
    const diceType = 'd' + match[2];
    
    if (DICE_SIDES[diceType]) {
      // Buscar si ya existe un dado del mismo tipo en el gameSet
      const existingDice = gameSet.find(d => 
        JSON.stringify(d.sides) === JSON.stringify(DICE_SIDES[diceType])
      );
      
      if (existingDice) {
        existingDice.quantity += quantity;
      } else {
        gameSet.push({
          quantity: quantity,
          sides: [...DICE_SIDES[diceType]]
        });
      }
    } else {
      console.warn(`Unknown dice type: ${diceType}`);
    }
  }

  return gameSet;
}

/**
 * Convierte un gameSet a notación string
 * @param {Array<{quantity: number, sides: string[]}>} gameSet
 * @returns {string} - Notación tipo "4d6 + 2d8"
 * 
 * @example
 * gameSetToNotation([
 *   { quantity: 4, sides: ["1", "2", "3", "4", "5", "6"] },
 *   { quantity: 2, sides: ["1", "2", "3", "4", "5", "6", "7", "8"] }
 * ])
 * // Returns: "4d6 + 2d8"
 */
export function gameSetToNotation(gameSet) {
  if (!gameSet || gameSet.length === 0) {
    return '0';
  }

  return gameSet.map(dice => {
    // Detectar el tipo de dado basado en el número de caras
    const sidesCount = dice.sides.length;
    const diceType = getDiceTypeFromSides(dice.sides);
    
    const prefix = dice.quantity > 1 ? dice.quantity : '';
    return `${prefix}${diceType}`;
  }).join(' + ');
}

/**
 * Determina el tipo de dado basado en sus caras
 * @param {string[]} sides - Array de caras del dado
 * @returns {string} - Tipo de dado (ej: "d6", "d20")
 */
function getDiceTypeFromSides(sides) {
  // Buscar coincidencia exacta
  for (const [type, standardSides] of Object.entries(DICE_SIDES)) {
    if (JSON.stringify(sides) === JSON.stringify(standardSides)) {
      return type;
    }
  }
  
  // Si no hay coincidencia, usar el número de caras
  return `d${sides.length}`;
}

/**
 * Convierte un array de resultados a formato string legible
 * @param {string[]} results - Array de resultados
 * @param {number} sum - Suma total
 * @returns {string} - Formato "3 4 5 2 = 14"
 */
export function resultsToString(results, sum) {
  if (!results || results.length === 0) {
    return '';
  }
  
  return `${results.join(' ')} = ${sum}`;
}

/**
 * Parsea una notación antigua (del formato viejo) y la convierte al nuevo formato
 * @param {Object} oldNotation - Objeto notation del formato antiguo
 * @returns {Array<{quantity: number, sides: string[]}>}
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

  // Convertir a nuevo formato
  return Object.entries(diceCount).map(([diceType, quantity]) => ({
    quantity: quantity,
    sides: DICE_SIDES[diceType] ? [...DICE_SIDES[diceType]] : []
  })).filter(d => d.sides.length > 0);
}

/**
 * Convierte el gameSet al formato antiguo de notation.set
 * @param {Array<{quantity: number, sides: string[]}>} gameSet
 * @returns {string[]} - Array de tipos de dados (ej: ["d6", "d6", "d8"])
 */
export function gameSetToOldFormat(gameSet) {
  const result = [];
  
  gameSet.forEach(dice => {
    const diceType = getDiceTypeFromSides(dice.sides);
    for (let i = 0; i < dice.quantity; i++) {
      result.push(diceType);
    }
  });
  
  return result;
}

/**
 * Obtiene las caras estándar para un tipo de dado
 * @param {string} diceType - Tipo de dado (ej: "d6", "d20")
 * @returns {string[]} - Array de caras
 */
export function getStandardSides(diceType) {
  return DICE_SIDES[diceType] ? [...DICE_SIDES[diceType]] : [];
}

/**
 * Verifica si un dado es estándar
 * @param {string[]} sides - Caras del dado
 * @returns {boolean}
 */
export function isStandardDice(sides) {
  return Object.values(DICE_SIDES).some(standardSides => 
    JSON.stringify(sides) === JSON.stringify(standardSides)
  );
}

export { DICE_SIDES };
