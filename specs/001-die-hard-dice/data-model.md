# Modelo de datos · Spec 001

```ts
type Lang = 'es' | 'en';
type MaterialId = 'plastic' | 'marble' | 'metal' | 'wood' | 'glass' | 'stone';
type SolidId = 'd2' | 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

/** Valor mostrado en una cara */
type FaceValue =
  | { t: string }        // 1-3 grafemas: número, letra o emoji
  | { i: string };       // nombre de icono de game-icons (p. ej. "death-skull")

/** Propiedades opcionales de una cara (override o intervalo) */
interface FaceProps {
  v?: FaceValue;         // valor
  bg?: string;           // color de fondo (#rrggbb)
  fg?: string;           // color del valor; ausente = automático (blanco/negro)
}

interface FaceRange extends FaceProps { from: number; to: number } // 1-based, inclusivo

interface Die {
  id: string;
  name: string;
  names?: Partial<Record<Lang, string>>; // nombres localizados de predefinidos (se borran al renombrar)
  faces: number;                         // N ≥ 2
  color: string;                         // cuerpo
  material: MaterialId;
  start: number;                         // numeración: valor de la cara 1
  step: number;                          // incremento
  ranges: FaceRange[];
  overrides: Record<number, FaceProps>;  // clave: cara 1-based
  builtin?: string;                      // id de fábrica
  updatedAt: number;
}

type Background =
  | { kind: 'preset'; id: string }
  | { kind: 'url'; url: string }
  | { kind: 'upload'; dataUrl: string }; // solo local

interface DiceSet {
  id: string;
  name: string;
  names?: Partial<Record<Lang, string>>;
  description?: string;
  dice: string[];                        // ids de Die (repetibles)
  background: Background;
  tally: { sum: boolean; groupNumbers: boolean };
  builtin?: string;
  updatedAt: number;
}

/** Resultado de un dado en una tirada */
interface DieResult {
  uid: string;        // instancia en la mesa
  dieId: string;
  face: number;       // cara lógica 1-based
  original?: number;  // si se alteró, cara antes de alterar
}

interface RollEntry {
  id: string;
  at: number;                       // epoch ms
  setId: string;
  setName: string;
  dice: Record<string, Die>;        // instantánea de los dados usados (el historial no depende de la biblioteca)
  results: DieResult[];             // tirada original
  rerolls: { at: number; results: DieResult[] }[];
}

/** Carga útil compartida por URL */
interface SharePayload { v: 1; set: DiceSet; dice: Die[] }
```

## Almacenamiento (localStorage)
| Clave | Contenido |
|---|---|
| `dhd.library.v1` | `{ dice: Record<id, Die>, sets: Record<id, DiceSet>, setOrder: string[] }` |
| `dhd.history.v1` | `RollEntry[]` (máx. 200) |
| `dhd.settings.v1` | `{ lang, sound, lastSetId, showHistory }` |
