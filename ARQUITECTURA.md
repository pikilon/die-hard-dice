# Arquitectura PubSub con Web Components

## Resumen
Se ha refactorizado la aplicación para usar un patrón **PubSub (Publisher-Subscriber)** con **Web Components**, mejorando la separación de responsabilidades y la mantenibilidad del código. El estado ahora soporta dados con **caras customizables**.

## Estructura de Archivos

```
js/
├── main.js                              # Inicialización principal (simplificado)
├── dice.js                              # Lógica de dados (sin cambios)
└── modules/
    ├── gameState.js                     # Estado centralizado con patrón PubSub
    ├── notationUtils.js                 # Utilidades de conversión de notación
    ├── customDice.js                    # Utilidades para dados customizables
    ├── DiceInputComponent.js            # Web Component para input de dados
    └── DiceCanvasComponent.js           # Web Component para canvas de lanzamiento
```

## 1. Módulo de Estado: `gameState.js`

### Descripción
Módulo singleton que gestiona el estado global de la aplicación usando el patrón Publisher-Subscriber.

### Estado Almacenado
```javascript
{
  // Array de dados con cantidad y caras customizables
  gameSet: [
    { 
      quantity: 4, 
      sides: ["1", "2", "3", "4", "5", "6"] 
    },
    { 
      quantity: 1, 
      sides: ["1", "2", "3", "4", "5", "6", "7", "8"] 
    }
  ],
  // Array de resultados como strings
  lastResult: ["3", "4", "5", "2", "7"],
  // Suma automática de resultados numéricos
  sum: 21
}
```

### API Pública

#### `subscribe(key, callback)`
Suscribirse a cambios en el estado.
```javascript
// Suscribirse a cambios en gameSet
const unsubscribe = gameState.subscribe('gameSet', (newGameSet) => {
  console.log('GameSet cambió:', newGameSet);
  // newGameSet es un array de { quantity, sides }
});

// Suscribirse a cambios en lastResult
gameState.subscribe('lastResult', (result) => {
  console.log('Resultado:', result);
  // result es un array de strings: ["3", "4", "5"]
});

// Suscribirse a cambios en sum
gameState.subscribe('sum', (sum) => {
  console.log('Suma:', sum);
  // sum es un número: 12
});

// Suscribirse a cualquier cambio
gameState.subscribe('all', (state) => {
  console.log('Estado completo:', state);
});

// Para desuscribirse
unsubscribe();
```

#### `getState(key?)`
Obtener el estado actual.
```javascript
const gameSet = gameState.getState('gameSet');      // Array de dados
const lastResult = gameState.getState('lastResult'); // Array de strings
const sum = gameState.getState('sum');               // Número
const fullState = gameState.getState();              // Todo el estado
```

#### `setGameSet(gameSet)`
Actualizar el game set.
```javascript
gameState.setGameSet([
  { quantity: 2, sides: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"] },
  { quantity: 1, sides: ["1", "2", "3", "4", "5", "6"] }
]);
```

#### `setLastResult(result)`
Actualizar el último resultado (calcula automáticamente la suma).
```javascript
gameState.setLastResult(["5", "12", "3"]);
// Automáticamente calcula sum = 20
```

#### `update(updates)`
Actualizar múltiples valores a la vez.
```javascript
gameState.update({
  gameSet: '3d6',
  lastResult: '4 5 6 = 15'
});
```

#### `reset()`
Resetear el estado a valores por defecto.
```javascript
gameState.reset();
```

## 2. Utilidades de Notación: `notationUtils.js`

### Descripción
Módulo con funciones para convertir entre la notación string (ej: "4d6 + d8") y el nuevo formato de estado con arrays de dados customizables.

### Funciones Principales

#### `notationToGameSet(notation)`
Convierte notación string a formato gameSet.
```javascript
notationToGameSet("4d6 + 2d8")
// Returns: [
//   { quantity: 4, sides: ["1", "2", "3", "4", "5", "6"] },
//   { quantity: 2, sides: ["1", "2", "3", "4", "5", "6", "7", "8"] }
// ]
```

