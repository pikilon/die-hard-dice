## Die Hard Dice

An app to create and manage dice sets for tabletop games with **customizable dice faces**.

This is an all-in-browser app, no build required.

### 🌐 Live Demo

- GitHub Pages: https://pikilon.github.io/die-hard-dice/

### ✨ New Features

- **🎲 Customizable Dice Faces**: Create dice with arbitrary values (text, symbols, numbers)
- **📊 Automatic Sum Calculation**: Automatically sums numeric results
- **🔄 PubSub State Management**: Reactive state with publisher-subscriber pattern
- **🧩 Web Components**: Modular architecture with custom elements
- **🎯 Presets**: Built-in presets for Fudge/FATE, directions, yes/no, and more

### 🚀 Quick Start

Option A — Open the live demo:

- Visit https://pikilon.github.io/die-hard-dice/

Option B — Run locally:

```bash
# Run a local server
npx live-server
```

Visit `http://localhost:8080` in your browser.

### 📖 Documentation

- **[ARQUITECTURA.md](./ARQUITECTURA.md)** - Complete architecture documentation
- **[EJEMPLOS.md](./EJEMPLOS.md)** - 20+ usage examples with different dice types

### 🎲 Dice Types Supported

#### Standard Dice
- d4, d6, d8, d10, d12, d20, d100

#### Custom Dice
- **Text Dice**: `["Yes", "No", "Maybe"]`
- **Symbol Dice**: `["⚔️", "🛡️", "🏹", "🔮", "💀", "⭐"]`
- **Fudge/FATE Dice**: `["+", "+", "0", "0", "-", "-"]`
- **Weighted Dice**: Custom probability distributions
- **Range Dice**: Any numeric range

### 💻 Basic Usage

```javascript
import { gameState } from './js/modules/gameState.js';
import { notationToGameSet } from './js/modules/notationUtils.js';

// Standard dice notation
const gameSet = notationToGameSet("4d6 + 2d8");
gameState.setGameSet(gameSet);

// Listen to results
gameState.subscribe('lastResult', (results) => {
  console.log('Results:', results);
  console.log('Sum:', gameState.getState('sum'));
});
```

### 🎨 Custom Dice Example

```javascript
import { createCustomDice, createFudgeDice } from './js/modules/customDice.js';

// Create custom dice with symbols
const combatDice = createCustomDice(1, ["⚔️", "🛡️", "🏹", "🔮", "💀", "⭐"]);

// Create Fudge/FATE dice
const fateDice = createFudgeDice(4);

// Set the game
gameState.setGameSet([combatDice, fateDice]);
```

### 🏗️ Architecture

The app uses a modern architecture with:

- **State Management**: Centralized PubSub state (`gameState`)
- **Web Components**: `<dice-throw-button>` and `<dice-thrower>`
- **Utilities**: Notation converters and custom dice builders
- **Modular Design**: Easy to extend and maintain

```
js/
├── main.js
├── dice.js
└── modules/
    ├── gameState.js           # PubSub state manager
    ├── notationUtils.js       # Notation converters
    ├── customDice.js          # Custom dice utilities
  ├── DiceThrowButtonComponent.js # Throw-only web component
  └── DiceThrowerComponent.js     # Canvas/physics web component
```

### 🎯 Use Cases

- **D&D 5e**: Standard dice rolls with automatic sum
- **FATE/Fudge**: Specialized dice with +/0/- faces
- **Story Games**: Symbol dice for narrative prompts
- **Custom Systems**: Create dice for any tabletop system
- **Decision Making**: Yes/No/Maybe dice
- **Directional**: Compass dice for movement

### 📊 State Structure

```javascript
{
  gameSet: [
    { 
      quantity: 4, 
      sides: ["1", "2", "3", "4", "5", "6"] 
    }
  ],
  lastResult: ["3", "4", "5", "2"],
  sum: 14  // Automatically calculated
}
```

### 🔧 Development

```bash
# Check types
npx tsc -p .

# No build needed - uses ES modules directly in browser
```

### 📝 Examples

See [EJEMPLOS.md](./EJEMPLOS.md) for 20+ detailed examples including:
- Standard dice rolls
- Custom dice creation
- RPG system integration (D&D, FATE, Warhammer)
- Special dice (story cubes, weather, encounters)
- Probability analysis

### ⚠️ Known Limitations

The 3D visualization currently only supports standard numeric faces. Custom dice work perfectly at the state/logic level, but the 3D canvas will show standard numbers. See `ARQUITECTURA.md` for details on implementing full 3D custom faces.

### 🤝 Credits

Based on the original dice roller by [teal](https://paypal.me/teal/5?locale.x=en_EN&country.x=US).

### 🚢 Deployment (GitHub Pages)

- Hosting: GitHub Pages serves directly from the `master` branch, root folder.
- Entry point: [index.html](./index.html) at the repository root.
- Live URL: https://pikilon.github.io/die-hard-dice/
- Update cycle: Push changes to `master` and Pages will deploy automatically.
- Custom domain: Not configured; site is available under the `github.io` subdomain.
