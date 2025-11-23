declare global {
  /**
   * Represents a single dice in the game
   */
  interface Dice {
    /** The name of the dice */
    name: string;
    /** The color of the dice */
    color: string;
    /** The sides of the dice */
    sides: string[];
  }

  /**
   * Represents the complete game state
   */
  interface GameState {
    /** The title of the game */
    title: string;
    /** Array of dice objects */
    dice: Dice[];
    /** Array of indices representing the order of dice */
    diceOrder: number[];
    /** 
     * Index of the dice being edited
     * - undefined: Not editing any dice
     * - -1: Creating a new dice
     * - 0,1,2...: Index of the dice in gameState.dice array being edited
     */
    editingDiceIndex?: number;
    /**
     * Index of the dice instance in diceOrder being edited
     */
    editingOrderIndex?: number;
  }

  /**
   * Callback function type for game state subscribers
   */
  type GameStateCallback = (state: GameState) => void;

  /**
   * Unsubscribe function type
   */
  type UnsubscribeFunction = () => boolean;
}

export {};
