# Plan técnico · Spec 001

## Stack
| Pieza | Elección | Motivo |
|---|---|---|
| Build | Vite + TypeScript | Sitio estático, `base: './'` para servir desde cualquier subruta |
| UI | React 19 | Ecosistema, R3F |
| 3D | three.js + @react-three/fiber + drei | Escena declarativa, utilidades (OrbitControls, Environment) |
| Física | @react-three/rapier (Rapier WASM) | Estable con pilas de dados, CCD, eventos de contacto |
| Estado | Zustand (+ `persist` a localStorage) | Simple, fuera del árbol React (útil en el bucle de física) |
| Rutas | wouter con hash (`#/…`) | Funciona en hosting estático sin rewrites |
| Animación UI | motion | Transiciones de paneles, fichas, modales |
| Compresión URL | fflate (deflate-raw) + base64url | Mejor ratio que lz-string |
| Iconos | @iconify-json/game-icons | 4000+ iconos temáticos, todos son un único `<path>` → `Path2D` síncrono |
| Fuentes | @fontsource-variable (Cinzel, Nunito) | Auto-hospedadas, sin CDN |
| Tests | Vitest | Lógica pura (caras, ventana, recuento, compartir, importación) |
| Deploy | GitHub Actions → Pages | `.github/workflows/deploy.yml` |

## Estructura
```
specs/001-die-hard-dice/     spec, plan, modelo de datos
scripts/build-icons.mjs      genera public/game-icons.json (completo, carga diferida) y src/icons/core.json
src/
  model/        tipos, resolución de caras, sólidos, ventanas, recuento, contraste, ids
  data/         dados/sets/fondos predefinidos
  store/        library (dados+sets), history, settings, table (partida en curso)
  i18n/         es.ts, en.ts, hook useT
  share/        encode/decode URL, planificador de importación
  three/        geometrías (poliedros con chaflán + moneda), atlas de caras (canvas), materiales,
                patrones procedurales, miniaturas, sonido
  game/         escena de juego: mesa, paredes, cubilete, dados físicos, controlador de lanzamiento
  ui/           componentes (botones, modales, color, selector de iconos, menú contextual, toasts)
  pages/        Home (sets), SetEditor, Library, DieEditor, Play, Import
```

## Decisiones clave
1. **Resolución de caras**: `resolveFace(die, i)` = numeración → intervalos (en orden) → override de la cara.
   Los dados se guardan compactos (reglas), no como arrays de N caras.
2. **Geometría genérica**: cada sólido se define por sus vértices; las caras se obtienen con un casco
   convexo por planos; se ordenan, orientan y se aplica chaflán (caras encogidas + tiras de arista +
   polígonos de vértice). Un único material por dado con **atlas** canvas (una celda por cara física +
   una celda de “cuerpo” para chaflanes). Los d4 dibujan 3 valores por cara (uno por esquina).
3. **Ventanas**: `mapping: number[]` (cara física → cara lógica). Para dados imposibles se regenera antes
   de cada lanzamiento con `randomWindow()` y se repinta el atlas.
4. **Lectura**: normal de cada cara física rotada por el cuaternión del cuerpo; gana la de mayor `y`
   (d4: vértice con mayor `y`). Umbral de “montado” 0.92 → empujón.
5. **Cubilete**: cuerpo `kinematicPosition` con fondo + 14 paredes + tapa (collider desactivable).
   Sigue al puntero sobre el plano de la mesa (altura fija) con suavizado; el acelerómetro añade
   desplazamientos. Al soltar: se desactiva la tapa, se rota ~125° en la dirección de lanzamiento, se
   añade torque aleatorio a los dados y el cubilete sale de escena.
6. **Paredes**: se calculan intersectando los rayos de las esquinas de la cámara con el plano `y = 0.6`
   y tomando el rectángulo inscrito (se recalculan al redimensionar).
7. **Dados fijos al relanzar**: los no seleccionados pasan a `fixed` durante el relanzamiento.
8. **Sonido**: síntesis WebAudio (ráfaga de ruido filtrado) disparada por eventos de fuerza de contacto.
9. **Iconos**: subconjunto curado (~130) empaquetado; el resto se carga bajo demanda desde
   `game-icons.json` (estático, cacheado por el navegador) al abrir el buscador o al pintar un icono
   no incluido.
