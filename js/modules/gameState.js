/**
 * PubSub State Module for Dice Game
 * Manages the game set (selected dice) and last roll results
 */

class GameState {
  constructor() {
    this.state = {
      gameSet: '4d6', // formato: "4d6 + d8" o "2d20"
      lastResult: '', // resultado en formato string, ej: "3 4 5 2 = 14"
    };
    
    this.subscribers = {
      gameSet: [],
      lastResult: [],
      all: [], // se notifica en cualquier cambio
    };
  }

  /**
   * Suscribirse a cambios en el estado
   * @param {string} key - 'gameSet', 'lastResult', o 'all'
   * @param {Function} callback - función que se ejecuta cuando cambia el estado
   * @returns {Function} función para desuscribirse
   */
  subscribe(key, callback) {
    if (!this.subscribers[key]) {
      console.warn(`Invalid subscription key: ${key}`);
      return () => {};
    }

    this.subscribers[key].push(callback);

    // Retornar función de desuscripción
    return () => {
      const index = this.subscribers[key].indexOf(callback);
      if (index > -1) {
        this.subscribers[key].splice(index, 1);
      }
    };
  }

  /**
   * Obtener el estado actual
   * @param {string} key - opcional, 'gameSet' o 'lastResult'
   * @returns {any} el valor del estado
   */
  getState(key) {
    if (key) {
      return this.state[key];
    }
    return { ...this.state };
  }

  /**
   * Actualizar el game set
   * @param {string} gameSet - nueva notación de dados
   */
  setGameSet(gameSet) {
    if (this.state.gameSet !== gameSet) {
      this.state.gameSet = gameSet;
      this._notify('gameSet', gameSet);
      this._notify('all', this.state);
    }
  }

  /**
   * Actualizar el último resultado
   * @param {string} result - resultado en formato string
   */
  setLastResult(result) {
    if (this.state.lastResult !== result) {
      this.state.lastResult = result;
      this._notify('lastResult', result);
      this._notify('all', this.state);
    }
  }

  /**
   * Actualizar múltiples valores a la vez
   * @param {Object} updates - objeto con las propiedades a actualizar
   */
  update(updates) {
    let changed = false;
    
    if (updates.gameSet !== undefined && this.state.gameSet !== updates.gameSet) {
      this.state.gameSet = updates.gameSet;
      this._notify('gameSet', updates.gameSet);
      changed = true;
    }
    
    if (updates.lastResult !== undefined && this.state.lastResult !== updates.lastResult) {
      this.state.lastResult = updates.lastResult;
      this._notify('lastResult', updates.lastResult);
      changed = true;
    }

    if (changed) {
      this._notify('all', this.state);
    }
  }

  /**
   * Resetear el estado
   */
  reset() {
    this.state = {
      gameSet: '4d6',
      lastResult: '',
    };
    this._notify('gameSet', this.state.gameSet);
    this._notify('lastResult', this.state.lastResult);
    this._notify('all', this.state);
  }

  /**
   * Notificar a los suscriptores
   * @private
   */
  _notify(key, value) {
    this.subscribers[key].forEach(callback => {
      try {
        callback(value);
      } catch (error) {
        console.error(`Error in subscriber callback for ${key}:`, error);
      }
    });
  }
}

// Exportar instancia singleton
export const gameState = new GameState();
