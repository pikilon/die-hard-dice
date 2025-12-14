import { DiceBox } from '../dice.js';
import { gameState } from '../modules/gameState.js';
import { 
  gameSetToOldFormat, 
  notationToGameSet
} from './notationUtils.js';

/**
 * Web Component para el canvas de lanzamiento de dados
 */
class DiceCanvasComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.box = null;
    this.unsubscribeGameSet = null;
  }

  connectedCallback() {
    this.render();
    this.initialize();
    
    // Suscribirse a cambios en el gameSet
    this.unsubscribeGameSet = gameState.subscribe('gameSet', (gameSet) => {
      console.log('GameSet updated:', gameSet);
    });
  }

  disconnectedCallback() {
    if (this.unsubscribeGameSet) {
      this.unsubscribeGameSet();
    }
    
    // Limpiar event listeners de window
    window.removeEventListener('resize', this.resizeHandler);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          position: relative;
        }

        #canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>

      <div id="canvas"></div>
    `;
  }

  initialize() {
    const canvas = this.shadowRoot.getElementById('canvas');

    // Configurar canvas
    canvas.style.width = window.innerWidth - 1 + 'px';
    canvas.style.height = window.innerHeight - 1 + 'px';

    // Inicializar DiceBox
    this.box = new DiceBox(canvas, { w: 500, h: 300 });
    this.box.animate_selector = false;

    // Manejar resize
    this.resizeHandler = () => {
      canvas.style.width = window.innerWidth - 1 + 'px';
      canvas.style.height = window.innerHeight - 1 + 'px';
      this.box.reinit(canvas, { w: 500, h: 300 });
    };
    window.addEventListener('resize', this.resizeHandler);

    // Configurar callbacks para DiceBox
    const notation_getter = () => {
      // Convertir el gameSet al formato antiguo que espera DiceBox
      const currentGameSet = gameState.getState('gameSet');
      const oldFormatSet = gameSetToOldFormat(currentGameSet);
      
      return {
        set: oldFormatSet,
        constant: 0,
        result: [],
        error: false
      };
    };

    const before_roll = (vectors, notation, callback) => {
      gameState.setIsThrowing(true);
      callback();
    };

    const after_roll = (notation, result) => {
      // Convertir resultados numéricos a strings
      const resultStrings = result.map(r => String(r));
      
      // Actualizar el estado global (esto calculará automáticamente la suma)
      // El componente dice-result se encargará de mostrar el resultado
      gameState.setLastResult(resultStrings);
    };

    // Bind mouse interactions
    this.box.bind_mouse(document.body, notation_getter, before_roll, after_roll);

    // Manejar clicks en el canvas para selector de dados
    const handleCanvasClick = (ev) => {
      ev.stopPropagation();
      
      const isThrowing = gameState.getState('isThrowing');
      if (isThrowing) {
        // Si está lanzando y ya terminó, mostrar selector
        if (!this.box.rolling) {
          this.showSelector();
        }
        this.box.rolling = false;
        return;
      }

      const name = this.box.search_dice_by_mouse(ev);
      if (name !== undefined) {
        const currentGameSet = gameState.getState('gameSet');
        
        // Convertir a formato antiguo, añadir el nuevo dado, y reconvertir
        const oldFormat = gameSetToOldFormat(currentGameSet);
        oldFormat.push(name);
        
        // Crear string notation temporal para parsear
        const diceCount = {};
        oldFormat.forEach(die => {
          diceCount[die] = (diceCount[die] || 0) + 1;
        });
        
        const notationString = Object.entries(diceCount)
          .map(([die, count]) => `${count}${die}`)
          .join(' + ');
        
        // Convertir de vuelta al formato nuevo
        const newGameSet = notationToGameSet(notationString);
        gameState.setGameSet(newGameSet);
      }
    };

    ['mouseup', 'touchend'].forEach((evt) => {
      document.body.addEventListener(evt, handleCanvasClick);
    });

    // Escuchar evento throw-dice del componente de input
    document.addEventListener('throw-dice', (ev) => {
      const throwEvent = new Event('mouseup', { bubbles: true, cancelable: true });
      // Simular el throw usando el binding existente
      this.box.start_throw(notation_getter, before_roll, after_roll);
    });

    // Verificar parámetros URL
    const params = Object.fromEntries(new URLSearchParams(window.location.search));

    if (params.notation) {
      const parsedGameSet = notationToGameSet(params.notation);
      gameState.setGameSet(parsedGameSet);
    }

    if (params.roll) {
      // Auto-lanzar
      setTimeout(() => {
        this.box.start_throw(notation_getter, before_roll, after_roll);
      }, 500);
    } else {
      this.showSelector();
    }
  }

  showSelector() {
    gameState.setIsThrowing(false);
    this.box.draw_selector();
  }
}

customElements.define('dice-canvas', DiceCanvasComponent);

export { DiceCanvasComponent };
