import { DEFAULT_DICE, isCustomDiceIndex } from "./notationUtils.js";

/**
 * Gamesets Store Module
 * Manages multiple gamesets (system and custom) with localStorage persistence
 * Stores only customDice (not DEFAULT_DICE) to match gameStateUrl structure
 */

const STORAGE_KEY = "die-hard-dice-custom-gamesets";
const SYSTEM_GAMESET_PREFIX = "system_";

// System gamesets (read-only templates)
const SYSTEM_GAMESETS = [
  {
    id: `${SYSTEM_GAMESET_PREFIX}settlers`,
    title: "Settlers of Catan",
    customDice: [], // 2d6 only (from DEFAULT_DICE)
    gameSet: [{ dictionaryIndex: 2, quantity: 2, color: "#ff0000" }],
    isSystem: true,
  },
  {
    id: `${SYSTEM_GAMESET_PREFIX}kok`,
    title: "King of Kyoto",
    customDice: [
      {
        title: "King of kyoto",
        sides: ["1", "2", "3", "💖", "⚔️", "⚡"],
      },
    ],
    gameSet: [{ dictionaryIndex: 8, quantity: 4 }],
    isSystem: true,
  },
  {
    id: `${SYSTEM_GAMESET_PREFIX}hiroqest_combat`,
    title: "Hiro Qest - combat",
    gameSet: [{ dictionaryIndex: 8, quantity: 3 }],
    customDice: [
      {
        title: "Hiro Qest - Combat",
        sides: ["💀", "💀", "💀", "🛡", "🛡", "⬛"],
      },
    ],
    isSystem: true,
  },
];

class GamesetsStore {
  constructor() {
    this.customGamesets = [];
    this.currentGamesetId = SYSTEM_GAMESETS[0].id;
    this.subscribers = [];
    this._loadFromStorage();
  }

  /**
   * Build full diceDictionary from customDice
   * @private
   */
  _buildDiceDictionary(customDice = []) {
    return [...DEFAULT_DICE, ...customDice];
  }

  /**
   * Extract customDice from full diceDictionary
   * @private
   */
  _extractCustomDice(diceDictionary = []) {
    return diceDictionary
      .map((dice, index) => {
        if (!isCustomDiceIndex(index)) return null;
        return { title: dice.title, sides: [...dice.sides] };
      })
      .filter((dice) => dice !== null);
  }

  /**
   * Subscribe to changes in the store
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get all gamesets (system + custom)
   * @returns {Array}
   */
  getAllGamesets() {
    return [...SYSTEM_GAMESETS, ...this.customGamesets].map((gs) => ({
      ...gs,
      diceDictionary: this._buildDiceDictionary(gs.customDice),
    }));
  }

  /**
   * Get current gameset
   * @returns {Object}
   */
  getCurrentGameset() {
    const all = this.getAllGamesets();
    const current = all.find((gs) => gs.id === this.currentGamesetId);
    return current || this._buildFullGameset(SYSTEM_GAMESETS[0]);
  }

  /**
   * Get gameset by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getGamesetById(id) {
    const all = this.getAllGamesets();
    return all.find((gs) => gs.id === id) || null;
  }

  /**
   * Build full gameset with diceDictionary from internal format
   * @private
   */
  _buildFullGameset(gameset) {
    return {
      ...gameset,
      diceDictionary: this._buildDiceDictionary(gameset.customDice),
    };
  }

  /**
   * Check if a gameset is a system gameset
   * @param {string} id
   * @returns {boolean}
   */
  isSystemGameset(id) {
    return id.startsWith(SYSTEM_GAMESET_PREFIX);
  }

  /**
   * Switch to a different gameset
   * @param {string} gamesetId
   * @returns {boolean} success
   */
  switchGameset(gamesetId) {
    const gameset = this.getGamesetById(gamesetId);
    if (!gameset) {
      console.warn(`Gameset not found: ${gamesetId}`);
      return false;
    }
    this.currentGamesetId = gamesetId;
    this._saveToStorage();
    this._notify();
    return true;
  }

