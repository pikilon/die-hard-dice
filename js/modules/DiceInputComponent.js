import { gameState } from '../modules/gameState.js';
import { gameSetToNotation, notationToGameSet } from './notationUtils.js';

/**
 * Web Component para el input del set de dados
 */
class DiceInputComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.unsubscribe = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    
    // Suscribirse a cambios en el gameSet
    this.unsubscribe = gameState.subscribe('gameSet', (gameSet) => {
      const input = this.shadowRoot.querySelector('#set');
      const notationString = gameSetToNotation(gameSet);
      if (input && input.value !== notationString) {
        input.value = notationString;
        this.updateInputWidth();
      }
    });

    // Inicializar con el valor actual
    const input = this.shadowRoot.querySelector('#set');
    const currentGameSet = gameState.getState('gameSet');
    input.value = gameSetToNotation(currentGameSet);
    this.updateInputWidth();
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .input-container {
          text-align: center;
          padding: 10px;
        }

        #set {
          font-size: 18pt;
          text-align: center;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(21, 26, 26, 0.5);
          padding: 5px;
          border-radius: 4px;
          outline: none;
          transition: background 0.2s;
        }

        #set:focus {
          background: rgba(255, 255, 255, 0.8);
          border-color: rgba(21, 26, 26, 0.8);
        }

        button {
          font-size: 14pt;
          padding: 8px 16px;
          margin: 5px;
          border: 1px solid rgba(21, 26, 26, 0.5);
          background: rgba(255, 255, 255, 0.5);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        button:hover {
          background: rgba(255, 255, 255, 0.8);
          border-color: rgba(21, 26, 26, 0.8);
        }

        button:active {
          transform: scale(0.95);
        }

        .help-text {
          font-size: 12pt;
          color: rgba(21, 26, 26, 0.5);
          margin-top: 10px;
        }

        .help-text a {
          color: rgba(21, 26, 26, 0.7);
          text-decoration: none;
          padding: 0;
        }

        .help-text a:hover {
          color: rgba(21, 26, 26, 0.9);
        }
      </style>

      <div class="input-container">
        <input type="text" id="set" placeholder="4d6"></input>
        <div style="margin-top: 10px;">
          <button id="clear">clear</button>
          <button id="throw">throw</button>
        </div>
        <div class="help-text">
          please consider <a href="https://paypal.me/teal/5?locale.x=en_EN&country.x=US">donating</a> to the original author
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const input = this.shadowRoot.querySelector('#set');
    const clearBtn = this.shadowRoot.querySelector('#clear');
    const throwBtn = this.shadowRoot.querySelector('#throw');

    // Actualizar el estado cuando cambia el input
    const updateState = () => {
      const newGameSet = notationToGameSet(input.value);
      gameState.setGameSet(newGameSet);
      this.updateInputWidth();
    };

    input.addEventListener('keyup', updateState);
    input.addEventListener('change', updateState);

    // Prevenir propagación de eventos de mouse
    input.addEventListener('mousedown', (ev) => ev.stopPropagation());
    input.addEventListener('mouseup', (ev) => ev.stopPropagation());

    // Manejar focus/blur
    input.addEventListener('focus', () => {
      document.body.classList.remove('noselect');
    });

    input.addEventListener('blur', () => {
      document.body.classList.add('noselect');
    });

    // Botón clear
    ['mouseup', 'touchend'].forEach((evt) => {
      clearBtn.addEventListener(evt, (ev) => {
        ev.stopPropagation();
        input.value = '0';
        gameState.setGameSet([]);
        this.updateInputWidth();
      });
    });

    // Botón throw - emitir evento personalizado
    ['mouseup', 'touchend'].forEach((evt) => {
      throwBtn.addEventListener(evt, (ev) => {
        ev.stopPropagation();
        this.dispatchEvent(new CustomEvent('throw-dice', {
          bubbles: true,
          composed: true,
          detail: { gameSet: input.value }
        }));
      });
    });
  }

  updateInputWidth() {
    const input = this.shadowRoot.querySelector('#set');
    if (input) {
      input.style.width = (input.value.length + 3) + 'ex';
    }
  }
}

customElements.define('dice-input', DiceInputComponent);

export { DiceInputComponent };
