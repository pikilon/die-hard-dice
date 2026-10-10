# 005 — Título de la app y compartir la web

La Home es la puerta de entrada, pero no dice en ningún sitio cómo se llama la app (en móvil el nombre
está oculto en la cabecera y el titular del hero es el juego, no la app) y tampoco deja pasar **la web**
a otra persona: solo se podían compartir sets, y escondido en el menú «⋯» de cada tarjeta.

Esta feature añade el bloque de identidad de la app en la Home y hace que compartir (la app y los sets)
sea una acción visible. No cambia dados, sets, física, formato de compartir ni importación.

## Requisitos funcionales

- **FR-501** La Home empieza con un **bloque de identidad** siempre visible: el logo, el nombre de la app
  como **`<h1>` de la página** («Die Hard Dice») y el eslogan (`app.tagline`). El bloque no depende de que
  el hero esté visible: si el hero se oculta (FR-405), el título sigue ahí.
- **FR-502** **El nombre se ve en móvil.** La cabecera puede ocultar el texto de la marca a ≤640 px, pero
  el `<h1>` de la Home garantiza que el nombre de la app se lea en cualquier ancho (probado a 390×844).
- **FR-503** **Compartir la app.** En el bloque de identidad hay un botón «Compartir app» **siempre visible**
  que abre un diálogo con la URL de la app (raíz del sitio: sin `#` ni `?`), botón **Copiar** y **Compartir…**
  con la Web Share API cuando el navegador la soporte (`title` = nombre de la app). La URL de la app no lleva
  payload: abrirla muestra la Home.
- **FR-504** **Compartir un set, a la vista.** Cada tarjeta de set muestra un botón «Compartir» propio
  (icono + `aria-label`), no solo la entrada dentro del menú «⋯». Abre el mismo diálogo de siempre con la
  URL `#/import?d=…` (FR de 001 §5).
- **FR-505** Un solo componente de diálogo para ambos casos: recibe título, texto, URL y, opcionalmente,
  un aviso y una nota (p. ej. el tamaño de la URL del set). El diálogo del set conserva su comportamiento
  actual (copiar + Web Share + aviso de fondo subido).
- **FR-506** Textos en es/en. «Die Hard Dice» es nombre propio: la misma cadena en los dos idiomas
  (`app.name`). La cabecera deja de tener el nombre hardcodeado.
- **FR-507** Mobile-first: en móvil el bloque de identidad ocupa el ancho completo y sus botones van en su
  propia fila, a partes iguales; el `<h1>` no se solapa con el escenario del hero ni rompe
  `env(safe-area-inset-*)`.
- **FR-508** **Instalar desde el bloque de identidad.** Si la app **no está instalada** y hay forma de
  ofrecerlo (`beforeinstallprompt` capturado o iOS), el bloque muestra un segundo botón «Instalar app»
  **antes** del de compartir. Al pulsarlo: si hay prompt nativo se llama; en iOS abre un diálogo con
  «Compartir → Añadir a pantalla de inicio» (`pwa.installIos`). Si la app ya está instalada
  (`display-mode: standalone|fullscreen` o `navigator.standalone`) o tras `appinstalled`, el botón
  desaparece; el de compartir se queda.
- **FR-509** **Nada de dos «instalar» a la vez.** Como la Home ya tiene su botón, la tarjeta flotante de
  instalar **no se renderiza en `#/`** (FR-312 de 003): así no se superpone al bloque de identidad (la
  tarjeta es `position: fixed` bajo la cabecera y lo tapaba, incluido el `<h1>` en móvil) ni duplica la
  llamada. La tarjeta sigue apareciendo en las demás pantallas con cabecera y en la de juego. El ✕ y su
  snooze de 7 días (FR-315) siguen afectando solo a la tarjeta: el botón del bloque es un acceso discreto
  y permanente mientras la app no esté instalada.

## Criterios de aceptación

1. A 1280×800 y a 390×844, en `#/`, se lee «Die Hard Dice» sin hacer scroll y sin abrir ningún menú.
2. Con el hero oculto (✕), el nombre de la app sigue visible.
3. El botón «Compartir» de la Home copia la URL raíz del sitio (p. ej. `http://localhost:5173/`), no una
   URL con `#`.
4. En un navegador con `navigator.share`, el botón «Compartir…» del diálogo abre la hoja nativa con el
   nombre de la app y la URL.
5. Copiar la URL de un set desde la tarjeta sigue produciendo un enlace `#/import?d=…` que se importa igual.
6. Sin instalar y en iOS: el bloque muestra «Instalar app» + «Compartir app»; pulsar instalar abre el diálogo
   con las instrucciones. En la Home no hay tarjeta flotante; en `#/dice` sí.
7. Con la app instalada (o tras `appinstalled`), el bloque solo muestra «Compartir app».
8. `npm test` y `npm run build` pasan.
