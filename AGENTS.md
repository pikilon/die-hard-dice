# AGENTS.md — Die Hard Dice

Guía para agentes (y humanos) que desarrollen en este repo. Léela entera antes de tocar código.

## Qué es

Web app **estática, sin backend**, para crear dados personalizados en 3D, agruparlos en sets, lanzarlos
con física y compartirlos por URL. Todo se persiste en `localStorage`; la URL es el único canal de
intercambio. UI bilingüe **español (por defecto) / inglés**.

## Flujo de trabajo (SDD)

El proyecto sigue *Spec-Driven Development*. La fuente de verdad del comportamiento está en `specs/`:

- `specs/001-die-hard-dice/spec.md` — requisitos funcionales (FR-xxx) y criterios de aceptación.
- `specs/001-die-hard-dice/plan.md` — decisiones técnicas y arquitectura.
- `specs/001-die-hard-dice/data-model.md` — entidades, invariantes y formato de compartir.

Reglas:

1. **Cambio de comportamiento → primero la spec.** Una feature nueva va en una carpeta nueva
   `specs/NNN-nombre-corto/` con `spec.md` (+ `plan.md` y `data-model.md` si aplica). Un ajuste de una
   feature existente actualiza la spec correspondiente en el mismo commit que el código.
2. Referencia los FR en commits/PRs cuando corresponda (`FR-012`).
3. Bugfixes y refactors sin cambio de comportamiento no necesitan spec.

## Comandos

```bash
npm install
npm run dev         # Vite en http://localhost:5173 (añade --host para probar en el móvil)
npm test            # Vitest: src/**/*.test.ts (lógica pura, entorno node)
npm run typecheck   # tsc -b
npm run build       # tsc + vite build → dist/
npm run preview     # sirve dist/ en :4173
npm run pwa:icons   # regenera public/icons/* desde los SVG fuente (los binarios van commiteados)
```

`scripts/build-icons.mjs` se ejecuta solo (hooks `pre*`) y genera `public/game-icons.json` y
`src/icons/core.json`. **Ambos están en `.gitignore`: no los edites ni los commitees.** Para cambiar el
catálogo de iconos, edita `CATEGORIES` en el script.

**Recarga automática al terminar el turno (agentes).** Los hooks de `.claude/settings.json` llaman a
`.claude/tools/refresh/refresh.mjs`: al enviar un mensaje (`hold`) el plugin `agentRefresh` de
`vite.config.ts` retiene el HMR y, al terminar de responder (`release`), manda un único `full-reload` a todos
los navegadores conectados al dev server (solo si hubo cambios). Puerto distinto de 5173 → `DHD_PORT`.

Antes de dar un cambio por terminado: `npm test && npm run build` sin errores.

## Stack

Vite 8 · React 19 · TypeScript (strict) · three.js + @react-three/fiber/drei · @react-three/rapier ·
Zustand (persist) · motion · wouter con hash routing · fflate.

## Mapa del código

```
src/
  model/    Tipos y lógica PURA (sin React ni three). Aquí van los tests.
            types.ts, faces.ts (resolución de caras: rangos + overrides), solids.ts (sólido para N caras,
            ventanas aleatorias de caras imposibles), tally.ts, color.ts, names.ts, ids.ts
  share/    codec.ts (deflate + base64url) e importPlan.ts (new/same/conflict, overwrite/rename)
  store/    Zustand: library (dados/sets), settings, history, table (estado de la partida, no persistido)
  three/    Geometría con chaflán, atlas de caras en canvas, materiales (pool con ref-count),
            miniaturas offscreen, entorno PMREM, carga de iconos
  game/     Scene (Rapier), Cup, director (máquina de estados de la tirada), input (puntero/acelerómetro),
            sound (síntesis WebAudio), session (commit al historial, relanzar), ui/ (TallyBar, DieMenu,
            HistoryPanel)
  pages/    Home, Library, DieEditor, SetEditor, Play, Import
  ui/       Componentes reutilizables (Modal, feedback/toasts, pickers, DieThumb, DiePreview, Icon)
  i18n/     es.ts (define el tipo I18nKey), en.ts, index.ts (useT, useLang, useName)
  pwa/      register.ts (service worker + estado de actualización), install.ts (botón instalar), UpdateBanner.tsx,
            sw.template.js (plantilla; `scripts/build-sw.mjs` genera `dist/sw.js` con la lista de precarga)
  data/     presets.ts (dados y sets incluidos), backgrounds.ts
```

Rutas (hash): `#/`, `#/dice`, `#/dice/:id`, `#/sets/:id`, `#/play/:id`, `#/import?d=…`.
`Play` y `DieEditor` se cargan con `React.lazy` para no meter three/Rapier en el bundle inicial:
**no los importes de forma estática** desde otras páginas.

## Invariantes que no se pueden romper

