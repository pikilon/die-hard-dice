/**
 * Nueva arquitectura basada en PubSub State y Web Components
 * - gameState: módulo de estado centralizado con patrón pubsub
 * - DiceInputComponent: web component para el input de dados
 * - DiceCanvasComponent: web component para el canvas de lanzamiento
 */

import { setUseTrueRandom } from "./dice.js";
import { gameState } from "./modules/gameState.js";
import "./modules/DiceInputComponent.js";
import "./modules/DiceThrowerComponent.js";
import "./modules/DiceResultComponent.js";
import "./modules/DiceInstructionComponent.js";
import "./modules/DicePreviewComponent.js";
import "./modules/DiceDictionaryListComponent.js";

function dice_initialize() {
  document.getElementById("loading_text")?.remove();
  
  // Configurar uso de random
  setUseTrueRandom(false);
  
  // Los web components se encargan de todo
  // Suscribirse a cambios para logging (opcional)
  gameState.subscribe('all', (state) => {
    console.log('Game state updated:', state);
  });
  
  // Aplicar clase noselect al body por defecto
  document.body.classList.add('noselect');
}

dice_initialize();