#### `gameSetToNotation(gameSet)`
Convierte gameSet a notación string.
```javascript
gameSetToNotation([
  { quantity: 4, sides: ["1", "2", "3", "4", "5", "6"] }
])
// Returns: "4d6"
```

#### `resultsToString(results, sum)`
Formatea resultados para mostrar.
```javascript
resultsToString(["3", "4", "5"], 12)
// Returns: "3 4 5 = 12"
```

#### `gameSetToOldFormat(gameSet)`
Convierte al formato antiguo de DiceBox.
```javascript
gameSetToOldFormat([
  { quantity: 2, sides: ["1", "2", "3", "4", "5", "6"] }
])
// Returns: ["d6", "d6"]
```

## 3. Dados Customizables: `customDice.js`

### Descripción
Utilidades para crear y trabajar con dados de caras customizables. Proporciona presets y funciones para crear dados no estándar.

### Funciones Principales

#### `createCustomDice(quantity, sides)`
Crea un dado con caras arbitrarias.
```javascript
// Dado con símbolos
createCustomDice(1, ["⚔️", "🛡️", "🏹", "🔮", "💀", "⭐"])

// Dado de sí/no
createCustomDice(1, ["Yes", "Yes", "No", "No", "Maybe", "Maybe"])
```

#### `createFudgeDice(quantity)`
Crea dados Fudge/FATE.
```javascript
createFudgeDice(4)
// Returns: { quantity: 4, sides: ["+", "+", "0", "0", "-", "-"] }
```

#### `createRangeDice(quantity, min, max)`
Crea dados con rango numérico custom.
```javascript
createRangeDice(2, 0, 9)
// Dados del 0 al 9
```

#### `createWeightedDice(quantity, valueWeights)`
Crea dados con probabilidades no uniformes.
```javascript
createWeightedDice(1, { "6": 3, "1": 1 })
// 75% de probabilidad de sacar "6", 25% de sacar "1"
```

### Presets Disponibles
```javascript
import { CUSTOM_DICE_PRESETS, getCustomDicePreset } from './customDice.js';

// Dados disponibles:
// - fudge: Dados Fudge/FATE
// - direction4: Norte, Sur, Este, Oeste
// - direction8: 8 direcciones con diagonales
// - yesNo: Sí/No/Tal vez
// - mathOps: Operaciones matemáticas
// - coin: Cara/Cruz

const fudgeDice = getCustomDicePreset('fudge');
gameState.setGameSet([fudgeDice]);
```

### Nota Importante sobre Visualización 3D
⚠️ **Limitación Actual**: El sistema 3D de DiceBox usa geometrías fijas para cada tipo de dado (d4, d6, d8, etc.). Los dados customizables funcionan a nivel de **estado y lógica**, pero la visualización 3D seguirá mostrando las caras numéricas estándar.

Para implementar visualización 3D de caras custom se requeriría:
1. Modificar las geometrías para aceptar labels customizables
2. Actualizar el sistema de texturas/materiales
3. Modificar la detección de cara superior

## 4. Web Component: `<dice-input>`

### Descripción
Componente que gestiona el input de notación de dados y los botones de control.

### Características
- **Shadow DOM**: Encapsulación de estilos y DOM
- **Sincronización bidireccional** con `gameState`:
  - Actualiza `gameState` cuando el usuario cambia el input
  - Se actualiza cuando `gameState` cambia desde otro lugar
- **Eventos personalizados**: Emite evento `throw-dice` cuando se presiona el botón throw

### Uso
```html
<dice-input></dice-input>
```

### Eventos Emitidos
```javascript
// Evento cuando se presiona el botón "throw"
document.addEventListener('throw-dice', (event) => {
  console.log('Lanzar dados:', event.detail.gameSet);
});
```

### Estructura Interna
```
<dice-input>
  #shadow-root
    <div class="input-container">
      <input id="set" type="text">
      <button id="clear">clear</button>
      <button id="throw">throw</button>
    </div>
```

## 5. Web Component: `<dice-canvas>`

### Descripción
Componente que gestiona el canvas 3D de lanzamiento de dados y la visualización de resultados.

