import { gameState } from './gameState.js';

/**
 * Web Component para mostrar el mensaje de selección de dados
 */
class DiceSelectorHelpComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.unsubscribeIsThrowing = null;
  }

  connectedCallback() {
    this.render();
    
    // Suscribirse a cambios en isThrowing
    this.unsubscribeIsThrowing = gameState.subscribe('isThrowing', (isThrowing) => {
      this.updateVisibility(!isThrowing);
    });

    // Mostrar inicialmente si no está lanzando
    const isThrowing = gameState.getState('isThrowing');
    this.updateVisibility(!isThrowing);
  }

  disconnectedCallback() {
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

        #selector_div {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          padding: 20px;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        #selector_div.hidden {
          display: none;
        }

        .center_field {
          background: rgba(255, 255, 255, 0.7);
          padding: 15px;
          border-radius: 8px;
        }

        #sethelp {
          font-size: 14pt;
          color: rgba(21, 26, 26, 0.8);
          line-height: 1.5;
        }
      </style>

      <div id="selector_div" class="hidden">
        <div class="center_field">
          <div id="sethelp">
            choose your dice set by clicking the dices or by direct input of notation,<br/>
            tap and drag on free space of screen or hit throw button to roll
          </div>
        </div>
      </div>
    `;
  }

  updateVisibility(shouldShow) {
    const selectorDiv = this.shadowRoot.getElementById('selector_div');
    if (shouldShow) {
      selectorDiv.classList.remove('hidden');
    } else {
      selectorDiv.classList.add('hidden');
    }
  }

  show() {
    this.updateVisibility(true);
  }

  hide() {
    this.updateVisibility(false);
  }
}

customElements.define('dice-selector-help', DiceSelectorHelpComponent);

export { DiceSelectorHelpComponent };
