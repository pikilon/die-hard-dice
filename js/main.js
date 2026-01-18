/**
 * Nueva arquitectura basada en PubSub State y Web Components
 * - gameState: módulo de estado centralizado con patrón pubsub
 * - DiceCanvasComponent: web component para el canvas de lanzamiento
 */

import { setUseTrueRandom } from "./dice.js";
import { gameState } from "./modules/gameState.js";
import { decodeGameStateFromUrl, syncUrlWithGameState } from "./modules/gameStateUrl.js";
import "./modules/DiceThrowerComponent.js";
import "./modules/DiceThrowButtonComponent.js";
import "./modules/DiceResultComponent.js";
import "./modules/DicePreviewComponent.js";
import "./modules/DiceGameCardComponent.js";
import "./modules/DiceGameSetDrawerComponent.js";
import "./modules/CreateCustomDiceDialogComponent.js";

function restoreStateFromUrl() {
  const parsedState = decodeGameStateFromUrl(window.location.search);
  if (!parsedState) {
    return;
  }

  if (parsedState.customDice !== undefined) {
    gameState.setCustomDiceDictionary(parsedState.customDice);
  }

  if (parsedState.gameSet !== undefined) {
    gameState.setGameSet(parsedState.gameSet);
  }

  if (parsedState.title !== undefined) {
    gameState.setTitle(parsedState.title);
  }
}

function dice_initialize() {
  document.getElementById("loading_text")?.remove();

  // Configurar uso de random
  setUseTrueRandom(false);

  restoreStateFromUrl();
  syncUrlWithGameState(gameState.getState());

  // Sincronizar el título de la página con el gameState
  const updatePageTitle = (state) => {
    const title = state.title?.trim() || "die hard die";
    document.title = title;
  };

  // Actualizar el título de la página con el estado actual
  updatePageTitle(gameState.getState());

  // Los web components se encargan de todo
  // Suscribirse a cambios para logging (opcional)
  gameState.subscribe("all", (state) => {
    console.log("Game state updated:", state);
    syncUrlWithGameState(state);
    updatePageTitle(state);
  });

  // Aplicar clase noselect al body por defecto
  document.body.classList.add("noselect");
}

dice_initialize();
