# Ejemplos de Uso - Dados Customizables

Este archivo contiene ejemplos prácticos de cómo usar el nuevo sistema de dados con caras customizables.

## Índice
- [Ejemplos Básicos](#ejemplos-básicos)
- [Dados Customizables](#dados-customizables)
- [Integración con Sistemas de RPG](#integración-con-sistemas-de-rpg)
- [Dados Especiales](#dados-especiales)

## Ejemplos Básicos

### 1. Configurar dados estándar (D&D style)
```javascript
import { gameState } from './js/modules/gameState.js';
import { notationToGameSet } from './js/modules/notationUtils.js';

// Método 1: Usando notación string
const gameSet = notationToGameSet("4d6");
gameState.setGameSet(gameSet);

// Método 2: Directamente con el array
gameState.setGameSet([
  { 
    quantity: 4, 
    sides: ["1", "2", "3", "4", "5", "6"] 
  }
]);
```

### 2. Leer el estado actual
```javascript
// Obtener todo el estado
const state = gameState.getState();
console.log(state);
// {
//   gameSet: [...],
//   lastResult: [...],
//   sum: 0
// }

// Obtener solo un valor
const currentGameSet = gameState.getState('gameSet');
const lastResult = gameState.getState('lastResult');
const sum = gameState.getState('sum');
```

### 3. Suscribirse a cambios
```javascript
// Escuchar cambios en resultados
const unsubscribe = gameState.subscribe('lastResult', (results) => {
  console.log('Nuevos resultados:', results);
  console.log('Suma:', gameState.getState('sum'));
});

// Cuando ya no necesites la suscripción
unsubscribe();
```

## Dados Customizables

### 4. Dados Fudge/FATE
```javascript
import { createFudgeDice, calculateFudgeSum } from './js/modules/customDice.js';

// Configurar 4 dados Fudge
const fudgeDice = createFudgeDice(4);
gameState.setGameSet([fudgeDice]);

// Simular un resultado
gameState.setLastResult(["+", "+", "0", "-"]);

// Calcular suma Fudge
const results = gameState.getState('lastResult');
const fudgeSum = calculateFudgeSum(results);
console.log('Suma Fudge:', fudgeSum); // 1
```

### 5. Dados con símbolos
```javascript
import { createCustomDice } from './js/modules/customDice.js';

// Dado de acciones de combate
const combatDice = createCustomDice(1, [
  "⚔️", // Ataque
  "🛡️", // Defensa
  "🏹", // Disparo
  "🔮", // Magia
  "💀", // Crítico
  "⭐"  // Especial
]);

gameState.setGameSet([combatDice]);
```

### 6. Dados con texto
```javascript
import { createCustomDice } from './js/modules/customDice.js';

// Dado de decisiones
const decisionDice = createCustomDice(1, [
  "Yes",
  "Yes",
  "No", 
  "No",
  "Maybe",
  "Maybe"
]);

// Dado de direcciones
const directionDice = createCustomDice(1, [
  "North",
  "South", 
  "East",
  "West"
]);

gameState.setGameSet([decisionDice, directionDice]);
```

### 7. Dados con probabilidades no uniformes
```javascript
import { createWeightedDice } from './js/modules/customDice.js';

// Dado sesgado: 50% de sacar 6, 25% de 3, 25% de 1
const weightedDice = createWeightedDice(1, {
  "6": 2,
  "3": 1,
  "1": 1
});

gameState.setGameSet([weightedDice]);
```

### 8. Dados con rangos customizados
```javascript
import { createRangeDice } from './js/modules/customDice.js';

// Dado del 0 al 9
const d10zero = createRangeDice(1, 0, 9);

// Dado del 10 al 20
const d10high = createRangeDice(1, 10, 20);

gameState.setGameSet([d10zero, d10high]);
```

## Integración con Sistemas de RPG

### 9. D&D 5e - Tirada de atributo (4d6, quitar el más bajo)
```javascript
import { notationToGameSet } from './js/modules/notationUtils.js';

// Configurar 4d6
const gameSet = notationToGameSet("4d6");
gameState.setGameSet(gameSet);

// Después del lanzamiento, procesar resultados
gameState.subscribe('lastResult', (results) => {
  const numbers = results.map(r => parseInt(r)).sort((a, b) => a - b);
  const topThree = numbers.slice(1); // Quitar el más bajo
  const sum = topThree.reduce((a, b) => a + b, 0);
  
  console.log('Dados:', results);
  console.log('Top 3:', topThree);
  console.log('Atributo:', sum);
});
```

### 10. FATE - Pool de dados Fudge
```javascript
import { createFudgeDice, calculateFudgeSum } from './js/modules/customDice.js';

// Sistema FATE estándar: 4dF
const fateDice = createFudgeDice(4);
gameState.setGameSet([fateDice]);

// Crear calculadora FATE
class FateRollCalculator {
  constructor() {
    this.skill = 0;
    
    gameState.subscribe('lastResult', (results) => {
      const diceResult = calculateFudgeSum(results);
      const total = this.skill + diceResult;
      
      console.log(`Skill: +${this.skill}`);
      console.log(`Dice: ${results.join(' ')}`);
      console.log(`Total: ${total}`);
      console.log(`Result: ${this.interpretResult(total)}`);
    });
  }
  
  setSkill(skill) {
    this.skill = skill;
  }
  
  interpretResult(total) {
    if (total >= 8) return 'Legendary (+8)';
    if (total >= 7) return 'Epic (+7)';
    if (total >= 6) return 'Fantastic (+6)';
    if (total >= 5) return 'Superb (+5)';
    if (total >= 4) return 'Great (+4)';
    if (total >= 3) return 'Good (+3)';
    if (total >= 2) return 'Fair (+2)';
    if (total >= 1) return 'Average (+1)';
    if (total >= 0) return 'Mediocre (+0)';
    if (total >= -1) return 'Poor (-1)';
    return 'Terrible (-2 or worse)';
  }
}

const fateCalc = new FateRollCalculator();
fateCalc.setSkill(3); // Skill +3
```

### 11. Warhammer - Dados de Éxito/Fracaso
```javascript
import { createCustomDice } from './js/modules/customDice.js';

// Dados custom de Warhammer
const successDice = createCustomDice(3, [
  "Success",
  "Success",
  "Success",
  "Advantage",
  "Advantage", 
  "Blank"
]);

const challengeDice = createCustomDice(2, [
  "Failure",
  "Failure",
  "Threat",
  "Threat",
  "Blank",
  "Blank"
]);

gameState.setGameSet([successDice, challengeDice]);

// Procesar resultados
gameState.subscribe('lastResult', (results) => {
  const successes = results.filter(r => r === 'Success').length;
  const failures = results.filter(r => r === 'Failure').length;
  const advantages = results.filter(r => r === 'Advantage').length;
  const threats = results.filter(r => r === 'Threat').length;
  
  const netSuccess = successes - failures;
  const netAdvantage = advantages - threats;
  
  console.log('Net Success:', netSuccess);
  console.log('Net Advantage:', netAdvantage);
});
```

### 12. Sistema Percentil (d100)
```javascript
import { notationToGameSet } from './js/modules/notationUtils.js';

// d100 usando 2d10 (decenas y unidades)
const tensPlace = { quantity: 1, sides: ["00", "10", "20", "30", "40", "50", "60", "70", "80", "90"] };
const onesPlace = { quantity: 1, sides: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] };

gameState.setGameSet([tensPlace, onesPlace]);

gameState.subscribe('lastResult', (results) => {
  const tens = parseInt(results[0]);
  const ones = parseInt(results[1]);
  const total = tens + ones || 100; // 00 + 0 = 100
  
  console.log('d100 Result:', total);
});
```

## Dados Especiales

### 13. Dado de Historia (Story Cube)
```javascript
import { createCustomDice } from './js/modules/customDice.js';

const storyCube = createCustomDice(1, [
  "🏰", // Castillo
  "🌟", // Estrella
  "🔑", // Llave
  "🗡️", // Espada
  "📖", // Libro
  "🔮"  // Bola de cristal
]);

gameState.setGameSet([storyCube]);

gameState.subscribe('lastResult', (results) => {
  const prompts = {
    "🏰": "A castle or fortress",
    "🌟": "A wish or dream",
    "🔑": "A secret or solution",
    "🗡️": "A conflict or battle",
    "📖": "Knowledge or a story",
    "🔮": "Magic or mystery"
  };
  
  console.log('Story Prompt:', prompts[results[0]]);
});
```

### 14. Generador de Encuentros
```javascript
import { createCustomDice } from './js/modules/customDice.js';

const encounterTypeDice = createCustomDice(1, [
  "Combat",
  "Social",
  "Exploration",
  "Puzzle",
  "Trap",
  "Rest"
]);

const encounterDifficultyDice = createCustomDice(1, [
  "Easy",
  "Medium",
  "Hard",
  "Deadly"
]);

gameState.setGameSet([encounterTypeDice, encounterDifficultyDice]);

gameState.subscribe('lastResult', (results) => {
  const [type, difficulty] = results;
  console.log(`Encounter: ${difficulty} ${type}`);
});
```

### 15. Generador de Clima
```javascript
import { createCustomDice, createWeightedDice } from './js/modules/customDice.js';

// Clima con probabilidades realistas
const weatherDice = createWeightedDice(1, {
  "☀️ Sunny": 3,
  "⛅ Partly Cloudy": 3,
  "☁️ Cloudy": 2,
  "🌧️ Rainy": 1,
  "⛈️ Storm": 1
});

gameState.setGameSet([weatherDice]);
```

### 16. Sistema de Heridas Críticas
```javascript
import { createCustomDice } from './js/modules/customDice.js';

const locationDice = createCustomDice(1, [
  "Head",
  "Torso",
  "Right Arm",
  "Left Arm", 
  "Right Leg",
  "Left Leg"
]);

const severityDice = createCustomDice(1, [
  "Minor",
  "Minor",
  "Moderate",
  "Moderate",
  "Severe",
  "Critical"
]);

gameState.setGameSet([locationDice, severityDice]);

gameState.subscribe('lastResult', (results) => {
  const [location, severity] = results;
  console.log(`Critical Hit: ${severity} wound to ${location}`);
});
```

## Utilidades de Apoyo

### 17. Simulador de Lanzamientos
```javascript
import { rollCustomDice } from './js/modules/customDice.js';

// Simular muchos lanzamientos para análisis
function simulateRolls(dice, count) {
  const results = {};
  
  for (let i = 0; i < count; i++) {
    const roll = rollCustomDice(dice);
    const key = roll.join(',');
    results[key] = (results[key] || 0) + 1;
  }
  
  return results;
}

// Ejemplo: Analizar probabilidades de dado sesgado
import { createWeightedDice } from './js/modules/customDice.js';
const biasedDice = createWeightedDice(1, { "6": 3, "1": 1 });

const stats = simulateRolls(biasedDice, 1000);
console.log('Estadísticas de 1000 lanzamientos:', stats);
```

### 18. Validador de Dados
```javascript
import { validateDiceCompatibility } from './js/modules/customDice.js';

// Verificar si un dado custom puede visualizarse en 3D
const customSides = ["A", "B", "C", "D", "E", "F"];
const validation = validateDiceCompatibility(customSides);

console.log(validation);
// {
//   isStandard: false,
//   type: 'd6',
//   visualizable: true,
//   note: 'Can use d6 geometry with custom labels (not yet implemented)'
// }
```

### 19. Conversor de Notación
```javascript
import { 
  notationToGameSet, 
  gameSetToNotation 
} from './js/modules/notationUtils.js';

// String → GameSet
const gameSet = notationToGameSet("2d20 + 3d6");
console.log(gameSet);

// GameSet → String
const notation = gameSetToNotation(gameSet);
console.log(notation); // "2d20 + 3d6"
```

### 20. Sistema de Presets
```javascript
import { 
  CUSTOM_DICE_PRESETS, 
  getCustomDicePreset 
} from './js/modules/customDice.js';

// Ver todos los presets disponibles
console.log('Presets disponibles:', Object.keys(CUSTOM_DICE_PRESETS));

// Usar un preset
const fudgeDice = getCustomDicePreset('fudge');
const coinFlip = getCustomDicePreset('coin');
const direction = getCustomDicePreset('direction8');

gameState.setGameSet([fudgeDice]);
```

## Notas Finales

### Limitación Visual 3D
Recuerda que el sistema 3D actual solo renderiza caras numéricas estándar. Los dados customizables funcionan correctamente a nivel de:
- ✅ Estado y lógica
- ✅ Resultados y cálculos  
- ✅ Notificaciones y suscripciones
- ❌ Visualización 3D (muestra valores numéricos estándar)

Para implementar visualización 3D completa de caras custom, consulta la sección "Próximos Pasos" en `ARQUITECTURA.md`.

### Performance
El sistema está optimizado para:
- Conversiones rápidas entre formatos
- Notificaciones eficientes con PubSub
- Copias inmutables del estado
- Sin dependencias externas innecesarias

### Extensibilidad
Puedes crear fácilmente:
- Nuevos presets de dados
- Sistemas de calculadoras especializadas
- Componentes visuales que reaccionen al estado
- Persistencia del estado (localStorage, etc.)
