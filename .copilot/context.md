# Copilot Context

This file orients agents to the Die Hard Dice app so they can answer precisely.

## What this project is

- In-browser dice roller with customizable faces and automatic sum calculation.
- Vanilla JS + Web Components + PubSub state (no build pipeline).
- Uses DiceBox/three.js/cannon.js for 3D visuals (standard dice geometries only).

## Key entry points

- index.html: loads the app directly; no bundler.
- js/main.js: lightweight bootstrap.
- js/dice.js and js/dice/\*: DiceBox integration and geometry helpers.
- js/modules/gameState.js: singleton PubSub state; stores `gameSet`, `lastResult`, `sum`.
- js/modules/notationUtils.js: string notation <-> structured gameSet converters, old-format adapter, result formatting.
- js/modules/customDice.js: builders for custom/fudge/range/weighted dice and presets.
- js/modules/DiceThrowButtonComponent.js: `<dice-throw-button>` web component; emits `throw-dice` and respects `isThrowing`.
- js/modules/DiceThrowerComponent.js: `<dice-thrower>`; runs 3D throws, updates `lastResult` and `sum`.
- test-suite.js: browser-run smoke tests (import in console: `import('./test-suite.js')`).

## Behavior essentials

- State shape: `{ gameSet: [{ quantity, sides }], lastResult: [string], sum: number }`.
- Sums ignore non-numeric faces; calculated in `setLastResult`.
- Notation parsing uses `notationToGameSet`; serialization uses `gameSetToNotation`.
- 3D view currently renders numeric faces only; custom faces are logic-only.
- When adding web components use `/*html*/` and `/*css*/` for syntax highlighting.

## How to run

- Assume the Quick server: `npx live-server` is already running to test the results.
- No build step; ES modules load directly in the browser.
- Terminal: Bash on Windows.
