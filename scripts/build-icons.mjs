// Generates the icon data used by the app from @iconify-json/game-icons:
//  - public/game-icons.json : every icon as { name: pathData } (lazy-loaded at runtime)
//  - src/icons/core.json     : a curated subset grouped by category (bundled)
// Every game-icons icon is a single <path fill="currentColor" d="..."/> on a 512×512 viewBox,
// so we only keep the `d` attribute and draw it with Path2D.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const set = JSON.parse(readFileSync(require.resolve('@iconify-json/game-icons/icons.json'), 'utf8'));

const pathOf = (name) => {
  const icon = set.icons[name] ?? (set.aliases?.[name] && set.icons[set.aliases[name].parent]);
  if (!icon) return null;
  const m = icon.body.match(/\sd="([^"]+)"/);
  return m ? m[1] : null;
};

const CATEGORIES = {
  combat: [
    'death-skull', 'skull-crossed-bones', 'crowned-skull', 'crossed-swords', 'broadsword', 'battle-axe',
    'bow-arrow', 'arrow-cluster', 'fist', 'mailed-fist', 'claw-slashes', 'claws', 'sword-wound',
    'checked-shield', 'shield', 'round-shield', 'broken-shield', 'bolt-shield', 'shield-reflect',
    'targeted', 'bullseye', 'explosion-rays', 'blood', 'punch-blast',
  ],
  creatures: [
    'dragon-head', 'wolf-head', 'orc-head', 'goblin-head', 'daemon-skull', 'spider-face', 'bat-wing',
    'ghost', 'kraken-tentacle', 'dinosaur-rex', 'monster-grasp', 'fanged-skull', 'horned-skull',
    'robot-golem', 'minotaur', 'imp-laugh',
  ],
  resources: [
    'hearts', 'heart-plus', 'broken-heart', 'power-lightning', 'lightning-helix', 'lightning-trio',
    'coins', 'two-coins', 'crown', 'cut-diamond', 'gold-bar', 'gem-chain', 'health-potion',
    'magic-potion', 'star-medal', 'trophy', 'open-treasure-chest', 'locked-chest', 'key', 'wheat',
    'wood-pile', 'stone-block', 'sheep', 'anvil',
  ],
  movement: [
    'footprint', 'boot-prints', 'walking-boot', 'run', 'wingfoot', 'horseshoe', 'compass',
    'treasure-map', 'path-distance', 'sailboat', 'horse-head',
  ],
  magic: [
    'magic-swirl', 'fireball', 'fire', 'snowflake-1', 'crystal-ball', 'spell-book', 'wizard-staff',
    'pentacle', 'sparkles', 'poison-bottle', 'skull-bolt', 'holy-symbol', 'ankh', 'moon', 'sun',
    'star-swirl',
  ],
  misc: [
    'hourglass', 'clover', 'eyeball', 'check-mark', 'cancel', 'anchor', 'meeple', 'pawn',
    'dice-six-faces-six', 'dice-twenty-faces-twenty', 'flag-objective', 'padlock', 'padlock-open',
    'thumb-up', 'thumb-down', 'plain-circle', 'plain-square', 'triangle-target', 'perspective-dice-six',
    'rolling-dices', 'gems', 'card-random', 'cog',
  ],
};

const core = { categories: {}, paths: {} };
const missing = [];
for (const [cat, names] of Object.entries(CATEGORIES)) {
  core.categories[cat] = [];
  for (const n of names) {
    const d = pathOf(n);
    if (!d) { missing.push(n); continue; }
    core.categories[cat].push(n);
    core.paths[n] = d;
  }
}

const all = {};
for (const name of Object.keys(set.icons)) all[name] = pathOf(name);

mkdirSync(resolve(root, 'public'), { recursive: true });
mkdirSync(resolve(root, 'src/icons'), { recursive: true });
writeFileSync(resolve(root, 'public/game-icons.json'), JSON.stringify(all));
writeFileSync(resolve(root, 'src/icons/core.json'), JSON.stringify(core));

const count = Object.keys(core.paths).length;
console.log(`[icons] ${Object.keys(all).length} icons → public/game-icons.json · ${count} core icons`);
if (missing.length) console.warn(`[icons] not found (skipped): ${missing.join(', ')}`);
