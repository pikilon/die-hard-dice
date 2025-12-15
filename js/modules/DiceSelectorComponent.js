import { DiceBox } from "../dice.js";
import { gameState } from "./gameState.js";
import { isStandardDice } from "./notationUtils.js";

/**
 * Web Component para el selector de dados
 * Muestra el canvas con los dados disponibles y permite hacer clic para añadirlos al gameSet
 */
class DiceSelectorComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.box = null;
    this.unsubscribeIsThrowing = null;
  }

  connectedCallback() {
    this.render();
    this.initialize();

    // Suscribirse a cambios en isThrowing para mostrar/ocultar selector
    this.unsubscribeIsThrowing = gameState.subscribe(
      "isThrowing",
      (isThrowing) => {
        if (!isThrowing) {
          this.show();
        } else {
          this.hide();
        }
      }
    );

    // Mostrar inicialmente si no está lanzando
    const isThrowing = gameState.getState("isThrowing");
    if (!isThrowing) {
      // Pequeño delay para asegurar que el canvas está listo
      setTimeout(() => this.show(), 100);
    }
  }

  disconnectedCallback() {
    if (this.unsubscribeIsThrowing) {
      this.unsubscribeIsThrowing();
    }

    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
        }

        :host(.hidden) {
          display: none;
        }

        #canvas {
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: auto;
        }
      </style>

      <div id="canvas"></div>
    `;
  }

  initialize() {
    const canvas = this.shadowRoot.getElementById("canvas");

    // Configurar canvas
    canvas.style.width = window.innerWidth - 1 + "px";
    canvas.style.height = window.innerHeight - 1 + "px";

    // Inicializar DiceBox
    this.box = new DiceBox(canvas, { w: 500, h: 300 });
    this.box.animate_selector = false;

    // Manejar resize
    this.resizeHandler = () => {
      canvas.style.width = window.innerWidth - 1 + "px";
      canvas.style.height = window.innerHeight - 1 + "px";
      this.box.reinit(canvas, { w: 500, h: 300 });

      // Re-dibujar selector si está visible
      if (!gameState.getState("isThrowing")) {
        this.box.draw_selector();
      }
    };
    window.addEventListener("resize", this.resizeHandler);

    // Manejar clicks para añadir dados al gameSet
    const handleCanvasClick = (ev) => {
      ev.stopPropagation();

      const isThrowing = gameState.getState("isThrowing");
      if (isThrowing) {
        return;
      }

      const userData = this.box.search_dice_by_mouse(ev);
      if (userData !== undefined) {
        const currentGameSet = gameState.getState("gameSet");
        
        // userData now contains { dictionaryIndex, type, sides }
        const dictionaryIndex = typeof userData === 'object' ? userData.dictionaryIndex : null;
        
        if (dictionaryIndex !== null) {
          // New format: directly use dictionaryIndex
          const existingEntry = currentGameSet.find(item => item.dictionaryIndex === dictionaryIndex);
          
          if (existingEntry) {
            // Increment quantity if already exists
            const newGameSet = currentGameSet.map(item => 
              item.dictionaryIndex === dictionaryIndex 
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
            gameState.setGameSet(newGameSet);
          } else {
            // Add new entry
            const newGameSet = [...currentGameSet, { dictionaryIndex, quantity: 1 }];
            gameState.setGameSet(newGameSet);
          }
        } else {
          // Legacy format: userData is just the type string
          const diceDictionary = gameState.getState("diceDictionary");
          const index = diceDictionary.findIndex(d => d.title === userData);
          if (index !== -1) {
            const existingEntry = currentGameSet.find(item => item.dictionaryIndex === index);
            if (existingEntry) {
              const newGameSet = currentGameSet.map(item => 
                item.dictionaryIndex === index 
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              );
              gameState.setGameSet(newGameSet);
            } else {
              const newGameSet = [...currentGameSet, { dictionaryIndex: index, quantity: 1 }];
              gameState.setGameSet(newGameSet);
            }
          }
        }
      }
    };

    ["mouseup", "touchend"].forEach((evt) => {
      canvas.addEventListener(evt, handleCanvasClick);
    });
  }

  show() {
    this.classList.remove("hidden");
    if (this.box) {
      const diceDictionary = gameState.getState("diceDictionary");
      this.box.draw_selector(diceDictionary, isStandardDice);
    }
  }

  hide() {
    this.classList.add("hidden");
  }
}

customElements.define("dice-selector", DiceSelectorComponent);

export { DiceSelectorComponent as DiceSelectorHelpComponent };