- **Equiprobabilidad de dados imposibles.** Un dado de N caras que no tiene sólido propio (3, 5, 7, 13…,
  >20) se dibuja con el mayor sólido que cabe; en cada tirada `randomMapping` (con `cryptoRng`, en
  `game/director.ts`) elige al azar qué caras se pintan; `windowMapping` es la ventana fija de la vista
  previa y el fallback. Cada cara debe seguir teniendo probabilidad exacta `1/N`. Si tocas
  `model/solids.ts`, mantén/añade los tests de `random slices are fair` en `model/model.test.ts`.
- **Mapping coherente.** `rt[uid].mapping.length` debe coincidir con `solid.slots`; `Scene.tsx` protege
  contra mappings obsoletos. Cualquier código que cambie `die.faces` en caliente debe regenerarlo.
- **Compatibilidad de URLs compartidas.** Los enlaces ya compartidos deben seguir importándose. Si cambias
  `SharePayload`, añade campos opcionales o versiona el payload y mantén el decodificador anterior;
  `decodeShare` valida y sanea todo lo que llega (colores hex, materiales, límites de caras). Los fondos
  subidos (`kind: 'upload'`) no viajan en la URL.
- **Persistencia versionada.** Claves `dhd.library.v1`, `dhd.settings.v1`, `dhd.history.v1`. Un cambio
  incompatible de forma → subir `version` en el `persist` de Zustand y escribir `migrate`. Nunca borres
  datos del usuario sin migración.
- **Sin backend y sin peticiones externas en runtime** (salvo fondos por URL que elige el usuario). Todo
  debe funcionar offline una vez cargado.
- **Offline/PWA.** `dist/sw.js` se genera en el build (cache-first; versión = hash de los archivos). Cualquier
  asset nuevo en `dist/` se precachea solo, incluido `game-icons.json`. No uses URLs absolutas ni recursos
  externos en runtime, y no toques `localStorage` desde el SW. Una versión nueva nunca se activa sola: espera
  a que el usuario pulse «Actualizar» (`SKIP_WAITING`). El SW solo se registra en producción.
- **Build relativo.** `vite.config.ts` usa `base: './'` para que funcione en cualquier subruta
  (GitHub Pages). No uses rutas absolutas a assets.

## Convenciones

- **i18n obligatorio.** Ningún texto visible hardcodeado: añade la clave a `es.ts` **y** a `en.ts` (el tipo
  `I18nKey` sale de `es.ts`, así que TypeScript avisará si falta en `en.ts`). Los nombres de presets usan
  `names: { es, en }` y se muestran con `useName()`.
- **Lógica pura en `model/`**, testeable sin DOM. Los componentes solo orquestan.
- **Recursos de three.js**: materiales vía `useDieMaterial` (acquire/release con pool). No crees
  `MeshPhysicalMaterial` sueltos por dado; libera geometrías/texturas que crees tú. Cuando cambia el sprite
  de iconos cambia `iconsVersion()`, que invalida atlas y miniaturas: úsalo en las claves de caché.
- **Estado**: selectores finos de Zustand (`useStore((s) => s.x)`), no el store entero.
- **Estilos** en `styles.css` (base, variables, controles) y `styles-app.css` (componentes). Mobile-first;
  prueba a 390×844. Respeta `env(safe-area-inset-*)`.
- **Accesibilidad**: botones con `aria-label` cuando solo tienen icono; modales cierran con Escape.
- TypeScript estricto, sin `any` salvo justificado. Imports relativos.

## Verificación visual

Los cambios en 3D/UI hay que mirarlos, no solo compilarlos. Con `npm run build && npm run preview`, un
Playwright headless con Chromium sirve (flags útiles:
`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`). Definir `window.__dhdDebug = true`
antes de cargar registra en consola los tiempos de las miniaturas. Comprueba escritorio (1280×800) y móvil (390×844).

## Git y despliegue

- Rama de trabajo y de despliegue: **`sdd`** (rama huérfana; `master` es el proyecto antiguo).
- Commits como **Francisco Gutiérrez `<pikilon@gmail.com>`** (el remoto es `github.com/pikilon/die-hard-dice`).
  Comprueba `git config user.email` antes de commitear y que `gh auth status` usa la cuenta `pikilon`,
  no la de trabajo.
- Mensajes estilo Conventional Commits con scope: `feat(game): …`, `fix(share): …`, `docs(spec): …`.
- `.github/workflows/deploy.yml` ejecuta `npm ci && npm test && npm run build` y publica `dist/` en
  GitHub Pages en cada push a `sdd` (Settings → Pages → Source: GitHub Actions). Si los tests fallan, no
  se despliega.

## Créditos y licencias

Iconos de game-icons.net (CC BY 3.0): mantén la atribución en el modal "Acerca de" y en el README.
Los nombres de juegos comerciales en presets son solo referencias; no incluyas logos ni arte de terceros.
