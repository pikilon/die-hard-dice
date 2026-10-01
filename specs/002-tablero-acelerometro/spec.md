# 002 — Modo caja con acelerómetro

Ajusta §4.2 de `001-die-hard-dice`: cuando el dispositivo tiene acelerómetro **activo** (eventos
`devicemotion` recibidos; en iOS, con permiso concedido), **Lanzar** no usa cubilete.

- **FR-201** Lanzar sigue sacando el cubilete en el centro (§4.2). Con acelerómetro activo el mensaje es
  «Agárralo o agita el móvil». Si se pulsa el cubilete, se usa solo el táctil (arrastrar y soltar, §4.2).
  Si en cambio se agita el móvil (> ≈9 m/s²), el cubilete suelta los dados y desaparece, y los dados pasan al
  modo caja (fase `tilting`, mensaje «Agita el móvil para lanzarlos»).
- **FR-202** El dispositivo es una **caja** con los dados sueltos: sienten la aceleración del dispositivo
  con gravedad en sus tres ejes (limitada a ≈28 m/s²). Moverlo a los lados o en vertical los lleva contra los
  bordes de la pantalla; moverlo hacia/desde el usuario los acerca/aleja del tapete (los levanta y los
  deja caer). Plano horizontal = gravedad normal; inclinado 90° = flotan y caen hacia el lado.
- **FR-203** Tras agitar de verdad (cambio de lectura > ≈3 m/s²), si el dispositivo se mueve con muy poca
  fuerza (< ≈0,6 m/s²) durante **2 s**, el acelerómetro se desactiva: los dados caen y ruedan por
  gravedad normal. Tope de seguridad: 60 s. 
- **FR-206** La mesa tiene un **cristal** justo **detrás de la cámara** (altura de la cámara + 2 unidades): los dados sacudidos hacia la cámara
  chocan con él y nunca salen de la vista.
- **FR-207** Tocar la pantalla durante `tilting` desactiva el acelerómetro (los dados se asientan).
- **FR-204** El resultado se lee en cuanto los dados quedan quietos con el dispositivo en calma (≥ 0,6 s tras
  la sacudida), sin esperar a los 2 s, o al asentarse tras desactivarse el acelerómetro (mismo
  empujón a dados «montados» que con cubilete).
- **FR-205** Sin acelerómetro (escritorio, HTTP en móvil, permiso denegado) todo funciona como en §4.2
  (cubilete). En iOS la primera tirada tras conceder el permiso puede usar el cubilete.
- Equiprobabilidad: los dados imposibles reciben un `randomMapping` nuevo en cada tirada.
