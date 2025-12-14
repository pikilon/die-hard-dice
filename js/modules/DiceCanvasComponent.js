import { DiceBox, parse_notation, stringify_notation } from '../dice.js';
import { gameState } from '../modules/gameState.js';
import { 
  gameSetToOldFormat, 
  notationToGameSet, 
  resultsToString 
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
    this.unsubscribeResult = null;
  }

  connectedCallback() {
    this.render();
    this.initialize();
    
    // Suscribirse a cambios en el resultado
    this.unsubscribeResult = gameState.subscribe('lastResult', (result) => {
      this.updateResultDisplay(result);
    });

    // Suscribirse a cambios en la suma
    this.unsubscribeSum = gameState.subscribe('sum', (sum) => {
      this.updateResultDisplay(gameState.getState('lastResult'));
    });

    // Suscribirse a cambios en el gameSet
    this.unsubscribeGameSet = gameState.subscribe('gameSet', (gameSet) => {
      console.log('GameSet updated:', gameSet);
    });
  }

  disconnectedCallback() {
    if (this.unsubscribeGameSet) {
      this.unsubscribeGameSet();
    }
    if (this.unsubscribeResult) {
      this.unsubscribeResult();
    }
    if (this.unsubscribeSum) {
      this.unsubscribeSum();
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

        #info_div {
          position: fixed;
          bottom: 0;
          width: 100%;
          text-align: center;
          padding: 20px;
          box-sizing: border-box;
          pointer-events: none;
        }

        #info_div.hidden {
          display: none;
        }

        .center_field {
          background: rgba(255, 255, 255, 0.5);
          display: inline-block;
          padding: 20px;
          border-radius: 8px;
        }

        #label {
          font-size: 24pt;
          font-weight: bold;
          color: rgba(21, 26, 26, 0.9);
        }

        .bottom_field {
          margin-top: 10px;
        }

        #labelhelp {
          font-size: 12pt;
          color: rgba(21, 26, 26, 0.6);
        }

        #selector_div {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          padding: 20px;
          pointer-events: none;
        }

        #selector_div.hidden {
          display: none;
        }

        #sethelp {
          background: rgba(255, 255, 255, 0.7);
          padding: 15px;
          border-radius: 8px;
          font-size: 14pt;
          color: rgba(21, 26, 26, 0.8);
          line-height: 1.5;
        }

        #canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>

      <div id="canvas"></div>
      
      <div id="selector_div" class="hidden">
        <div class="center_field">
          <div id="sethelp">
            choose your dice set by clicking the dices or by direct input of notation,<br/>
            tap and drag on free space of screen or hit throw button to roll
          </div>
        </div>
      </div>

      <div id="info_div" class="hidden">
        <div class="center_field">
          <span id="label"></span>
        </div>
        <div class="center_field">
          <div class="bottom_field">
            <span id="labelhelp">click to continue or tap and drag again</span>
          </div>
        </div>
      </div>
    `;
  }

  initialize() {
    const canvas = this.shadowRoot.getElementById('canvas');
    const label = this.shadowRoot.getElementById('label');
    const selectorDiv = this.shadowRoot.getElementById('selector_div');
    const infoDiv = this.shadowRoot.getElementById('info_div');

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
      infoDiv.classList.add('hidden');
      selectorDiv.classList.add('hidden');
      callback();
    };

    const after_roll = (notation, result) => {
      const params = Object.fromEntries(new URLSearchParams(window.location.search));
      if (params.chromakey || params.noresult) return;

      // Convertir resultados numéricos a strings
      const resultStrings = result.map(r => String(r));
      
      // Actualizar el estado global (esto calculará automáticamente la suma)
      gameState.setLastResult(resultStrings);
      
      // Mostrar resultado
      const sum = gameState.getState('sum');
      const displayText = resultsToString(resultStrings, sum);
      
      label.innerHTML = displayText;
      infoDiv.classList.remove('hidden');
    };

    // Bind mouse interactions
    this.box.bind_mouse(document.body, notation_getter, before_roll, after_roll);

    // Manejar clicks en el canvas para selector de dados
    const handleCanvasClick = (ev) => {
      ev.stopPropagation();
      
      if (selectorDiv.classList.contains('hidden')) {
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
    
    if (params.chromakey) {
      infoDiv.style.display = 'none';
    }

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
    const selectorDiv = this.shadowRoot.getElementById('selector_div');
    const infoDiv = this.shadowRoot.getElementById('info_div');
    
    infoDiv.classList.add('hidden');
    selectorDiv.classList.remove('hidden');
    this.box.draw_selector();
  }

  updateResultDisplay(result) {
    const label = this.shadowRoot.getElementById('label');
    if (label && result && result.length > 0) {
      const sum = gameState.getState('sum');
      label.innerHTML = resultsToString(result, sum);
    }
  }
}

customElements.define('dice-canvas', DiceCanvasComponent);

export { DiceCanvasComponent };
