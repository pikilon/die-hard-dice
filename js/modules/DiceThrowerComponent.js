import { DiceBox } from '../dice.js';
import { gameState } from './gameState.js';
import { gameSetToOldFormat } from './notationUtils.js';

/**
 * Web Component para lanzar dados
 * Se encarga de la animación y física de lanzamiento de dados
 */
class DiceThrowerComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.box = null;
  }

  connectedCallback() {
    this.render();
    this.initialize();
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.resizeHandler);
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

    // Bind mouse interactions para el lanzamiento
    this.box.bind_mouse(document.body, notation_getter, before_roll, after_roll);

    // Manejar clicks para volver a mostrar el selector después del lanzamiento
    const handleCanvasClick = (ev) => {
      ev.stopPropagation();
      
      const isThrowing = gameState.getState('isThrowing');
      if (isThrowing) {
        // Si está lanzando y ya terminó, mostrar selector
        if (!this.box.rolling) {
          gameState.setIsThrowing(false);
        }
        this.box.rolling = false;
      }
    };

    ['mouseup', 'touchend'].forEach((evt) => {
      document.body.addEventListener(evt, handleCanvasClick);
    });

    // Escuchar evento throw-dice del componente de input
    document.addEventListener('throw-dice', (ev) => {
      this.box.start_throw(notation_getter, before_roll, after_roll);
    });

    // Verificar parámetros URL para auto-lanzar
    const params = Object.fromEntries(new URLSearchParams(window.location.search));

    if (params.roll) {
      // Auto-lanzar
      setTimeout(() => {
        this.box.start_throw(notation_getter, before_roll, after_roll);
      }, 500);
    }
  }
}

customElements.define('dice-thrower', DiceThrowerComponent);

export { DiceThrowerComponent };