### Características
- **Shadow DOM**: Encapsulación de estilos y DOM
- **Integración con DiceBox**: Inicializa y gestiona la librería de dados 3D
- **Sincronización con gameState**:
  - Lee `gameSet` para determinar qué dados lanzar
  - Actualiza `lastResult` después de cada lanzamiento
- **Selector de dados**: Permite seleccionar dados clickeando en el canvas

### Uso
```html
<dice-canvas></dice-canvas>
```

### Estructura Interna
```
<dice-canvas>
  #shadow-root
    <div id="canvas"></div>        <!-- Canvas 3D -->
    <div id="selector_div">        <!-- Selector de dados -->
    <div id="info_div">            <!-- Resultados -->
```

## 6. Flujo de Datos

### Lanzamiento de Dados
```
1. Usuario presiona "throw" en <dice-input>
   ↓
2. <dice-input> emite evento 'throw-dice'
   ↓
3. <dice-canvas> escucha el evento
   ↓
4. <dice-canvas> lee gameState.gameSet
   ↓
5. gameSetToOldFormat() convierte al formato de DiceBox
   ↓
6. DiceBox realiza el lanzamiento 3D
   ↓
7. Resultados se convierten a strings
   ↓
8. <dice-canvas> actualiza gameState.setLastResult(resultStrings)
   ↓
9. gameState calcula automáticamente la suma
   ↓
10. Todos los suscriptores reciben notificación
   ↓
11. UI se actualiza automáticamente
```

### Cambio de Notación
```
1. Usuario modifica input en <dice-input>
   ↓
2. notationToGameSet() parsea el string
   ↓
3. <dice-input> llama a gameState.setGameSet(parsedGameSet)
   ↓
4. gameState notifica a todos los suscriptores
   ↓
5. <dice-input> recibe notificación y actualiza su valor
   ↓
6. Estado queda sincronizado en toda la app
```

### Cálculo Automático de Suma
```
1. gameState.setLastResult(["5", "12", "X", "3"])
   ↓
2. _calculateSum() itera sobre el array
   ↓
3. Convierte a número cada string (parseFloat)
   ↓
4. Ignora valores no numéricos (NaN)
   ↓
5. sum = 5 + 12 + 3 = 20
   ↓
6. Notifica a suscriptores de 'sum'
```

## Ventajas de la Nueva Arquitectura

### 1. Separación de Responsabilidades
- **gameState**: Solo gestiona estado y notificaciones
- **DiceInputComponent**: Solo gestiona input y controles
- **DiceCanvasComponent**: Solo gestiona renderizado 3D

### 2. Desacoplamiento
- Los componentes no se conocen directamente
- Comunicación a través del estado centralizado
- Fácil agregar nuevos componentes que reaccionen al estado

### 3. Mantenibilidad
- Código más modular y fácil de testear
- Web Components con Shadow DOM (estilos encapsulados)
- Lógica de negocio separada de la UI

### 4. Extensibilidad
Fácil agregar nuevas funcionalidades:
```javascript
// Ejemplo: Historial de lanzamientos
gameState.subscribe('lastResult', (result) => {
  saveToHistory(result);
});

// Ejemplo: Estadísticas
gameState.subscribe('all', (state) => {
  updateStatistics(state);
});

// Ejemplo: Persistencia
gameState.subscribe('gameSet', (gameSet) => {
  localStorage.setItem('lastGameSet', gameSet);
});
```

## Compatibilidad

### Navegadores Soportados
- Chrome/Edge 53+
- Firefox 63+
- Safari 10.1+
- Opera 40+

Todos los navegadores modernos soportan Web Components (Custom Elements v1 y Shadow DOM v1).

## Migración desde Código Antiguo

### Antes
```javascript
// Código acoplado con referencias directas
set.value = "4d6";
label.innerHTML = result;

// Notación en string, difícil de extender
var notation = parse_notation("4d6");
// { set: ["d6", "d6", "d6", "d6"], constant: 0 }
```

