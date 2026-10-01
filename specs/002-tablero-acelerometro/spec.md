# 002 — Modo caja con acelerómetro

Ajusta §4.2 de `001-die-hard-dice`: cuando el dispositivo tiene acelerómetro **activo** (eventos
`devicemotion` recibidos; en iOS, con permiso concedido), **Lanzar** no usa cubilete.

- **FR-201** Al pulsar Lanzar/Relanzar no aparece cubilete: los dados se quedan en la mesa y se muestra
  «Agita el móvil para lanzarlos». Fase `tilting`.
- **FR-202** El dispositivo es una **caja** con los dados sueltos: sienten la aceleración del dispositivo
  con gravedad en sus tres ejes (limitada a ≈28 m/s²). Moverlo a los lados o en vertical los lleva contra los
  bordes de la pantalla; moverlo hacia/desde el usuario los acerca/aleja del tapete (los levanta y los
  deja caer). Plano horizontal = gravedad normal; inclinado 90° = flotan y caen hacia el lado.
- **FR-203** Tras agitar de verdad (cambio de lectura > ≈3 m/s²), si el dispositivo se mueve con muy poca
  fuerza (< ≈0,6 m/s²) durante **2 s**, el acelerómetro se desactiva: los dados caen y ruedan por
  gravedad normal. Tope de seguridad: 60 s. Tocar la pantalla también lo desactiva.
- **FR-204** El resultado se lee en cuanto los dados quedan quietos con el dispositivo en calma (≥ 0,6 s tras
  la sacudida), sin esperar a los 2 s, o al asentarse tras desactivarse el acelerómetro (mismo
  empujón a dados «montados» que con cubilete).
- **FR-205** Sin acelerómetro (escritorio, HTTP en móvil, permiso denegado) todo funciona como en §4.2
  (cubilete). En iOS la primera tirada tras conceder el permiso puede usar el cubilete.
- Equiprobabilidad: los dados imposibles reciben un `randomMapping` nuevo en cada tirada.
