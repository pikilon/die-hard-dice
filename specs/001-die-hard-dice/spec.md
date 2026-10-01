# Spec 001 · Die Hard Dice

> Estado: **aprobada para implementar** · Rama: `sdd` · Fecha: 2026-09-30

Web app estática (sin backend ni BD) para **definir dados personalizados**, agruparlos en **sets**,
**lanzarlos en 3D con física** desde un cubilete y **compartir** sets mediante una URL.
Interfaz en **español e inglés**.

---

## 1. Glosario

| Término | Significado |
|---|---|
| **Dado** (`Die`) | Definición reutilizable: nombre, nº de caras lógicas, color, material y personalización de caras. Vive en la *biblioteca*. |
| **Cara lógica** | Cada uno de los `N` resultados posibles del dado (1…N). `N` es ilimitado (mín. 2). |
| **Sólido / cara física** | Poliedro 3D que representa al dado: moneda (2), d4, d6, d8, d10, d12, d20. Tiene `M` caras físicas. |
| **Dado imposible** | Dado cuyo `N` no coincide con ningún sólido (3, 5, 7, 9, 11, 13-19, >20). |
| **Ventana** (*slice*) | Subconjunto de `M` caras lógicas que se pintan sobre el sólido en un momento dado. |
| **Set** | Colección ordenada de referencias a dados (se pueden repetir) + fondo + opciones de recuento. |
| **Mesa / tapete** | Escena de juego con los dados del set seleccionado. |
| **Tirada** | Resultado de lanzar dados; se guarda en el **historial**, con sus relanzamientos y alteraciones. |

---

## 2. Dados

### 2.1 Propiedades
- **Nombre** (texto libre).
- **Color** del cuerpo del dado.
- **Material** (textura): `plástico`, `mármol`, `metal`, `madera`, `cristal`, `piedra`.
- **Número de caras lógicas `N`**: entero ≥ 2 (límite práctico 1000). Atajos: 2 (moneda), 4, 6, 8, 10, 12, 20.
- **Numeración**: valor inicial y paso (por defecto `1` y `1`). La cara *i* vale `inicio + (i-1)·paso`.
  Sirve para rangos como 0-9, 5-11 o 00-90.
- **Intervalos**: reglas `desde…hasta` (caras lógicas, inclusivo) que aplican a la vez color de fondo,
  color del valor y/o valor. Ej.: “caras 3 a 5 → fondo rojo, texto verde”. Se aplican en orden; la última gana.
- **Personalización por cara** (gana sobre intervalos):
  - color de fondo de la cara (por defecto, el del dado);
  - valor: **1 a 3 caracteres** (números, letras, emojis) **o un icono** de game-icons.net;
  - color del valor: por defecto **automático = blanco o negro**, el de mayor contraste con el fondo.
- Acciones: **crear**, **duplicar** (“Nombre (copia)”), **editar**, **borrar** (si no lo usa ningún set).
- Si un dado se usa en varios sets, el editor lo avisa (“Usado en N sets”) y los cambios afectan a todos.

### 2.2 Sólido que representa cada `N` (regla de “caras imposibles”)
Se usa el **mayor sólido cuyo nº de caras sea ≤ N** (así nunca queda una cara física en blanco):

| N | Sólido | Caras visibles | Caras ocultas en cada momento |
|---|---|---|---|
| 2 | moneda | 2 | 0 |
| 3 | moneda | 2 | 1 |
| 4-5 | d4 | 4 | N-4 |
| 6-7 | d6 | 6 | N-6 |
| 8-9 | d8 | 8 | N-8 |
| 10-11 | d10 | 10 | N-10 |
| 12-19 | d12 | 12 | N-12 |
| ≥ 20 | d20 | 20 | N-20 |

- **Editor**: si el dado es imposible se muestra una explicación
  (“Este dado tiene 7 caras pero se representa con un d6; en cada tirada se eligen al azar 6 de las 7
  caras. Cada cara sigue teniendo probabilidad 1/7”) y un **selector de ventana** que elige qué rango
  de caras se ve en la vista previa 3D (p. ej. caras 2-7).
- **Tirada**: antes de cada lanzamiento se elige **al azar** una ventana (subconjunto uniforme de `M` caras
  de las `N`) y se reparte al azar sobre las caras físicas. La física decide la cara que queda arriba.
  Como cada cara lógica aparece con probabilidad `M/N` y, si aparece, sale con `1/M`, cada resultado
  tiene probabilidad **exactamente `1/N`**.
- Dados posibles (`N = M`): disposición fija y bonita (caras opuestas suman `N+1` en los sólidos
  simétricos).