### Ahora
```javascript
// Código desacoplado con estado centralizado
import { notationToGameSet } from './notationUtils.js';

const gameSet = notationToGameSet("4d6");
gameState.setGameSet(gameSet);
// gameSet: [{ quantity: 4, sides: ["1", "2", "3", "4", "5", "6"] }]

gameState.setLastResult(["3", "4", "5", "2"]);
// Automáticamente calcula sum: 14

// Fácil de extender con dados custom
import { createFudgeDice } from './customDice.js';
gameState.setGameSet([
  createFudgeDice(4),
  { quantity: 1, sides: ["A", "B", "C", "D", "E", "F"] }
]);
```

## Ejemplos de Uso

### Ejemplo 1: Dados Estándar
```javascript
import { gameState } from './modules/gameState.js';
import { notationToGameSet } from './modules/notationUtils.js';

// Configurar dados estándar
const gameSet = notationToGameSet("4d6 + 2d8");
gameState.setGameSet(gameSet);

// Simular resultado
gameState.setLastResult(["3", "4", "5", "2", "6", "7"]);
console.log(gameState.getState('sum')); // 27
```

### Ejemplo 2: Dados Customizables
```javascript
import { gameState } from './modules/gameState.js';
import { createFudgeDice, createCustomDice } from './modules/customDice.js';

// Configurar dados Fudge
gameState.setGameSet([
  createFudgeDice(4)
]);

// Resultado de dados Fudge
gameState.setLastResult(["+", "+", "0", "-"]);
console.log(gameState.getState('sum')); // 0 (no son números)

// Calcular suma Fudge manualmente
import { calculateFudgeSum } from './modules/customDice.js';
const fudgeSum = calculateFudgeSum(["+", "+", "0", "-"]); // 1
```

### Ejemplo 3: Mix de Dados
```javascript
import { createCustomDice } from './modules/customDice.js';

// Mix de dados estándar y custom
gameState.setGameSet([
  { quantity: 2, sides: ["1", "2", "3", "4", "5", "6"] }, // 2d6
  createCustomDice(1, ["🎯", "💥", "⭐", "🌟"]), // Dado de símbolos
  { quantity: 1, sides: ["+5", "+10", "+15", "+20"] } // Dado de bonos
]);

// Resultado mixto
gameState.setLastResult(["4", "5", "🎯", "+10"]);
console.log(gameState.getState('sum')); // 9 (solo cuenta 4, 5)
```

### Ejemplo 4: Suscripciones Reactivas
```javascript
// Componente que muestra historial
const historyComponent = {
  history: [],
  
  init() {
    gameState.subscribe('lastResult', (result) => {
      this.history.push({
        result: result,
        sum: gameState.getState('sum'),
        timestamp: new Date()
      });
      this.render();
    });
  },
  
  render() {
    console.log('Historial:', this.history);
  }
};

historyComponent.init();
```

## Próximos Pasos Sugeridos

1. **Visualización 3D de caras custom**: Modificar DiceBox para renderizar caras customizables
2. **Historial de lanzamientos**: Web component que muestre historial con timestamp
3. **Estadísticas**: Análisis de distribución y probabilidades
4. **Presets de dados**: UI para guardar/cargar configuraciones favoritas
5. **Editor de dados custom**: Interfaz visual para crear dados personalizados
6. **Compartir**: Generar URLs con gameSet serializado
7. **Modos de juego**: Presets para diferentes sistemas de RPG
8. **Temas**: Sistema de temas para personalizar colores
9. **Calculadora Fudge**: UI especializada para dados Fudge/FATE
10. **Animaciones custom**: Diferentes animaciones según tipo de dado

## Testing

### Ejemplo de Test del Estado
```javascript
import { gameState } from './modules/gameState.js';

// Test: Suscripción funciona
let called = false;
const unsub = gameState.subscribe('gameSet', () => { called = true; });
gameState.setGameSet('2d6');
console.assert(called === true, 'Callback debería ejecutarse');
unsub();

// Test: Desuscripción funciona
called = false;
gameState.setGameSet('3d6');
console.assert(called === false, 'Callback no debería ejecutarse');
```

## Notas Adicionales

- El estado es **singleton**: Una única instancia compartida por toda la app
- Los web components se **auto-registran** al importarse
- Shadow DOM proporciona **encapsulación de estilos**
- Los eventos personalizados usan `composed: true` para atravesar Shadow DOM
