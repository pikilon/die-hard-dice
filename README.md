# 🎲 Die Hard Dice

Web app estática para **crear dados personalizados en 3D**, agruparlos en **sets**, **lanzarlos con física**
desde un cubilete y **compartirlos por URL**. Sin backend: todo se guarda en el navegador. ES / EN.

> Especificación (SDD): [`specs/001-die-hard-dice`](specs/001-die-hard-dice/spec.md) ·
> [plan técnico](specs/001-die-hard-dice/plan.md) · [modelo de datos](specs/001-die-hard-dice/data-model.md)

## Funcionalidades

- **Dados**: color, material (plástico, mármol, metal, madera, cristal, piedra), nº de caras ilimitado,
  numeración (inicio/paso), **intervalos** de caras con las mismas propiedades y personalización cara a cara
  (texto de 1-3 caracteres, emoji o icono de [game-icons.net](https://game-icons.net)).
- **Caras “imposibles”** (3, 5, 7, 13…, >20): se dibujan con el mayor sólido que cabe y en cada tirada se
  pinta al azar un subconjunto de caras → cada cara conserva probabilidad exacta `1/N`.
- **Sets** con fondo (presets SVG, URL o imagen subida), opciones de recuento, clonar, compartir.
- **Juego**: cubilete 3D que se agita arrastrando o con el acelerómetro, vuelco con física (Rapier),
  paredes ajustadas a la pantalla, recuento (Σ + agrupación), historial con relanzamientos, menú contextual
  (cambiar valor, seleccionar para relanzar, quitar), añadir dados en partida, sonido sintetizado.
- **Compartir**: `#/import?d=…` (deflate + base64url) con resolución de conflictos (sobrescribir / renombrar).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests de lógica (Vitest)
npm run build      # sitio estático en dist/
```

`scripts/build-icons.mjs` genera los iconos (se ejecuta solo antes de `dev`, `build` y `test`).

## Stack

Vite · React 19 · TypeScript · three.js + @react-three/fiber/drei · @react-three/rapier · Zustand · motion ·
wouter (hash routing) · fflate.

```
src/
  model/   tipos y lógica pura (caras, sólidos, ventanas aleatorias, recuento, colores)
  three/   geometrías con chaflán, atlas de caras en canvas, materiales, miniaturas, iconos
  game/    escena física, cubilete, director de tiradas, entrada (puntero/acelerómetro), sonido
  pages/   Sets, Biblioteca, Editor de dado, Editor de set, Juego, Importar
  share/   codec de URL y plan de importación
```

## Despliegue

El workflow `.github/workflows/deploy.yml` publica en GitHub Pages en cada push a `sdd`
(activar *Settings → Pages → Source: GitHub Actions*). El build usa rutas relativas, así que funciona en
cualquier subruta.

## Créditos

Iconos de [game-icons.net](https://game-icons.net) (Lorc, Delapouite y colaboradores) bajo
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). King of Tokyo y HeroQuest son marcas de sus
respectivos propietarios; se usan solo como referencia para dados caseros.