- **d4**: se lee el **vértice superior** (como un d4 real). Cada cara física muestra los valores de sus
  tres vértices junto a cada esquina; el valor de arriba se repite en las tres caras visibles.

### 2.3 Dados predefinidos (biblioteca inicial)
Moneda, D4, D6, D8, D10, D12, D20, D100 (d10 de decenas 00-90), dado de King of Tokyo (negro:
1, 2, 3, garra, corazón, rayo), dado de bonificación verde de King of Tokyo, dado de combate de
HeroQuest (3 calaveras, 2 escudos blancos, 1 escudo negro), dado de movimiento rojo de HeroQuest (d6).

---

## 3. Sets

- **Título** y descripción opcional.
- **Dados**: lista ordenada de referencias a dados de la biblioteca (se puede repetir el mismo dado).
- **Fondo** del tapete: presets SVG incluidos (fieltro verde, taberna, mazmorra, ciudad nocturna,
  pergamino, casino) · **URL de imagen** (se comparte) · **imagen subida** (solo local; al compartir se
  sustituye por un preset y se avisa).
- **Opciones de recuento**: mostrar suma de números (sí/no) · agrupar números (sí/no).
- Acciones: crear, editar, **clonar** (“guardar como” con otro nombre), borrar, compartir, jugar.
- Desde el editor de sets se puede añadir un dado de la biblioteca, **crear uno nuevo** o **clonar**
  uno existente para modificarlo sin afectar a otros sets.
- **Sets predefinidos**: King of Tokyo (6 dados KoT), HeroQuest · Héroe (2 de movimiento + 3 de
  combate), HeroQuest · Enemigos (3 de combate), D&D (d4, d6, d8, d10, d12, d20, d100), Clásico (2d6).
- “Restaurar predeterminados” vuelve a crear los dados/sets de fábrica que falten o se hayan cambiado.

---

## 4. Juego

### 4.1 Mesa
- Se juega con el **set seleccionado** (selector en la barra superior).
- Los dados del set aparecen en el tapete, sobre el fondo del set.
- La mesa tiene **paredes invisibles ajustadas al área visible**: ningún dado puede quedar fuera de
  pantalla, en cualquier tamaño/orientación.

### 4.2 Lanzar
1. El usuario pulsa **Lanzar** (o pulsa sobre el tapete y arrastra: atajo que salta el paso 2).
2. Con **Lanzar** el cubilete aparece **en el centro de la mesa**, los dados vuelan dentro y un mensaje
   parpadeante con una mano pide **mantener pulsado el cubilete** para agarrarlo (zona de agarre generosa).
   Si se pulsa fuera del cubilete, o se pulsa Esc, el lanzamiento **se cancela**: los dados vuelven a su
   sitio y a su aspecto anteriores. Con teclado, Intro/Espacio agarra y agita automáticamente.
   Con *reduced motion* el mensaje no parpadea. Arrastrando desde el tapete el cubilete aparece ya
   agarrado bajo el puntero.
3. **Agitar** (una vez agarrado):
   - con ratón/dedo: **arrastrando**; el cubilete sigue al puntero y los dados chocan dentro con física;
   - con **acelerómetro** (móvil): agitando el dispositivo mientras se sostiene el cubilete (se pide
     permiso en iOS).
   Al llegar al borde de la mesa el cubilete se detiene y el exceso de recorrido del puntero se descarta:
   al invertir el movimiento el cubilete vuelve a responder de inmediato.
4. **Soltar** (levantar el clic/dedo, o salir de la ventana):
   el cubilete **se vuelca** en la dirección del último movimiento, los dados caen, **rebotan en el
   tapete** y el cubilete desaparece.
5. Cuando todos los dados están quietos se lee la cara superior. Si un dado queda “montado”
   (inclinado sobre otro o contra la pared) se le da un pequeño empujón y se vuelve a esperar.
   El cubilete **amplifica el movimiento del puntero** (≈2,6×): bastan gestos pequeños para agitar. Al
   soltar, los dados se **disparan como desde un cañón** con la velocidad y la dirección del propio
   cubilete en ese instante (pico de los últimos ~0,2 s), apuntando algo hacia abajo para golpear la mesa
   enseguida. Un gesto suave da un disparo suave y uno vivo un disparo fuerte. El cubilete se aparta sin
   arrastrar los dados.
   El cubilete contiene siempre los dados mientras se agita, por fuerte que sea el movimiento: ningún
   dado atraviesa las paredes ni la tapa.
   Si el puntero sale de la ventana (o la ventana pierde el foco) durante el agitado, se trata como
   soltar: los dados se lanzan igual que al levantar el ratón y nunca queda la tirada atascada.
6. Sonido de dados sintetizado (se puede silenciar) y vibración ligera en móvil.

