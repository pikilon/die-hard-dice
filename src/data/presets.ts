import type { Die, DiceSet, FaceProps, FaceRange, MaterialId } from '../model/types';

const T0 = 0;

interface DieSpec {
  id: string;
  es: string;
  en: string;
  faces: number;
  color: string;
  material: MaterialId;
  start?: number;
  step?: number;
  ranges?: FaceRange[];
  overrides?: Record<number, FaceProps>;
}

function die(s: DieSpec): Die {
  return {
    id: `b-${s.id}`,
    builtin: s.id,
    name: s.es,
    names: { es: s.es, en: s.en },
    faces: s.faces,
    color: s.color,
    material: s.material,
    start: s.start ?? 1,
    step: s.step ?? 1,
    ranges: s.ranges ?? [],
    overrides: s.overrides ?? {},
    updatedAt: T0,
  };
}

const GOLD = '#f2c14e';
const ARCANE = '#46206b';
const allGold = (n: number): FaceRange[] => [{ from: 1, to: n, fg: GOLD }];

const kotFaces = (): Record<number, FaceProps> => ({
  4: { v: { i: 'claw-slashes' } },
  5: { v: { i: 'hearts' }, fg: '#ff5a67' },
  6: { v: { i: 'power-lightning' }, fg: '#ffd43b' },
});

export const BUILTIN_DICE: Die[] = [
  die({
    id: 'coin', es: 'Moneda', en: 'Coin', faces: 2, color: '#d4a73a', material: 'metal',
    overrides: { 1: { v: { i: 'sun' } }, 2: { v: { i: 'moon' } } },
    ranges: [{ from: 1, to: 2, fg: '#5a3d0a' }],
  }),
  die({ id: 'd4', es: 'D4', en: 'D4', faces: 4, color: ARCANE, material: 'marble', ranges: allGold(4) }),
  die({ id: 'd6', es: 'D6', en: 'D6', faces: 6, color: ARCANE, material: 'marble', ranges: allGold(6) }),
  die({ id: 'd8', es: 'D8', en: 'D8', faces: 8, color: ARCANE, material: 'marble', ranges: allGold(8) }),
  die({ id: 'd10', es: 'D10', en: 'D10', faces: 10, color: ARCANE, material: 'marble', ranges: allGold(10) }),
  die({ id: 'd12', es: 'D12', en: 'D12', faces: 12, color: ARCANE, material: 'marble', ranges: allGold(12) }),
  die({ id: 'd20', es: 'D20', en: 'D20', faces: 20, color: ARCANE, material: 'marble', ranges: allGold(20) }),
  die({
    id: 'd100', es: 'D100 (decenas)', en: 'D100 (tens)', faces: 10, color: '#2a1440', material: 'marble',
    start: 0, step: 10, ranges: allGold(10), overrides: { 1: { v: { t: '00' } } },
  }),
  die({ id: 'd6-ivory', es: 'D6 marfil', en: 'Ivory D6', faces: 6, color: '#f3ead7', material: 'plastic' }),
  die({ id: 'kot', es: 'King of Tokyo', en: 'King of Tokyo', faces: 6, color: '#18181c', material: 'plastic', overrides: kotFaces() }),
  die({ id: 'kot-green', es: 'King of Tokyo (bonus)', en: 'King of Tokyo (bonus)', faces: 6, color: '#2b8a3e', material: 'plastic', overrides: kotFaces() }),
  die({
    id: 'hq-combat', es: 'Combate HeroQuest', en: 'HeroQuest combat', faces: 6, color: '#f4f1ea', material: 'plastic',
    ranges: [
      { from: 1, to: 3, v: { i: 'death-skull' }, fg: '#141414' },
      { from: 4, to: 5, v: { i: 'shield' }, bg: '#2b2b30', fg: '#ffffff' },
      { from: 6, to: 6, v: { i: 'shield' }, fg: '#141414' },
    ],
  }),
  die({
    id: 'catan', es: 'Colonos de Catán', en: 'Settlers of Catan', faces: 6, color: '#c8102e', material: 'glass',
    ranges: [{ from: 1, to: 6, fg: '#ffffff' }],
  }),
  die({ id: 'hq-move', es: 'Movimiento HeroQuest', en: 'HeroQuest movement', faces: 6, color: '#b3261e', material: 'plastic' }),
];

interface SetSpec {
  id: string;
  es: string;
  en: string;
  dice: string[];
  bg: string;
  sum?: boolean;
  groupNumbers?: boolean;
}

function set(s: SetSpec): DiceSet {
  return {
    id: `b-${s.id}`,
    builtin: s.id,
    name: s.es,
    names: { es: s.es, en: s.en },
    dice: s.dice.map((d) => `b-${d}`),
    background: { kind: 'preset', id: s.bg },
    tally: { sum: s.sum ?? true, groupNumbers: s.groupNumbers ?? false },
    updatedAt: T0,
  };
}

export const BUILTIN_SETS: DiceSet[] = [
  set({ id: 'kot', es: 'King of Tokyo', en: 'King of Tokyo', dice: Array(6).fill('kot'), bg: 'city', sum: true, groupNumbers: true }),
  set({ id: 'hq-hero', es: 'HeroQuest · Héroe', en: 'HeroQuest · Hero', dice: ['hq-move', 'hq-move', 'hq-combat', 'hq-combat', 'hq-combat'], bg: 'dungeon' }),
  set({ id: 'hq-enemies', es: 'HeroQuest · Enemigos', en: 'HeroQuest · Enemies', dice: ['hq-combat', 'hq-combat', 'hq-combat'], bg: 'dungeon' }),
  set({ id: 'catan', es: 'Colonos de Catán', en: 'Settlers of Catan', dice: ['catan', 'catan'], bg: 'parchment' }),
  set({ id: 'dnd', es: 'D&D', en: 'D&D', dice: ['d4', 'd6', 'd8', 'd10', 'd100', 'd12', 'd20'], bg: 'tavern' }),
  set({ id: 'classic', es: 'Clásico 2D6', en: 'Classic 2D6', dice: ['d6-ivory', 'd6-ivory'], bg: 'felt' }),
];

export const DEFAULT_SET_ID = 'b-classic';