  /**
   * Create a new custom gameset
   * @param {Object} gameset - { title, diceDictionary, gameSet } or { title, customDice, gameSet }
   * @returns {string} new gameset ID
   */
  createCustomGameset({ title, diceDictionary, customDice, gameSet }) {
    const id = `custom_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Extract customDice from diceDictionary if provided
    const finalCustomDice =
      customDice !== undefined
        ? customDice.map((d) => ({ title: d.title, sides: [...d.sides] }))
        : diceDictionary !== undefined
        ? this._extractCustomDice(diceDictionary)
        : [];

    const newGameset = {
      id,
      title: String(title || "New Gameset").trim(),
      customDice: finalCustomDice,
      gameSet: gameSet
        ? gameSet.map((d) => {
            const entry = {
              dictionaryIndex: d.dictionaryIndex,
              quantity: d.quantity,
            };
            // Preserve color if provided
            if (d.color && typeof d.color === 'string' && /^#[0-9a-f]{6}$/i.test(d.color)) {
              entry.color = d.color.toLowerCase();
            }
            return entry;
          })
        : [],
      isSystem: false,
    };

    this.customGamesets.push(newGameset);
    this._saveToStorage();
    this._notify();
    return id;
  }

  /**
   * Clone a gameset (system or custom)
   * @param {string} gamesetId
   * @returns {string|null} new gameset ID or null if failed
   */
  cloneGameset(gamesetId) {
    const source = this.getGamesetById(gamesetId);
    if (!source) {
      console.warn(`Cannot clone: gameset not found: ${gamesetId}`);
      return null;
    }

    const newTitle = `${source.title} (copy)`;
    const newId = this.createCustomGameset({
      title: newTitle,
      customDice: source.customDice,
      gameSet: source.gameSet,
    });

    return newId;
  }

  /**
   * Update a custom gameset
   * If updating a system gameset, create a new custom one instead
   * @param {string} gamesetId
   * @param {Object} updates - { title?, diceDictionary?, gameSet? }
   * @returns {string} gameset ID (might be new if system was modified)
   */
  updateGameset(gamesetId, updates) {
    const isSystem = this.isSystemGameset(gamesetId);

    if (isSystem) {
      // Create a new custom gameset based on the system one
      const source = this.getGamesetById(gamesetId);
      if (!source) return gamesetId;

      // Extract customDice from diceDictionary
      const customDice =
        updates.diceDictionary !== undefined
          ? this._extractCustomDice(updates.diceDictionary)
          : source.customDice;

      // If title is not being explicitly updated, add " (custom)" suffix to distinguish from system
      const newTitle =
        updates.title !== undefined
          ? updates.title
          : `${source.title} (custom)`;

      const newId = this.createCustomGameset({
        title: newTitle,
        customDice,
        gameSet:
          updates.gameSet !== undefined ? updates.gameSet : source.gameSet,
      });

      // Switch to the new custom gameset
      this.switchGameset(newId);
      return newId;
    }

    // Update existing custom gameset
    const gameset = this.customGamesets.find((gs) => gs.id === gamesetId);
    if (!gameset) {
      console.warn(`Cannot update: gameset not found: ${gamesetId}`);
      return gamesetId;
    }

    if (updates.title !== undefined) {
      gameset.title = String(updates.title).trim();
    }
    if (updates.diceDictionary !== undefined) {
      gameset.customDice = this._extractCustomDice(updates.diceDictionary);
    }
    if (updates.gameSet !== undefined) {
      gameset.gameSet = updates.gameSet.map((d) => {
        const entry = {
          dictionaryIndex: d.dictionaryIndex,
          quantity: d.quantity,
        };
        // Preserve color if provided
        if (d.color && typeof d.color === 'string' && /^#[0-9a-f]{6}$/i.test(d.color)) {
          entry.color = d.color.toLowerCase();
        }
        return entry;
      });
    }

    this._saveToStorage();
    this._notify();
    return gamesetId;
  }

  /**
   * Remove a custom gameset
   * @param {string} gamesetId
   * @returns {boolean} success
   */
  removeGameset(gamesetId) {
    if (this.isSystemGameset(gamesetId)) {
      console.warn(`Cannot remove system gameset: ${gamesetId}`);
      return false;
    }

    const index = this.customGamesets.findIndex((gs) => gs.id === gamesetId);
    if (index === -1) {
      console.warn(`Cannot remove: gameset not found: ${gamesetId}`);
      return false;
    }

    this.customGamesets.splice(index, 1);

    // If we're removing the current gameset, switch to the first system one
    if (this.currentGamesetId === gamesetId) {
      this.currentGamesetId = SYSTEM_GAMESETS[0].id;
    }

    this._saveToStorage();
    this._notify();
    return true;
  }

  /**
   * Load custom gamesets from localStorage
   * @private
   */
  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);
      if (data.customGamesets && Array.isArray(data.customGamesets)) {
        this.customGamesets = data.customGamesets.map((gs) => ({
          id: gs.id,
          title: String(gs.title || "Untitled"),
          customDice: Array.isArray(gs.customDice)
            ? gs.customDice.map((d) => ({
                title: d.title,
                sides: Array.isArray(d.sides) ? [...d.sides] : [],
              }))
            : [],
          gameSet: Array.isArray(gs.gameSet)
            ? gs.gameSet.map((d) => {
                const entry = {
                  dictionaryIndex: d.dictionaryIndex,
                  quantity: d.quantity,
                };
                // Preserve color if provided and valid
                if (d.color && typeof d.color === 'string' && /^#[0-9a-f]{6}$/i.test(d.color)) {
                  entry.color = d.color.toLowerCase();
                }
                return entry;
              })
            : [],
          isSystem: false,
        }));
      }

      if (data.currentGamesetId) {
        // Verify the gameset exists
        const exists = this.getGamesetById(data.currentGamesetId);
        if (exists) {
          this.currentGamesetId = data.currentGamesetId;
        }
      }
    } catch (error) {
      console.error("Failed to load gamesets from localStorage:", error);
      this.customGamesets = [];
    }
  }

  /**
   * Save custom gamesets to localStorage
   * @private
   */
  _saveToStorage() {
    try {
      const data = {
        customGamesets: this.customGamesets,
        currentGamesetId: this.currentGamesetId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save gamesets to localStorage:", error);
    }
  }

  /**
   * Notify subscribers
   * @private
   */
  _notify() {
    this.subscribers.forEach((callback) => {
      try {
        callback(this.getCurrentGameset());
      } catch (error) {
        console.error("Error in gamesetsStore subscriber:", error);
      }
    });
  }
}

// Export singleton
export const gamesetsStore = new GamesetsStore();
