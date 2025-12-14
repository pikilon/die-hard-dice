import { DiceBox, parse_notation } from '../dice.js';
import { gameState } from '../modules/gameState.js';

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

    // Suscribirse a cambios en el gameSet
    this.unsubscribeGameSet = gameState.subscribe('gameSet', (gameSet) => {
      // Podría usarse para validar o actualizar la UI
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
      return parse_notation(gameState.getState('gameSet'));
    };

    const before_roll = (vectors, notation, callback) => {
      infoDiv.classList.add('hidden');
      selectorDiv.classList.add('hidden');
      callback();
    };

    const after_roll = (notation, result) => {
      const params = Object.fromEntries(new URLSearchParams(window.location.search));
      if (params.chromakey || params.noresult) return;

      let res = result.join(' ');
      if (notation.constant) {
        if (notation.constant > 0) res += ' +' + notation.constant;
        else res += ' -' + Math.abs(notation.constant);
      }
      
      if (result.length >= 1) {
        const sum = result.reduce((s, a) => s + a) + notation.constant;
        res += ' = ' + sum;
      }

      // Actualizar el estado global
      gameState.setLastResult(res);
      
      label.innerHTML = res;
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
        const notation = parse_notation(currentGameSet);
        notation.set.push(name);
        
        // Construir nuevo gameSet
        let newGameSet = '';
        const diceCount = {};
        notation.set.forEach(die => {
          diceCount[die] = (diceCount[die] || 0) + 1;
        });
        
        newGameSet = Object.entries(diceCount)
          .map(([die, count]) => `${count}${die}`)
          .join(' + ');
        
        if (notation.constant !== 0) {
          if (notation.constant > 0) newGameSet += ' +' + notation.constant;
          else newGameSet += ' ' + notation.constant;
        }

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
      gameState.setGameSet(params.notation);
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
    if (label && result) {
      label.innerHTML = result;
    }
  }
}

customElements.define('dice-canvas', DiceCanvasComponent);

export { DiceCanvasComponent };
