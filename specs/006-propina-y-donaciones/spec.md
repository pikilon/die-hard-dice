# 006 — Propina y donaciones voluntarias

Die Hard Dice es una web app gratuita, independiente, sin anuncios ni backend. Para permitir a los
usuarios que valoran la herramienta apoyar su desarrollo y mantenimiento, esta feature añade un sistema
de propina voluntaria no intrusivo mediante PayPal, con opción de sugerir features, acceso visible en la
interfaz y un recordatorio automático tras un tiempo significativo de uso activo.

## Requisitos funcionales

- **FR-601** **Acceso en la cabecera.** La barra superior (`app-header`) incluye un botón con icono de
  propina (`take-my-money` de `game-icons.net`) y texto accesible «Apoyar» / «Support» (`tip.button`), visible en
  todas las páginas con cabecera. Al pulsarlo, abre la ventana modal de propinas.
- **FR-602** **Acceso en la Home.** En el bloque de identidad de la Home (`home-brand-actions`), junto a los
  botones de instalar y compartir, se incluye un botón «Apoyar» con icono de propina (`take-my-money` de
  `game-icons.net`), integrado estéticamente con el resto de acciones de la app.
- **FR-603** **Ventana modal de propina.** El modal de propina contiene:
  1. Título y mensaje de agradecimiento explicando que Die Hard Dice es un proyecto independiente y libre de
     anuncios.
  2. Botones de donación directa por PayPal: **1 $**, **2 $** y **Otra cantidad**, que abren en pestaña nueva
     los enlaces correspondientes (`https://paypal.me/pikilongeorgia/1USD`, `.../2USD` y `.../pikilongeorgia`).
  3. **Nota sobre sugerencia de features:** Sección informativa que explica que el usuario puede incluir una
     sugerencia o petición de funcionalidad en la nota de su donación en PayPal, con un aviso explícito y
     amigable de que la donación no garantiza que la feature se vaya a implementar.
  4. Botón **«Ya he donado»** (`tip.alreadyDonated`): marca en el dispositivo que el usuario ya ha colaborado,
     muestra un toast de agradecimiento y cierra el diálogo.
  5. Botón **«Quizá más tarde»** (`tip.maybeLater`) o botón de cierre (✕): cierra el modal e inicia un periodo
     de espera (snooze).
- **FR-604** **Recordatorio automático a los 15 minutos de uso activo.**
  - Se monitoriza el tiempo de uso activo acumulado en el dispositivo.
  - Se considera «uso activo» cuando el documento está visible (`document.visibilityState === 'visible'`) y
    ha habido interacción de usuario en los últimos 60 segundos.
  - Al alcanzar **15 minutos (900 segundos)** de uso activo acumulado:
    - Si el usuario **ya ha donado**, el recordatorio automático **nunca** se muestra.
    - Si el usuario ha cerrado el modal previamente y han pasado **menos de 7 días**, no se muestra.
    - En caso contrario, se abre automáticamente la ventana modal de propina.
- **FR-605** **Snooze de 1 semana tras cerrar.** Si el usuario cierra el modal (por el botón ✕ o «Quizá más
  tarde») sin marcar que ha donado, no se le vuelve a mostrar el recordatorio automático durante al menos
  **7 días (1 semana)** desde el momento del cierre.
- **FR-606** **Nunca molestar si ya ha donado.** Si el usuario pulsa «Ya he donado», el estado se persiste en
  `localStorage` (`dhd.tip.v1`), impidiendo que el recordatorio automático vuelva a aparecer en ese
  dispositivo de por vida. Los accesos manuales (cabecera y Home) siguen estando disponibles por si el usuario
  desea consultar el enlace o donar de nuevo voluntariamente.
- **FR-607** **Persistencia aislada y resiliente.** El estado de propina se almacena en `localStorage` bajo
  la clave `dhd.tip.v1` conteniendo `activeSeconds`, `dismissedAt` y `donated`. Si el almacenamiento local no
  está disponible, el sistema degrada con elegancia a estado en memoria durante la sesión.
- **FR-608** **Internacionalización completa.** Todos los textos de la interfaz, botones, sugerencias y
  avisos están traducidos en español (`es.ts`) e inglés (`en.ts`).
- **FR-609** **Mobile-first y accesibilidad.** El diálogo y los botones están adaptados para pantallas móviles
  (390×844) y escritorio, son navegables con teclado, cierran con la tecla Escape y cumplen con etiquetas
  `aria-label` descriptivas.

## Criterios de aceptación

1. En la Home y en la cabecera aparece el botón de apoyar con icono de moneda de propina y abre el modal de propina.
2. Los enlaces de 1 $, 2 $ y otra cantidad dirigen a `https://paypal.me/pikilongeorgia/1USD`,
   `https://paypal.me/pikilongeorgia/2USD` y `https://paypal.me/pikilongeorgia` en una nueva pestaña.
3. El modal explica claramente la opción de sugerir una feature en la nota de PayPal y la advertencia de que
   no garantiza su implementación.
4. Al pulsar «Ya he donado», se registra en `localStorage`, se muestra un mensaje de agradecimiento y el
   recordatorio automático no vuelve a mostrarse en ese dispositivo.
5. Al cerrar el modal sin donar, no vuelve a saltar automáticamente hasta pasados 7 días.
6. A los 15 minutos de uso activo acumulado (y sin estar donado ni en periodo de 7 días de snooze), el modal
   se abre automáticamente.
7. `npm test` y `npm run build` pasan sin errores.
