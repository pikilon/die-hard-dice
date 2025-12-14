import { gameState } from './gameState.js';

/**
 * Web Component para mostrar las instrucciones de uso de dados
 */
class DiceInstructionComponent extends HTMLElement {
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
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          transition: opacity 0.3s ease;
        }

        :host(.hidden) {
          display: none;
        }

        .instruction-container {
          background: rgba(255, 255, 255, 0.9);
          padding: 15px 25px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .instruction-text {
          font-size: 14pt;
          color: rgba(21, 26, 26, 0.9);
          line-height: 1.5;
          text-align: center;
        }
      </style>

      <div class="instruction-container">
        <div class="instruction-text">
          Choose your dice set by clicking the dices or by direct input of notation,<br/>
          tap and drag on free space of screen or hit throw button to roll
        </div>
      </div>
    `;
  }

  updateVisibility(shouldShow) {
    if (shouldShow) {
      this.classList.remove('hidden');
    } else {
      this.classList.add('hidden');
    }
  }

  show() {
    this.updateVisibility(true);
  }

  hide() {
    this.updateVisibility(false);
  }
}

customElements.define('dice-instruction', DiceInstructionComponent);

export { DiceInstructionComponent };
