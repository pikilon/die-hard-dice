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
      title: "Settlers of Catan",
      // Diccionario de dados disponibles
      diceDictionary: [...DEFAULT_DICE],
      // Array de dados seleccionados con índice del diccionario y cantidad
      // Ejemplo: [{ dictionaryIndex: 1, quantity: 4 }] (4 d6)
      gameSet: [{ dictionaryIndex: 2, quantity: 2 }],
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
      title: [],
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
   * @param {string} key - 'title', 'gameSet', 'lastResult', 'sum', 'isThrowing', 'createEditDiceIndex', o 'all'
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
      if (key === "title") {
        return this.state.title;
      }
      return this.state[key];
    }
    return {
      title: this.state.title,
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
   * Reemplaza el diccionario de dados con los dados por defecto y los personalizados.
   * @param {Array<{title: string, sides: string[]}>} customDice
   */
  setCustomDiceDictionary(customDice = []) {
    const normalizedCustomDice = Array.isArray(customDice)
      ? customDice
          .map((dice) => {
            const title = String(dice?.title ?? "").trim();
            if (title.length < 2) {
              return null;
            }
            const rawSides = Array.isArray(dice?.sides)
              ? dice.sides
                  .map((side) => String(side ?? "").trim())
                  .filter((side) => side.length > 0)
              : [];
            const sides = validateDiceSides(rawSides);
            if (sides.length < 2) {
              return null;
            }
            return { title, sides: [...sides] };
          })
          .filter((dice) => dice !== null)
      : [];

    const nextDictionary = [
      ...DEFAULT_DICE.map((dice) => ({ title: dice.title, sides: [...dice.sides] })),
      ...normalizedCustomDice,
    ];

    const dictionaryChanged = !this._areDiceDictionariesEqual(
      this.state.diceDictionary,
      nextDictionary
    );

    if (dictionaryChanged) {
      this.state.diceDictionary = nextDictionary;
      this._notify("diceDictionary", this.state.diceDictionary);
    }

    let changed = dictionaryChanged;
    if (this.state.createEditDiceIndex !== -2) {
      this.state.createEditDiceIndex = -2;
      this._notify("createEditDiceIndex", this.state.createEditDiceIndex);
      changed = true;
    }

    if (changed) {
      this._notify("all", this.state);
    }
  }

  /**
   * Remove a custom die from the dictionary by index and update gameSet references.
   * Default dice (within DEFAULT_DICE) cannot be removed.
   * @param {number} dictionaryIndex
   * @returns {boolean} true if removed, false otherwise
   */
  removeDiceFromDictionary(dictionaryIndex) {
    const index = Number.isInteger(dictionaryIndex) ? dictionaryIndex : -1;
    if (index < DEFAULT_DICE.length) return false;
    if (index < 0 || index >= this.state.diceDictionary.length) return false;

    const newDictionary = this.state.diceDictionary.filter((_, i) => i !== index);

    const newGameSet = this.state.gameSet
      .filter((item) => item.dictionaryIndex !== index)
      .map((item) => ({
        dictionaryIndex:
          item.dictionaryIndex > index ? item.dictionaryIndex - 1 : item.dictionaryIndex,
        quantity: item.quantity,
      }));

    let newCreateEditIndex = this.state.createEditDiceIndex;
    if (newCreateEditIndex === index) newCreateEditIndex = -2;
    else if (newCreateEditIndex > index) newCreateEditIndex -= 1;

    this.state.diceDictionary = newDictionary;
    this.state.gameSet = newGameSet;
    this.state.createEditDiceIndex = newCreateEditIndex;

    this._notify("diceDictionary", this.state.diceDictionary);
    this._notify("gameSet", this.state.gameSet);
    this._notify("createEditDiceIndex", this.state.createEditDiceIndex);
    this._notify("all", this.state);
    return true;
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
   * Actualiza el título del juego en el estado
   * @param {string} title
   */
  setTitle(title) {
    const normalizedTitle = String(title ?? "").trim();
    if (this.state.title !== normalizedTitle) {
      this.state.title = normalizedTitle;
      this._notify("title", this.state.title);
      this._notify("all", this.state);
    }
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

  _areDiceDictionariesEqual(a, b) {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i += 1) {
      const diceA = a[i];
      const diceB = b[i];
      if (diceA.title !== diceB.title) {
        return false;
      }
      if (diceA.sides.length !== diceB.sides.length) {
        return false;
      }
      for (let j = 0; j < diceA.sides.length; j += 1) {
        if (diceA.sides[j] !== diceB.sides[j]) {
          return false;
        }
      }
    }

    return true;
  }
}

// Exportar instancia singleton
export const gameState = new GameState();
