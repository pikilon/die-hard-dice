import { DiceBox } from '../dice.js';
import { gameState } from './gameState.js';
import { 
  gameSetToOldFormat, 
  notationToGameSet
} from './notationUtils.js';

/**
 * Web Component para seleccionar dados
 * Muestra los dados disponibles y permite hacer clic para añadirlos al gameSet
 */
class DiceSelectorComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.box = null;
    this.unsubscribeIsThrowing = null;
  }

  connectedCallback() {
    this.render();
    this.initialize();
    
    // Suscribirse a cambios en isThrowing para mostrar/ocultar selector
    this.unsubscribeIsThrowing = gameState.subscribe('isThrowing', (isThrowing) => {
      if (!isThrowing) {
        this.show();
      } else {
        this.hide();
      }
    });

    // Mostrar inicialmente si no está lanzando
    const isThrowing = gameState.getState('isThrowing');
    if (!isThrowing) {
      // Pequeño delay para asegurar que el canvas está listo
      setTimeout(() => this.show(), 100);
    }
  }

  disconnectedCallback() {
    if (this.unsubscribeIsThrowing) {
      this.unsubscribeIsThrowing();
    }
    
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
      
      // Re-dibujar selector si está visible
      if (!gameState.getState('isThrowing')) {
        this.box.draw_selector();
      }
    };
    window.addEventListener('resize', this.resizeHandler);

    // Manejar clicks para añadir dados al gameSet
    const handleCanvasClick = (ev) => {
      ev.stopPropagation();
      
      const isThrowing = gameState.getState('isThrowing');
      if (isThrowing) {
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
      canvas.addEventListener(evt, handleCanvasClick);
    });

    // Verificar parámetros URL
    const params = Object.fromEntries(new URLSearchParams(window.location.search));

    if (params.notation) {
      const parsedGameSet = notationToGameSet(params.notation);
      gameState.setGameSet(parsedGameSet);
    }
  }

  show() {
    this.classList.remove('hidden');
    if (this.box) {
      this.box.draw_selector();
    }
  }

  hide() {
    this.classList.add('hidden');
  }
}

customElements.define('dice-selector', DiceSelectorComponent);

export { DiceSelectorComponent };
