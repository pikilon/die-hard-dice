/**
 * Adaptador para dados con caras customizables
 * 
 * NOTA: La implementación actual de DiceBox usa geometrías fijas para cada tipo de dado.
 * Este módulo proporciona utilidades para trabajar con dados customizables a nivel de estado,
 * pero la visualización 3D seguirá usando las geometrías estándar.
 * 
 * Para implementar dados completamente customizables en 3D se requeriría:
 * 1. Modificar los módulos de geometría (d4.js, d6.js, etc.) para aceptar labels customizables
 * 2. Actualizar el sistema de materiales y texturas para renderizar caras custom
 * 3. Modificar el sistema de detección de cara superior para caras no estándar
 */

import { DICE_SIDES } from './notationUtils.js';

/**
 * Crea un dado customizable con caras arbitrarias
 * @param {number} quantity - Cantidad de dados
 * @param {string[]} sides - Array de valores para las caras (puede ser strings arbitrarios)
 * @returns {{quantity: number, sides: string[]}}
 * 
 * @example
 * // Dado de 6 caras estándar
 * createCustomDice(1, ["1", "2", "3", "4", "5", "6"])
 * 
 * @example
 * // Dado de Fudge/FATE
 * createCustomDice(4, ["+", "+", "0", "0", "-", "-"])
 * 
 * @example
 * // Dado con símbolos
 * createCustomDice(1, ["⚔️", "🛡️", "🏹", "🔮", "💀", "⭐"])
 */
export function createCustomDice(quantity, sides) {
  if (!Array.isArray(sides) || sides.length === 0) {
    throw new Error('Sides must be a non-empty array');
  }
  
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }
  
  return {
    quantity: quantity,
    sides: [...sides]
  };
}

/**
 * Crea un dado de Fudge/FATE (6 caras: +, +, 0, 0, -, -)
 * @param {number} quantity - Cantidad de dados
 * @returns {{quantity: number, sides: string[]}}
 */
export function createFudgeDice(quantity = 1) {
  return createCustomDice(quantity, ["+", "+", "0", "0", "-", "-"]);
}

/**
 * Crea un dado con un rango customizado
 * @param {number} quantity - Cantidad de dados
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {{quantity: number, sides: string[]}}
 * 
 * @example
 * // Dado del 0 al 9
 * createRangeDice(1, 0, 9)
 */
export function createRangeDice(quantity, min, max) {
  if (min >= max) {
    throw new Error('Min must be less than max');
  }
  
  const sides = [];
  for (let i = min; i <= max; i++) {
    sides.push(String(i));
  }
  
  return createCustomDice(quantity, sides);
}

/**
 * Crea un dado con valores duplicados (para probabilidades no uniformes)
 * @param {number} quantity - Cantidad de dados
 * @param {Object} valueWeights - Objeto con valores y sus pesos
 * @returns {{quantity: number, sides: string[]}}
 * 
 * @example
 * // Dado sesgado: 50% de sacar "6", 25% de "3", 25% de "1"
 * createWeightedDice(1, { "6": 2, "3": 1, "1": 1 })
 */
export function createWeightedDice(quantity, valueWeights) {
  const sides = [];
  
  for (const [value, weight] of Object.entries(valueWeights)) {
    for (let i = 0; i < weight; i++) {
      sides.push(String(value));
    }
  }
  
  if (sides.length === 0) {
    throw new Error('Weighted dice must have at least one face');
  }
  
  return createCustomDice(quantity, sides);
}

/**
 * Simula el lanzamiento de un dado customizado
 * @param {{quantity: number, sides: string[]}} dice - Configuración del dado
 * @returns {string[]} - Array de resultados
 * 
 * @example
 * const dice = createFudgeDice(4);
 * const results = rollCustomDice(dice);
 * // Posible resultado: ["+", "0", "-", "+"]
 */
export function rollCustomDice(dice) {
  const results = [];
  
  for (let i = 0; i < dice.quantity; i++) {
    const randomIndex = Math.floor(Math.random() * dice.sides.length);
    results.push(dice.sides[randomIndex]);
  }
  
  return results;
}

