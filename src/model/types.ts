export type Lang = 'es' | 'en';
export const LANGS: Lang[] = ['es', 'en'];

export type MaterialId = 'plastic' | 'marble' | 'metal' | 'wood' | 'glass' | 'stone';
export const MATERIALS: MaterialId[] = ['plastic', 'marble', 'metal', 'wood', 'glass', 'stone'];

export type SolidId = 'd2' | 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

/** Value printed on a face: short text (1-3 graphemes, numbers/letters/emoji) or a game-icons icon. */
export type FaceValue = { t: string } | { i: string };

export interface FaceProps {
  v?: FaceValue;
  bg?: string;
  fg?: string;
}

/** Applies props to logical faces from..to (1-based, inclusive). */
export interface FaceRange extends FaceProps {
  from: number;
  to: number;
}

export interface Die {
  id: string;
  name: string;
  /** Localized names for factory dice. Removed once the user renames the die. */
  names?: Partial<Record<Lang, string>>;
  faces: number;
  color: string;
  material: MaterialId;
  start: number;
  step: number;
  ranges: FaceRange[];
  overrides: Record<number, FaceProps>;
  builtin?: string;
  updatedAt: number;
}

export type Background =
  | { kind: 'preset'; id: string }
  | { kind: 'url'; url: string }
  | { kind: 'upload'; dataUrl: string };

export interface TallyOptions {
  sum: boolean;
  groupNumbers: boolean;
}

export interface DiceSet {
  id: string;
  name: string;
  names?: Partial<Record<Lang, string>>;
  description?: string;
  dice: string[];
  background: Background;
  tally: TallyOptions;
  builtin?: string;
  updatedAt: number;
}

/** A fully resolved face, ready to draw or compare. */
export interface ResolvedFace {
  index: number; // logical face, 1-based
  value: FaceValue;
  bg: string;
  fg: string;
  /** Numeric value when the text parses as a number, otherwise null. */
  num: number | null;
}

export interface DieResult {
  uid: string;
  dieId: string;
  face: number;
  original?: number;
}

export interface RollEntry {
  id: string;
  at: number;
  setId: string;
  setName: string;
  dice: Record<string, Die>;
  results: DieResult[];
  rerolls: { at: number; results: DieResult[] }[];
}

export interface SharePayload {
  v: 1;
  set: DiceSet;
  dice: Die[];
}
