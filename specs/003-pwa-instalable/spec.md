# 003 — App instalable (PWA), offline y actualizaciones

Convierte la web en una **PWA**: instalable en el dispositivo, funcional sin conexión y con un flujo
explícito de actualización. No cambia ninguna regla de juego, dados, sets ni formato de compartir.

Plan de implementación paso a paso (pensado para ejecutarlo sin decisiones abiertas): `plan.md`.

## Alcance

Dentro: manifest, iconos, service worker, registro/actualización, botón de instalar, bloqueo de
orientación, precarga de recursos para uso offline.
Fuera: notificaciones push, sincronización en segundo plano, almacenamiento en la nube, cachear imágenes de
fondo que el usuario elige por URL externa.

## Requisitos funcionales

### Funcionar desde cualquier carpeta

- **FR-301** Ninguna URL del manifest, del service worker ni de los assets es absoluta (`/…`). Todo es
  relativo a donde esté publicado `index.html`: `start_url: "./"`, `scope: "./"`, iconos `icons/…`,
  registro del SW con `./sw.js`. Debe funcionar igual en `https://host/`, en `https://user.github.io/repo/`
  y en `https://host/a/b/c/` (el SW solo controla su carpeta y subcarpetas, y eso es lo deseado).
- **FR-302** El enrutado sigue siendo por hash (`#/…`), así que cualquier navegación se resuelve con el
  `index.html` de la carpeta; sin reglas de servidor.
- **FR-303** Los `import.meta.env.BASE_URL` existentes (p. ej. `game-icons.json`) siguen funcionando.

### Instalable

- **FR-310** Existe `manifest.webmanifest` enlazado desde `index.html` (`<link rel="manifest" href="./manifest.webmanifest">`)
  con: `name` «Die Hard Dice», `short_name` «Die Hard Dice», `description`, `lang: "es"`, `display: "standalone"`,
  `display_override: ["fullscreen"]` (best effort: pide pantalla completa inmersiva, que oculta las barras del
  sistema; donde no se soporte cae a `standalone`. Obliga a que la detección de app instalada acepte también
  `display-mode: fullscreen`, ver FR-313),
  `orientation: "portrait"`, `start_url`, `scope`, `id: "./"`, `handle_links` y `launch_handler` (FR-316), `background_color` y `theme_color` `#1c120b`
  (el mismo que el `<meta name="theme-color">`), `categories: ["games", "entertainment"]` e `icons`
  (FR-330).
- **FR-311** Cumple los criterios de instalabilidad de Chromium (Lighthouse/DevTools → Application →
  Manifest sin errores, «Installable») servido por HTTPS (o `localhost`).
- **FR-312** Aviso **«Instalar app»**: una tarjeta flotante (`position: fixed`) colocada **justo debajo de la
  barra superior** (`top: var(--header-h) + 8px`), visible en todas las pantallas con cabecera mientras no se
  cierre ni se instale, también al hacer scroll. Contiene texto, botón **«Instalar»** y ✕. Se muestra solo si
  el navegador emitió `beforeinstallprompt` (se guarda el evento y se llama a `prompt()` al pulsar) y la app no
  está ya instalada. Aparece **también en la pantalla de juego** (`Play`): ahí se coloca justo debajo de su barra
  superior (la que lleva volver/selector de set), medida en tiempo de ejecución.
  **Excepción: la Home.** En `#/` la tarjeta flotante **no se renderiza**: ocuparía el sitio del banner de
  identidad. Ahí la oferta de instalar vive dentro de ese banner (FR-508 de la spec 005), y la tarjeta reaparece
  en cuanto se navega a otra pantalla.
- **FR-313** **Nunca dentro de la app instalada:** si se ejecuta en modo instalado (`display-mode: standalone`
  o `display-mode: fullscreen`, o `navigator.standalone`), o tras `appinstalled`, el aviso no se muestra.
- **FR-314** iOS/Safari no emite `beforeinstallprompt`: si es iOS y no está en standalone, la misma tarjeta
  muestra el texto «Compartir → Añadir a pantalla de inicio» (sin botón) y su ✕.
- **FR-315** **Cerrar = preguntar en 7 días.** Al pulsar ✕ (o tras descartar el diálogo nativo) se guarda la fecha
  en `localStorage` (`dhd.installDismissed`) y el aviso no vuelve a mostrarse hasta pasados 7 días (7×24 h);
  entonces reaparece. Si `localStorage` falla, el aviso se oculta solo durante la sesión.
