import { gameState } from './gameState.js';
import { resultsToString } from './notationUtils.js';

/**
 * Web Component para mostrar el resultado del lanzamiento de dados
 */
class DiceResultComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.unsubscribeResult = null;
    this.unsubscribeSum = null;
    this.unsubscribeIsThrowing = null;
  }

  connectedCallback() {
    this.render();
    
    // Suscribirse a cambios en el resultado
    this.unsubscribeResult = gameState.subscribe('lastResult', (result) => {
      this.updateDisplay(result);
    });

    // Suscribirse a cambios en la suma
    this.unsubscribeSum = gameState.subscribe('sum', (sum) => {
      this.updateDisplay(gameState.getState('lastResult'));
    });

    // Suscribirse a cambios en isThrowing para ocultar cuando se muestre el selector
    this.unsubscribeIsThrowing = gameState.subscribe('isThrowing', (isThrowing) => {
      if (!isThrowing) {
        this.hide();
      }
    });

    // Manejar click para ocultar resultado y mostrar selector
    this.shadowRoot.getElementById('info_div').addEventListener('click', () => {
      gameState.setIsThrowing(false);
    });
  }

  disconnectedCallback() {
    if (this.unsubscribeResult) {
      this.unsubscribeResult();
    }
    if (this.unsubscribeSum) {
      this.unsubscribeSum();
    }
    if (this.unsubscribeIsThrowing) {
      this.unsubscribeIsThrowing();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        #info_div {
          position: fixed;
          bottom: 0;
          width: 100%;
          text-align: center;
          padding: 20px;
          box-sizing: border-box;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        #info_div.hidden {
          display: none;
        }

        #info_div.visible {
          pointer-events: auto;
          cursor: pointer;
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
      </style>

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

  updateDisplay(result) {
    const label = this.shadowRoot.getElementById('label');
    const infoDiv = this.shadowRoot.getElementById('info_div');
    
    if (result && result.length > 0) {
      const sum = gameState.getState('sum');
      label.innerHTML = resultsToString(result, sum);
      this.show();
    }
  }

  show() {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    if (params.chromakey || params.noresult) return;

    const infoDiv = this.shadowRoot.getElementById('info_div');
    infoDiv.classList.remove('hidden');
    infoDiv.classList.add('visible');
  }

  hide() {
    const infoDiv = this.shadowRoot.getElementById('info_div');
    infoDiv.classList.add('hidden');
    infoDiv.classList.remove('visible');
  }
}

customElements.define('dice-result', DiceResultComponent);

export { DiceResultComponent };
