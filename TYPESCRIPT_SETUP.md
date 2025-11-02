# TypeScript Type-Checking Setup

This project uses **JSDoc comments with TypeScript** for type-checking without compilation. This is a **no-build, no-compile** project where all JavaScript files run directly in the browser.

## Configuration

### `jsconfig.json`

The `jsconfig.json` file configures VS Code and TypeScript language services to:

- ✅ Enable type-checking for JavaScript files (`checkJs: true`)
- ✅ Prevent compilation/emit (`noEmit: true`)
- ✅ Target modern browser environments (`ESNext`, `DOM`, `DOM.Iterable`)
- ✅ Support ES modules natively (`module: ESNext`)
- ✅ Include all `.js` and `.d.ts` files in the project

## Type Definitions

Type definitions are stored in the `/types` directory:

- **`types/game.d.ts`** - Game state and dice types
- **`types/components.d.ts`** - Component-specific types
- **`types/lit.d.ts`** - Minimal Lit library types (for external CDN imports)
- **`types/service-worker.d.ts`** - Service Worker API types

## Usage Pattern

### Importing Types in JavaScript Files

All JavaScript files use the following pattern:

```javascript
// @ts-check  // Enable TypeScript checking for this file

/** @typedef {import('../types/game.d.ts').GameState} GameState */
/** @typedef {import('../types/game.d.ts').Dice} Dice */

/**
 * Function with typed parameters
 * @param {Dice} dice - A dice object
 * @param {GameState} state - Current game state
 * @returns {void}
 */
function myFunction(dice, state) {
  // TypeScript will now check types here
  console.log(dice.name);      // ✅ Valid
  console.log(dice.invalid);   // ❌ Error: Property 'invalid' does not exist
}
```

### Type Annotations

#### Variables
```javascript
/** @type {string[]} */
const items = [];

/** @type {GameState | null} */
let gameState = null;
```

#### Function Parameters and Returns
```javascript
/**
 * @param {number} index - The index
 * @param {Dice} dice - The dice object
 * @returns {boolean} Success status
 */
function updateDice(index, dice) {
  // Implementation
  return true;
}
```

#### Type Casts
When you need to cast a type (e.g., narrowing DOM elements):

```javascript
const form = /** @type {HTMLFormElement} */ (event.target);
const input = /** @type {HTMLInputElement} */ (element);
```

## Benefits

1. **Full IntelliSense** - Get autocomplete for all types in VS Code
2. **Type Safety** - Catch type errors before running code
3. **No Build Step** - Files run directly in the browser
4. **Documentation** - JSDoc comments serve as inline documentation
5. **Refactoring Support** - Safe renaming and refactoring with type awareness

## File Structure

```
die-hard-dice/
├── jsconfig.json           # TypeScript configuration
├── types/                  # Type definition files
│   ├── game.d.ts          # Game-related types
│   ├── components.d.ts    # Component types
│   ├── lit.d.ts           # Lit library types
│   └── service-worker.d.ts # Service Worker types
├── state/                  # State management
│   ├── game-state.js      # (uses @ts-check and imported types)
│   └── url-state.js       # (uses @ts-check and imported types)
├── web-components/         # UI components
│   ├── board.js           # (uses @ts-check and imported types)
│   ├── dice.js            # (uses @ts-check and imported types)
│   ├── dice-editor.js     # (uses @ts-check and imported types)
│   ├── game-actions.js    # (uses @ts-check and imported types)
│   └── game-title.js      # (uses @ts-check and imported types)
└── ...
```

## Key Principles

1. **All type definitions in `.d.ts` files** - Never inline complex `@typedef` in JS files
2. **Import types via JSDoc** - Use `@typedef {import('...')} TypeName` pattern
3. **Enable `@ts-check`** - Add to top of files for type-checking
4. **No compilation** - Files are never compiled, they run as-is
5. **Browser-native** - No Node.js, no bundlers, pure ES modules

## IDE Setup

VS Code will automatically:
- ✅ Read `jsconfig.json` configuration
- ✅ Load all type definitions from `/types`
- ✅ Provide IntelliSense based on JSDoc comments
- ✅ Show type errors inline in the editor
- ✅ Enable "Go to Definition" for types
- ✅ Support refactoring with type awareness

## Adding New Types

1. Create or edit a file in `/types` directory:
   ```typescript
   // types/new-types.d.ts
   export interface MyNewType {
     prop: string;
   }
   ```

2. Import in your JavaScript file:
   ```javascript
   // @ts-check
   /** @typedef {import('../types/new-types.d.ts').MyNewType} MyNewType */
   
   /** @type {MyNewType} */
   const myVar = { prop: "value" };
   ```

3. VS Code will immediately recognize the new type!

## Common Patterns

### Optional Properties
```typescript
interface GameState {
  title: string;
  editingDiceIndex?: number; // Optional property
}
```

### Union Types
```typescript
type Status = 'idle' | 'loading' | 'success' | 'error';
```

### Callback Types
```typescript
type GameStateCallback = (state: GameState) => void;
```

### Nullable Types
```javascript
/** @type {GameState | null} */
let state = null;
```

## Troubleshooting

### "Cannot find module 'X'"
- Ensure the module has a type definition in `/types`
- Check that `jsconfig.json` includes the file

### "Property does not exist on type"
- Check that the type definition includes the property
- Use type casts if needed: `/** @type {SpecificType} */ (variable)`

### Types not updating
- Reload VS Code window: `Ctrl+Shift+P` → "Reload Window"
- Ensure `jsconfig.json` is in the workspace root

## Resources

- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [VS Code JavaScript Language Service](https://code.visualstudio.com/docs/languages/javascript)