- **FR-316** **Enlaces dentro de la app (best effort).** Con la app instalada, los enlaces a la propia web (p. ej.
  los de compartir `#/import?d=…`) deben abrirse en la app y no en el navegador: el manifest declara
  `"handle_links": "preferred"` y `"launch_handler": { "client_mode": ["navigate-existing", "auto"] }`
  (Chromium de escritorio; en Android el WebAPK ya captura los enlaces del `scope`). Los navegadores que no lo
  soportan lo ignoran. Los enlaces de **otros** sitios (atribución game-icons.net, licencia CC) siguen abriéndose
  fuera de la app, con `target="_blank" rel="noreferrer"`.

### Orientación

- **FR-320** La app **no rota con el acelerómetro**: queda en vertical.
  - Instalada (Android/Chromium): lo garantiza `orientation: "portrait"` del manifest.
  - Además, de forma *best effort*, al entrar en `Play` se intenta `screen.orientation.lock('portrait')`
    dentro de `try/catch`, ignorando cualquier fallo (solo funciona en pantalla completa/instalada) y se
    llama a `unlock()` al salir. Nunca debe lanzar error visible ni bloquear el render.
  - Limitación documentada: en iOS (Safari o instalada) y en pestañas normales de navegador la web **no puede**
    bloquear la rotación; se respeta el bloqueo de rotación del sistema. Cuando el modo acelerómetro
    (FR-201) está activo, la app no está en standalone y el dispositivo no es de escritorio, se muestra una
    sola vez por sesión un aviso discreto: «Para que la pantalla no gire, instala la app o activa el bloqueo
    de rotación».
- **FR-322** Mientras se lanzan los dados (fases `gathering`, `shaking`, `tilting`, `pouring` y `settling`) la
  orientación de la pantalla **nunca cambia**: de forma *best effort* se llama a
  `screen.orientation.lock(<orientación actual>)` al empezar y a `unlock()` al terminar (o al salir de
  `Play`), sin errores visibles. Mismas limitaciones que FR-320 donde la web no puede bloquear.
- **FR-321** El diseño sigue siendo válido si el sistema rota igualmente (no se rompe nada), pero no se
  añade soporte horizontal nuevo.

### Iconos

- **FR-330** Conjunto de iconos generado a partir de un único SVG fuente (el dado de `public/favicon.svg`),
  guardado en `public/icons/` y **commiteado** (no en `.gitignore`):

  | Archivo | Tamaño | Uso |
  |---|---|---|
  | `icon-192.png` | 192×192 | manifest (`purpose: "any"`) |
  | `icon-512.png` | 512×512 | manifest (`purpose: "any"`) |
  | `maskable-192.png` | 192×192 | manifest (`purpose: "maskable"`) |
  | `maskable-512.png` | 512×512 | manifest (`purpose: "maskable"`) |
  | `apple-touch-icon.png` | 180×180 | `<link rel="apple-touch-icon">` (iOS, sin transparencia) |
  | `favicon-32.png` | 32×32 | `<link rel="icon" sizes="32x32">` (respaldo) |
  | `favicon.ico` | 16/32/48 | pestañas antiguas / Windows (ico multi-tamaño) |

  Se mantiene `favicon.svg` como icono principal de pestaña.
- **FR-331** Los iconos `maskable` llevan el dado dentro de la **zona segura** (círculo central del 80 %,
  es decir ≥10 % de margen por lado) sobre fondo sólido `#1c120b`. Los `any` llevan el dado ocupando
  ~90 % del lienzo con fondo transparente. `apple-touch-icon` lleva fondo sólido `#1c120b` y el dado al
  ~80 %.
- **FR-332** Se añaden `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `<meta name="mobile-web-app-capable" content="yes">`,
  `<meta name="apple-mobile-web-app-title" content="Die Hard Dice">` y
  `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` (la app ya respeta
  `env(safe-area-inset-*)`).
- **FR-333** Existe un script reproducible `scripts/build-pwa-icons.mjs` (comando `npm run pwa:icons`) que
  regenera todos los PNG/ICO desde `public/icons/source.svg` y `public/icons/source-maskable.svg`. **No** se
  engancha a `pre*` (los binarios van commiteados; solo se ejecuta si se cambia el diseño).

### Offline

- **FR-340** Tras la primera carga completa con conexión, la app funciona **sin red**: arranca, navega por
  todas las rutas hash, abre biblioteca/editor/mesa, lanza dados, importa enlaces compartidos pegados
  (`#/import?d=…`), usa los iconos del catálogo completo y el modo claro/oscuro.
- **FR-341** Se precachea **todo** lo que emite el build: `index.html`, JS/CSS (incluidos los chunks
  `lazy` de `Play` y `DieEditor`), fuentes (`@fontsource` ya se empaquetan con el build, sin Google
  Fonts), `favicon.svg`, iconos, `manifest.webmanifest` y **`game-icons.json`** (~6 MB, el catálogo completo
  que hoy se descarga bajo demanda; ver FR-342).