/**
 * Convierte resultados de dados Fudge a suma numérica
 * @param {string[]} results - Resultados de dados Fudge
 * @returns {number} - Suma (-1 por cada "-", +1 por cada "+", 0 por cada "0")
 * 
 * @example
 * calculateFudgeSum(["+", "+", "0", "-"]) // Returns: 1
 */
export function calculateFudgeSum(results) {
  return results.reduce((sum, value) => {
    if (value === '+') return sum + 1;
    if (value === '-') return sum - 1;
    return sum;
  }, 0);
}

/**
 * Valida si un conjunto de caras es compatible con un tipo de dado estándar
 * @param {string[]} sides - Caras del dado
 * @returns {{isStandard: boolean, type: string|null}} - Info sobre compatibilidad
 */
export function validateDiceCompatibility(sides) {
  for (const [type, standardSides] of Object.entries(DICE_SIDES)) {
    if (JSON.stringify(sides) === JSON.stringify(standardSides)) {
      return {
        isStandard: true,
        type: type,
        visualizable: true
      };
    }
    
    // Verificar si tiene el mismo número de caras (puede visualizarse pero con valores diferentes)
    if (sides.length === standardSides.length) {
      return {
        isStandard: false,
        type: type,
        visualizable: true,
        note: `Can use ${type} geometry with custom labels (not yet implemented)`
      };
    }
  }
  
  return {
    isStandard: false,
    type: null,
    visualizable: false,
    note: 'No standard geometry available. Would require custom 3D model.'
  };
}

/**
 * Presets de dados customizados comunes
 */
export const CUSTOM_DICE_PRESETS = {
  // Dados Fudge/FATE
  fudge: {
    name: 'Fudge/FATE Dice',
    dice: createFudgeDice(1),
    description: 'Six-sided dice with +, 0, and - faces'
  },
  
  // Dado de dirección (norte, sur, este, oeste)
  direction4: {
    name: 'Direction Die (4)',
    dice: createCustomDice(1, ['N', 'S', 'E', 'W']),
    description: 'Four directions'
  },
  
  // Dado de dirección con diagonales
  direction8: {
    name: 'Direction Die (8)',
    dice: createCustomDice(1, ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']),
    description: 'Eight directions including diagonals'
  },
  
  // Dado de sí/no
  yesNo: {
    name: 'Yes/No Die',
    dice: createCustomDice(1, ['Yes', 'Yes', 'No', 'No', 'Maybe', 'Maybe']),
    description: 'Decision making die'
  },
  
  // Dado de operaciones matemáticas
  mathOps: {
    name: 'Math Operations',
    dice: createCustomDice(1, ['+', '-', '×', '÷', '=', '?']),
    description: 'Mathematical operations'
  },
  
  // Dado de moneda (cara/cruz)
  coin: {
    name: 'Coin Flip',
    dice: createCustomDice(1, ['Heads', 'Tails']),
    description: 'Simulates a coin flip'
  }
};

/**
 * Obtiene un preset de dado customizado
 * @param {string} presetName - Nombre del preset
 * @returns {{quantity: number, sides: string[]}} - Configuración del dado
 */
export function getCustomDicePreset(presetName) {
  const preset = CUSTOM_DICE_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}. Available: ${Object.keys(CUSTOM_DICE_PRESETS).join(', ')}`);
  }
  
  return { ...preset.dice, sides: [...preset.dice.sides] };
}

/**
 * Ejemplo de uso futuro con el gameState
 * 
 * @example
 * import { gameState } from './gameState.js';
 * import { createFudgeDice, createCustomDice } from './customDice.js';
 * 
 * // Configurar un set con dados customizados
 * gameState.setGameSet([
 *   createFudgeDice(4),  // 4 dados Fudge
 *   createCustomDice(1, ["⚔️", "🛡️", "🏹", "🔮", "💀", "⭐"])  // 1 dado de símbolos
 * ]);
 * 
 * // Los resultados podrían ser:
 * gameState.setLastResult(["+", "0", "-", "+", "⚔️"]);
 * // sum será 1 (solo cuenta los números)
 */

export default {
  createCustomDice,
  createFudgeDice,
  createRangeDice,
  createWeightedDice,
  rollCustomDice,
  calculateFudgeSum,
  validateDiceCompatibility,
  getCustomDicePreset,
  CUSTOM_DICE_PRESETS
};
