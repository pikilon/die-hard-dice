# 004 — Hero de bienvenida en la Home

Un usuario nuevo no entendía de qué va la app al entrar. La Home muestra una introducción visual que
explica la propuesta (crear dados y juegos propios) y deja usarla en un toque. No cambia reglas de juego,
dados, sets ni formato de compartir.

## Requisitos funcionales

- **FR-401** Sobre la lista de sets, la Home muestra un *hero* con: etiqueta, titular, frase de valor,
  dos botones y una nota. Titular: «Crea los dados de <juego>», donde <juego> rota solo
  (King of Tokyo · HeroQuest · tu partida de rol · tu propio juego).
- **FR-402** Escenario animado: un dado grande que cambia con cada juego (el de ese juego) y cuatro dados
  secundarios flotando. Un toque sobre el dado grande hace girar a los secundarios. Es decorativo
  (`aria-hidden`) y se detiene con `prefers-reduced-motion`.
- **FR-403** Botones: «Lanzar dados ahora» → `#/play/b-dnd` (set de ejemplo) y «Crear mi dado» → `#/dice/new`.
- **FR-404** Tres pasos: diseña tu dado → júntalos en un set → lanza y comparte.
- **FR-405** El hero se puede ocultar con una ✕ (`dhd.heroDismissed` en `localStorage`, tolerante a que
  no esté disponible). Oculto, la cabecera de la lista muestra «¿Qué es esto?» para recuperarlo.
- **FR-406** Textos en es/en. Mobile-first: en móvil el escenario va arriba y los pasos se apilan.
