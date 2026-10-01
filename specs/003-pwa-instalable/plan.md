# 003 — Plan de implementación

Decisiones ya tomadas (no reabrir): **sin dependencias de runtime nuevas**, service worker **escrito a
mano** + script post-build que inyecta la lista de precarga. No usar `vite-plugin-pwa`/Workbox.
Requisitos en `spec.md` (FR-3xx). Hacer commits pequeños, uno por paso, estilo
`feat(pwa): … (FR-3xx)`. Antes de terminar: `npm test && npm run build`.

## Paso 1 — Iconos (FR-330…333)

1. Dependencia **solo de desarrollo**: `npm i -D sharp png-to-ico` (si `png-to-ico` da problemas,
   generar `favicon.ico` con un ICO de una sola entrada de 32 px escrito a mano en el script).
2. Crear `public/icons/source.svg` (copia de `public/favicon.svg`, dado al ~90 % del viewBox) y
   `public/icons/source-maskable.svg` (mismo dado escalado al ~62 % del lienzo y centrado, con `<rect>`
   de fondo `#1c120b` ocupando todo el viewBox 64×64). Revisar visualmente.
3. `scripts/build-pwa-icons.mjs`: con `sharp`, rasteriza (`density` alta) a los 7 archivos de la tabla de
   FR-330 en `public/icons/`. `apple-touch-icon` y maskables con fondo sólido `#1c120b` (`flatten`).
   Script `"pwa:icons": "node scripts/build-pwa-icons.mjs"` en `package.json`.
4. Ejecutarlo y **commitear los binarios**. Mirar los PNG (Read de imagen) para validar márgenes.

## Paso 2 — Manifest y `index.html` (FR-310, 332, 301)

1. `public/manifest.webmanifest` con los campos de FR-310; iconos con rutas **relativas**
   (`icons/icon-192.png`…) y `purpose` `any` / `maskable` en entradas separadas (nunca `"any maskable"`).
2. `index.html`: `<link rel="manifest" href="./manifest.webmanifest">`, `apple-touch-icon`, `favicon-32`,
   `favicon.ico` y las 4 metas de FR-332. Todas con `./`. Mantener `theme-color`.
3. Verificar que `dist/manifest.webmanifest` e `icons/` salen en el build.

## Paso 3 — Service worker + script post-build (FR-340…343, 350, 351, 354)

1. `src/pwa/sw.template.js` (JS plano, no TS, fuera del grafo de Vite). Contiene el marcador
   `/*__PRECACHE__*/[]` y `/*__VERSION__*/""`:
   - `const CACHE = 'dhd-' + VERSION;` `const BASE = self.registration.scope;` URLs del precache =
     `new URL(rel, BASE).href`.
   - `install`: `caches.open(CACHE).then(c => c.addAll(PRECACHE))`. **No** llamar `skipWaiting()` aquí.
   - `message`: si `data?.type === 'SKIP_WAITING'` → `self.skipWaiting()`.
   - `activate`: borrar toda caché cuyo nombre empiece por `dhd-` y no sea `CACHE`; `clients.claim()`.
   - `fetch` (solo `GET`): si `request.mode === 'navigate'` → `caches.match(BASE + 'index.html')` con
     respaldo a red. Si la URL (sin query/hash) está en el precache → `caches.match` (cache-first), respaldo
     a red. Si no, no llamar a `respondWith` (pasa a red). Ignorar orígenes distintos.
2. `scripts/build-sw.mjs`: recorre `dist/` recursivamente (excluye `sw.js`, `.map` y `.DS_Store`), para
   cada archivo calcula sha256 corto; `VERSION` = sha256 de la lista ordenada `ruta:hash`, 10 chars;
   `PRECACHE` = rutas relativas a `dist/` (con `./` equivalente a la raíz → incluir `''`/`index.html`);
   sustituye los marcadores del template y escribe `dist/sw.js`. Imprime nº de archivos, tamaño total y
   versión.
3. `package.json`: `"build": "tsc -b && vite build && node scripts/build-sw.mjs"`. `npm run preview` ya sirve
   `dist/`.
4. Comprobar tamaño: `game-icons.json` (~6 MB) entra en el precache; es intencional (FR-341).

## Paso 4 — Registro y flujo de actualización (FR-352…358)

