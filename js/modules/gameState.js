import {
  DEFAULT_DICE,
  getDiceTypeFromSides,
  validateDiceSides,
} from "./notationUtils.js";

/**
 * PubSub State Module for Dice Game
 * Manages the game set (selected dice) and last roll results
 */

class GameState {
  constructor() {
    this.state = {
      // Diccionario de dados disponibles
      diceDictionary: [...DEFAULT_DICE],
      // Array de dados seleccionados con índice del diccionario y cantidad
      // Ejemplo: [{ dictionaryIndex: 1, quantity: 4 }] (4 d6)
      gameSet: [{ dictionaryIndex: 0, quantity: 4 }],
      // Array de resultados como strings
      // Ejemplo: ["3", "4", "5", "2"]
      lastResult: [],
      // Suma de los resultados numéricos
      sum: 0,
      // Indica si se está lanzando los dados
      isThrowing: false,
      // Controla la apertura del diálogo de crear/editar dado
      // -2: cerrado, -1: creando nuevo, >=0: editando (no implementado aún)
      createEditDiceIndex: -2,
    };

    this.subscribers = {
      diceDictionary: [],
      gameSet: [],
      lastResult: [],
      sum: [],
      isThrowing: [],
      createEditDiceIndex: [],
      all: [], // se notifica en cualquier cambio
    };
  }

  /**
   * Suscribirse a cambios en el estado
   * @param {string} key - 'gameSet', 'lastResult', 'sum', 'isThrowing', o 'all'
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
   * @param {string} key - opcional, 'diceDictionary', 'gameSet', 'lastResult', 'sum', o 'isThrowing'
   * @returns {any} el valor del estado
   */
  getState(key) {
    if (key) {
      return this.state[key];
    }
    return {
      diceDictionary: [
        ...this.state.diceDictionary.map((d) => ({
          ...d,
          sides: [...d.sides],
        })),
      ],
      gameSet: [...this.state.gameSet.map((d) => ({ ...d }))],
      lastResult: [...this.state.lastResult],
      sum: this.state.sum,
      isThrowing: this.state.isThrowing,
      createEditDiceIndex: this.state.createEditDiceIndex,
    };
  }

  /**
   * Obtener los dados expandidos del gameSet (con sus caras)
   * @returns {Array} Array de dados expandidos con quantity y sides
   */
  getExpandedGameSet() {
    return this.state.gameSet.map((item) => {
      const diceDefinition = this.state.diceDictionary[item.dictionaryIndex];
      // Validate sides (0-1 becomes 2)
      const validatedSides = validateDiceSides(diceDefinition.sides);
      // Derive type from sides length
      const type = getDiceTypeFromSides(validatedSides);
      return {
        quantity: item.quantity,
        sides: [...validatedSides],
        title: diceDefinition.title,
        type: type,
      };
    });
  }

  /**
   * Agrega un nuevo dado al diccionario
   * @param {{title: string, sides: string[]}} diceDef
   * @returns {number} índice del nuevo dado en el diccionario
   */
  addDiceToDictionary(diceDef) {
    const title = String(diceDef?.title ?? "").trim();
    const sides = Array.isArray(diceDef?.sides)
      ? diceDef.sides.map((s) => String(s).trim())
      : [];

    if (title.length < 2) {
      throw new Error("Dice title must be at least 2 characters");
    }
    if (sides.length < 2) {
      throw new Error("Dice must have at least 2 sides");
    }

    const newDef = { title, sides: [...sides] };
    this.state.diceDictionary = [...this.state.diceDictionary, newDef];
    const newIndex = this.state.diceDictionary.length - 1;
    this._notify("diceDictionary", this.state.diceDictionary);
    this._notify("all", this.state);
    return newIndex;
  }

  /**
   * Añade un dado al gameSet por índice del diccionario (incrementa cantidad si existe)
   * @param {number} dictionaryIndex
   * @param {number} quantity
   */
  addDieToGameSetByIndex(dictionaryIndex, quantity = 1) {
    const current = this.getState("gameSet");
    const existing = current.find((d) => d.dictionaryIndex === dictionaryIndex);
    let updated;
    if (existing) {
      updated = current.map((d) =>
        d.dictionaryIndex === dictionaryIndex
          ? { ...d, quantity: d.quantity + quantity }
          : d
      );
    } else {
      updated = [...current, { dictionaryIndex, quantity }];
    }
    this.setGameSet(updated);
  }

  /**
   * Establece el índice de creación/edición del dado para el diálogo
   * @param {number} index
   */
  setCreateEditDiceIndex(index) {
    if (this.state.createEditDiceIndex !== index) {
      this.state.createEditDiceIndex = index;
      this._notify("createEditDiceIndex", this.state.createEditDiceIndex);
      this._notify("all", this.state);
    }
  }

  /**
   * Actualizar el game set
   * @param {Array} gameSet - array de objetos { dictionaryIndex, quantity }
   */
  setGameSet(gameSet) {
    if (JSON.stringify(this.state.gameSet) !== JSON.stringify(gameSet)) {
      this.state.gameSet = gameSet.map((d) => ({
        dictionaryIndex: d.dictionaryIndex,
        quantity: d.quantity,
      }));
      this._notify("gameSet", this.state.gameSet);
      this._notify("all", this.state);
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
      console.log("🎲 Lanzamiento realizado:", {
        resultados: this.state.lastResult,
        suma: this.state.sum,
        dados: this.state.gameSet.map((item) => {
          const dice = this.state.diceDictionary[item.dictionaryIndex];
          return `${item.quantity}${dice.title}`;
        }),
      });

      this._notify("lastResult", this.state.lastResult);
      this._notify("sum", this.state.sum);
      this._notify("all", this.state);
    }
  }

  /**
   * Actualizar múltiples valores a la vez
   * @param {Object} updates - objeto con las propiedades a actualizar
   */
  update(updates) {
    let changed = false;

    if (
      updates.gameSet !== undefined &&
      JSON.stringify(this.state.gameSet) !== JSON.stringify(updates.gameSet)
    ) {
      this.state.gameSet = updates.gameSet.map((d) => ({
        dictionaryIndex: d.dictionaryIndex,
        quantity: d.quantity,
      }));
      this._notify("gameSet", this.state.gameSet);
      changed = true;
    }

    if (
      updates.lastResult !== undefined &&
      JSON.stringify(this.state.lastResult) !==
        JSON.stringify(updates.lastResult)
    ) {
      this.state.lastResult = [...updates.lastResult];
      this._calculateSum();
      this._notify("lastResult", this.state.lastResult);
      this._notify("sum", this.state.sum);
      changed = true;
    }

    if (changed) {
      this._notify("all", this.state);
    }
  }

  /**
   * Establecer el estado de lanzamiento
   * @param {boolean} isThrowing - true si está lanzando, false si no
   */
  setIsThrowing(isThrowing) {
    if (this.state.isThrowing !== isThrowing) {
      this.state.isThrowing = isThrowing;
      this._notify("isThrowing", this.state.isThrowing);
      this._notify("all", this.state);
    }
  }

  /**
   * Resetear el estado
   */
  reset() {
    this.state.gameSet = [{ dictionaryIndex: 1, quantity: 4 }];
    this.state.lastResult = [];
    this.state.sum = 0;
    this.state.isThrowing = false;
    this._notify("gameSet", this.state.gameSet);
    this._notify("lastResult", this.state.lastResult);
    this._notify("sum", this.state.sum);
    this._notify("isThrowing", this.state.isThrowing);
    this._notify("all", this.state);
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
    this.subscribers[key].forEach((callback) => {
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
