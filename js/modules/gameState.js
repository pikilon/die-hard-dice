/**
 * PubSub State Module for Dice Game
 * Manages the game set (selected dice) and last roll results
 */

class GameState {
  constructor() {
    this.state = {
      // Array de dados con cantidad y caras customizables
      // Ejemplo: [{ quantity: 4, sides: ["1", "2", "3", "4", "5", "6"] }]
      gameSet: [
        { quantity: 4, sides: ["😍", "2", "3", "4", "5", "6"] }
      ],
      // Array de resultados como strings
      // Ejemplo: ["3", "4", "5", "2"]
      lastResult: [],
      // Suma de los resultados numéricos
      sum: 0,
    };
    
    this.subscribers = {
      gameSet: [],
      lastResult: [],
      sum: [],
      all: [], // se notifica en cualquier cambio
    };
  }

  /**
   * Suscribirse a cambios en el estado
   * @param {string} key - 'gameSet', 'lastResult', 'sum', o 'all'
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
   * @param {string} key - opcional, 'gameSet', 'lastResult', o 'sum'
   * @returns {any} el valor del estado
   */
  getState(key) {
    if (key) {
      return this.state[key];
    }
    return { 
      gameSet: [...this.state.gameSet.map(d => ({...d, sides: [...d.sides]}))],
      lastResult: [...this.state.lastResult],
      sum: this.state.sum
    };
  }

  /**
   * Actualizar el game set
   * @param {Array} gameSet - array de objetos { quantity, sides }
   */
  setGameSet(gameSet) {
    if (JSON.stringify(this.state.gameSet) !== JSON.stringify(gameSet)) {
      this.state.gameSet = gameSet.map(d => ({
        quantity: d.quantity,
        sides: [...d.sides]
      }));
      this._notify('gameSet', this.state.gameSet);
      this._notify('all', this.state);
    }
  }

  /**
   * Actualizar el último resultado
   * @param {Array<string>} result - array de strings con los resultados
   */
  setLastResult(result) {
    if (JSON.stringify(this.state.lastResult) !== JSON.stringify(result)) {
      this.state.lastResult = [...result];
      this._calculateSum();
      
      // Log del estado en cada lanzamiento
      console.log('🎲 Lanzamiento realizado:', {
        resultados: this.state.lastResult,
        suma: this.state.sum,
        dados: this.state.gameSet.map(d => `${d.quantity}d${d.sides.length}`)
      });
      
      this._notify('lastResult', this.state.lastResult);
      this._notify('sum', this.state.sum);
      this._notify('all', this.state);
    }
  }

  /**
   * Actualizar múltiples valores a la vez
   * @param {Object} updates - objeto con las propiedades a actualizar
   */
  update(updates) {
    let changed = false;
    
    if (updates.gameSet !== undefined && 
        JSON.stringify(this.state.gameSet) !== JSON.stringify(updates.gameSet)) {
      this.state.gameSet = updates.gameSet.map(d => ({
        quantity: d.quantity,
        sides: [...d.sides]
      }));
      this._notify('gameSet', this.state.gameSet);
      changed = true;
    }
    
    if (updates.lastResult !== undefined && 
        JSON.stringify(this.state.lastResult) !== JSON.stringify(updates.lastResult)) {
      this.state.lastResult = [...updates.lastResult];
      this._calculateSum();
      this._notify('lastResult', this.state.lastResult);
      this._notify('sum', this.state.sum);
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
      gameSet: [
        { quantity: 4, sides: ["1", "2", "3", "4", "5", "6"] }
      ],
      lastResult: [],
      sum: 0,
    };
    this._notify('gameSet', this.state.gameSet);
    this._notify('lastResult', this.state.lastResult);
    this._notify('sum', this.state.sum);
    this._notify('all', this.state);
  }

  /**
   * Calcular la suma de los resultados numéricos
   * @private
   */
  _calculateSum() {
    this.state.sum = this.state.lastResult.reduce((acc, value) => {
      const num = parseFloat(value);
      return isNaN(num) ? acc : acc + num;
    }, 0);
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