### 4.3 Recuento (barra inferior)
- Una ficha por dado, en el orden del set, con **su color de cara y su valor** (legible, grande).
- **Σ suma** de los valores numéricos (activada por defecto, también en King of Tokyo, donde además se agrupan los números iguales).
- Valores **no numéricos agrupados** por apariencia idéntica (valor + colores): `2 × ☠ · 1 × 🛡`.
- Marcas: ✎ alterado · ↻ relanzado · anillo = seleccionado para relanzar.

### 4.4 Historial
- Al terminar cada tirada se guarda en el historial; la entrada se actualiza con relanzamientos y
  alteraciones hasta que empieza la siguiente tirada completa.
- Panel lateral **ocultable**. Cada entrada: hora, set, línea de resultados y, **debajo**, una línea
  por cada relanzamiento con los dados relanzados. Las alteraciones se ven como `4 → 6 ✎`.
- Se guarda en local (últimas 200 entradas). Se puede vaciar.

### 4.5 Menú contextual (clic derecho o pulsación larga, en el dado 3D **o** en su ficha del recuento)
- **Cambiar valor**: rejilla con todas las caras del dado. El dado 3D gira para mostrar la cara (o, si
  la cara no está en la ventana actual, se pinta en la cara superior). Se refleja en recuento e historial.
- **Seleccionar para relanzar** (también con un clic simple sobre el dado): los seleccionados se marcan
  y aparece **“Relanzar seleccionados (n)”**. Al relanzar, **solo** esos dados vuelven al cubilete; el
  resto queda **fijo** (no se mueven aunque les golpeen). El relanzamiento se añade al recuento y al
  historial bajo la tirada original.
- **Quitar de la mesa**: el dado desaparece de la partida y se pregunta
  “¿Guardar el set sin este dado?” → *Guardar en el set* / *Solo en esta partida*.

### 4.6 Añadir dados en partida
Botón **＋** en la mesa: selector de la biblioteca (con buscador) y atajo “Crear dado nuevo”.
Tras añadir se pregunta igual que al quitar: *Guardar en el set* / *Solo en esta partida*.

---

## 5. Guardado, compartir e importar

- Todo se guarda en el navegador (`localStorage`): biblioteca, sets, historial, idioma, sonido.
- **Compartir** un set genera una URL `…/#/import?d=<payload>` donde `payload` =
  `base64url(deflate(JSON))` con el set **y todos sus dados**. Botón copiar + Web Share API en móvil.
- Abrir la URL muestra la pantalla **Importar**: vista previa del set y sus dados.
  - Si un elemento es idéntico a uno local → se reutiliza sin preguntar.
  - Si hay **conflicto de nombre** (o mismo id con contenido distinto) → por cada elemento:
    **Sobrescribir** o **Renombrar** (propone “Nombre (2)”, editable).
  - Al renombrar dados, el set importado se reenlaza con los nuevos ids.
- Tamaño objetivo: set típico < 2 KB de URL.

---

## 6. Idiomas
- Español e inglés. Detección automática por `navigator.language`, conmutador ES/EN en cabecera.
- Los dados/sets predefinidos muestran el nombre en el idioma activo mientras el usuario no los renombre.

---

## 7. Aspecto
- Estética de juego de mesa: madera, fieltro, detalles dorados, tipografía display (Cinzel) +
  redondeada (Nunito). Tema oscuro cálido.
- Animaciones: dados que vuelan al cubilete, cubilete que se vuelca, fichas del recuento que “caen”,
  paneles con transiciones, brillo en dados seleccionados.
- Responsive (móvil vertical y escritorio). Accesible con teclado en la UI 2D.
- Créditos visibles de los iconos (game-icons.net, CC BY 3.0).

---

## 8. Criterios de aceptación
1. Un dado de 7 caras se dibuja como d6; en 70 000 tiradas simuladas cada cara sale 1/7 ± 1 %.
2. Un d4 lee el vértice superior y su valor aparece en las tres caras visibles.
3. Tras cualquier lanzamiento todos los dados quedan dentro del área visible.
4. La barra muestra la suma de números y los no numéricos agrupados por apariencia.
5. Relanzar seleccionados no mueve los dados no seleccionados y el historial muestra la tirada
   original y debajo el relanzamiento.
6. Cambiar un valor desde el menú actualiza dado 3D, recuento e historial.
7. Quitar/añadir un dado en partida pregunta si guardar el set.
8. Compartir → abrir URL en otro navegador → importar reproduce set y dados idénticos; con conflicto
   de nombre se ofrece sobrescribir o renombrar.
9. Toda la UI está disponible en ES y EN.
10. `npm run build` genera un sitio estático que funciona desde cualquier subruta (GitHub Pages).
