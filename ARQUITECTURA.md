# Arquitectura PubSub con Web Components

## Resumen
Se ha refactorizado la aplicación para usar un patrón **PubSub (Publisher-Subscriber)** con **Web Components**, mejorando la separación de responsabilidades y la mantenibilidad del código.

## Estructura de Archivos

```
js/
├── main.js                              # Inicialización principal (simplificado)
├── dice.js                              # Lógica de dados (sin cambios)
└── modules/
    ├── gameState.js                     # Estado centralizado con patrón PubSub
    ├── DiceInputComponent.js            # Web Component para input de dados
    └── DiceCanvasComponent.js           # Web Component para canvas de lanzamiento
```

## 1. Módulo de Estado: `gameState.js`

### Descripción
Módulo singleton que gestiona el estado global de la aplicación usando el patrón Publisher-Subscriber.

### Estado Almacenado
```javascript
{
  gameSet: '4d6',      // Notación de dados seleccionada (ej: "4d6 + d8")
  lastResult: ''       // Último resultado en formato string (ej: "3 4 5 2 = 14")
}
```

### API Pública

#### `subscribe(key, callback)`
Suscribirse a cambios en el estado.
```javascript
// Suscribirse a cambios en gameSet
const unsubscribe = gameState.subscribe('gameSet', (newGameSet) => {
  console.log('GameSet cambió:', newGameSet);
});

// Suscribirse a cambios en lastResult
gameState.subscribe('lastResult', (result) => {
  console.log('Resultado:', result);
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
const gameSet = gameState.getState('gameSet');  // Obtener un valor específico
const fullState = gameState.getState();         // Obtener todo el estado
```

#### `setGameSet(gameSet)`
Actualizar el game set.
```javascript
gameState.setGameSet('2d20 + d6');
```

#### `setLastResult(result)`
Actualizar el último resultado.
```javascript
gameState.setLastResult('5 12 3 = 20');
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

## 2. Web Component: `<dice-input>`

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

## 3. Web Component: `<dice-canvas>`

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

## 4. Flujo de Datos

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
5. DiceBox realiza el lanzamiento 3D
   ↓
6. <dice-canvas> actualiza gameState.lastResult
   ↓
7. Todos los suscriptores reciben notificación
   ↓
8. UI se actualiza automáticamente
```

### Cambio de Notación
```
1. Usuario modifica input en <dice-input>
   ↓
2. <dice-input> llama a gameState.setGameSet()
   ↓
3. gameState notifica a todos los suscriptores
   ↓
4. <dice-canvas> recibe notificación (opcional)
   ↓
5. Estado queda sincronizado
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
```

### Ahora
```javascript
// Código desacoplado con estado centralizado
gameState.setGameSet("4d6");
gameState.setLastResult(result);
```

## Próximos Pasos Sugeridos

1. **Historial de lanzamientos**: Agregar un componente que muestre el historial
2. **Estadísticas**: Componente que calcule y muestre estadísticas
3. **Presets**: Guardar y cargar configuraciones de dados favoritas
4. **Compartir**: Generar URLs con el estado actual
5. **Temas**: Sistema de temas para personalizar colores

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