- **FR-342** Ningún recurso propio se pide a un origen externo en runtime (fuentes, iconos, HDRI, sonidos
  ya son locales/sintetizados). Si al implementar se encuentra alguno externo, se descarga al repo/build.
  Única excepción: imágenes de fondo por URL elegidas por el usuario (FR de fondos de 001): sin red se
  muestra el fondo por defecto del set y no se produce error.
- **FR-343** Si falla la precarga (sin espacio, red caída durante la instalación del SW), la instalación del
  SW falla de forma atómica: la app sigue funcionando online con la versión anterior y reintentará en la
  siguiente comprobación.

### Versiones y actualización (cache-first)

- **FR-350** Estrategia **cache-first** para todo lo precacheado: la app arranca siempre desde caché,
  instantánea y sin depender de la red. Las peticiones de navegación (`mode: "navigate"`) devuelven el
  `index.html` cacheado. Lo no precacheado (otros orígenes, imágenes de fondo del usuario) pasa a la red
  sin interceptar.
- **FR-351** Cada build produce un `sw.js` cuyo contenido cambia si y solo si cambia algún asset (la
  versión de caché es un hash del listado de archivos + hashes). Nombre de caché: `dhd-<hash>`.
- **FR-352** **Detección:** la app llama a `registration.update()` al arrancar, cada vez que la pestaña
  vuelve a estar visible (`visibilitychange`) y cada 60 min mientras esté abierta. El navegador compara
  `sw.js` byte a byte; si difiere, instala el nuevo SW en segundo plano **sin activarlo** (queda en
  `waiting`), así la sesión actual no se rompe a mitad de partida.
- **FR-353** **Aviso:** cuando hay un SW en `waiting`, aparece un banner/toast persistente no
  bloqueante: «Hay una nueva versión» con botón **«Actualizar»** (y ✕ para posponer; reaparece en la
  siguiente comprobación o carga). Nunca se recarga solo.
- **FR-354** **Aplicar:** al pulsar «Actualizar» se envía `{ type: 'SKIP_WAITING' }` al SW en espera; al
  activarse (`controllerchange`) la página se recarga **una sola vez** (protegido contra bucles) y el nuevo
  SW, en su evento `activate`, **borra todas las cachés `dhd-*` distintas de la actual** y toma control
  (`clients.claim()`).
- **FR-355** Los datos del usuario (`localStorage`: `dhd.library.v1`, `dhd.settings.v1`,
  `dhd.history.v1`) **nunca** se tocan al actualizar; las cachés del SW son un espacio distinto.
- **FR-356** Primera instalación del SW (no había controlador previo): no se muestra aviso de
  actualización; se muestra un toast breve «Lista para usar sin conexión».
- **FR-357** El SW solo se registra en producción (`import.meta.env.PROD`) y solo si
  `'serviceWorker' in navigator` y el contexto es seguro. En `npm run dev` no hay SW (para no cachear código
  de desarrollo). Si el registro falla, la app funciona igual y no muestra error.
- **FR-358** Recuperación: si el usuario está atascado con una versión rota, «Actualizar» (FR-354) más la
  limpieza de cachés del `activate` es el camino soportado; adicionalmente, en «Acerca de» se muestra la
  versión de la app (`package.json` → `__APP_VERSION__` inyectado por Vite `define`) y el hash corto de la build.

### i18n

- **FR-360** Todo texto nuevo va a `es.ts` y `en.ts` (claves bajo `pwa.*`): instalar, ayuda iOS, nueva versión
  disponible, actualizar, más tarde, lista offline, aviso de rotación, versión.

## Criterios de aceptación

1. `npm run build && npm run preview` y, en Chromium: Application → Manifest sin errores ni avisos, SW
   «activated and running», caché `dhd-<hash>` con todos los archivos de `dist/`.
2. Servir `dist/` desde una subcarpeta (`npx serve` de la carpeta padre, o copiar a `/tmp/x/y/dist`) y
   comprobar que carga, registra SW y es instalable. Repetir con GitHub Pages tras desplegar.
3. Recargar con DevTools → Network → «Offline»: la app arranca, se navega por todo, se abre el catálogo
   completo de iconos y se lanza una tirada.
4. Cambiar cualquier archivo, `npm run build`, recargar la pestaña de `preview`: aparece el aviso; pulsar
   «Actualizar» recarga una vez con la versión nueva; en Application → Cache Storage solo queda una caché
   `dhd-*`; `localStorage` intacto.
5. En un móvil Android (HTTPS vía `npm run tunnel` no sirve para SW prod: usar el despliegue o
   `preview --host` + túnel): «Instalar app» aparece, instala, el icono (maskable) se ve bien recortado en
   círculo/squircle y la app no rota al inclinar.
6. iOS Safari: aparece el texto de ayuda, «Añadir a pantalla de inicio» usa `apple-touch-icon`, abre a
   pantalla completa.
7. `npm test && npm run build` sin errores.