1. `src/pwa/register.ts` (sin React): exporta un pequeño store (`subscribe`/`getState`) con
   `{ needRefresh: boolean, offlineReady: boolean }`, y funciones `registerSW()` y `applyUpdate()`.
   - `registerSW()`: solo si `import.meta.env.PROD && 'serviceWorker' in navigator && isSecureContext`.
     `navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')` dentro de `try/catch`.
   - Si había `controller` previo y aparece un `waiting` (o `updatefound` → `installed` con controller)
     → `needRefresh = true`. Si no había controller y el SW llega a `activated` → `offlineReady = true`.
   - Comprobaciones: `reg.update()` al registrar, en `visibilitychange` (visible) y cada 60 min.
   - `applyUpdate()`: `reg.waiting?.postMessage({type:'SKIP_WAITING'})`; escuchar `controllerchange` una vez y
     `location.reload()` con guardia `let reloading=false`.
2. Llamar a `registerSW()` en `src/main.tsx` tras el render (no bloquear el arranque).
3. `src/ui/UpdateBanner.tsx`: usa el store (hook con `useSyncExternalStore`), muestra el banner de FR-353
   (texto + «Actualizar» + ✕) y el toast de FR-356 reutilizando `ui/feedback` si encaja. Montar en
   `App.tsx` a nivel raíz. Estilos en `styles-app.css`, respeta `env(safe-area-inset-bottom)`.
4. Versión de la app (FR-358): en `vite.config.ts` `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`
   + declaración en `src/vite-env.d.ts`; mostrarla en el modal «Acerca de» de `App.tsx`. El hash de build es
   opcional si complica; si se incluye, leerlo de `dist/sw.js` no es necesario: basta la versión del
   `package.json`.

## Paso 5 — Botón instalar y orientación (FR-312…314, 320, 321)

1. `src/pwa/install.ts`: escucha `beforeinstallprompt` (`preventDefault`, guarda el evento) y
   `appinstalled`; expone store `{ canInstall, isStandalone, isIOS }` y `promptInstall()`. `isStandalone`:
   `matchMedia('(display-mode: standalone)').matches || navigator.standalone`. El listener debe
   registrarse al cargar el módulo (el evento puede llegar antes del montaje de React): importarlo desde
   `main.tsx`.
2. En `pages/Home.tsx`: botón «Instalar app» (icono + texto) si `canInstall && !isStandalone`; en iOS no
   standalone, texto de ayuda en vez de botón.
3. Orientación: en `pages/Play.tsx` un `useEffect` que hace
   `screen.orientation?.lock?.('portrait')?.catch(() => {})` envuelto en `try/catch` y `unlock()` en el
   cleanup. Aviso único por sesión (FR-320) vía `sessionStorage` + toast, solo cuando el acelerómetro
   activo (ver `game/input.ts`) y no standalone y pantalla táctil.
4. i18n: claves `pwa.*` en `es.ts` y `en.ts`.

## Paso 6 — Docs y verificación

1. `AGENTS.md`: añadir a «Mapa del código» `pwa/` (register, install, sw.template.js), a «Comandos»
   `npm run pwa:icons`, y a los invariantes: «**Offline/PWA.** `sw.js` se genera en el build; cualquier
   asset nuevo en `dist/` se precachea solo; no uses URLs absolutas ni recursos externos en runtime; no
   toques `localStorage` desde el SW».
2. `README.md`: sección «Instalar» breve.
3. Verificar todo el §Criterios de aceptación de `spec.md` (1–4 son automatizables con el navegador del
   Claude/Playwright; 5–6 requieren dispositivo real, indicar que quedan pendientes si no se pueden hacer).
4. `.github/workflows/deploy.yml` no cambia (ya hace `npm run build`). Nota: GitHub Pages sirve con
   `Cache-Control: max-age=600`; el navegador ya ignora la caché HTTP para `sw.js` al actualizar el SW,
   así que no hay que hacer nada.

## Riesgos / trampas conocidas

- `addAll` falla entero si un solo archivo da 404: el script de build y el SW deben usar las mismas rutas
  relativas (probar en subcarpeta).
- No cachear `sw.js` ni `manifest` dentro del propio precache de forma que impida actualizar: `sw.js`
  **no** está en la lista; el manifest sí puede estarlo.
- Nunca `skipWaiting()` automático: rompería la partida en curso y el flujo FR-353/354.
- `controllerchange` se dispara también en la primera instalación con `clients.claim()`: la guardia
  `reloading` + comprobar que había controller previo evita un reload innecesario en la primera visita.
- Tests Vitest solo cubren `src/**/*.test.ts` (entorno node): si se extrae lógica pura (p. ej. cálculo de
  `needRefresh`), va en `src/pwa/` con test; el SW y los scripts se verifican a mano.
