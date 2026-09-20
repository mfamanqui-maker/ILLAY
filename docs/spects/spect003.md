# Spect 003 — Administrador de casillas

> **Contrato comun.** Estas diez reglas mandan sobre lo que diga este spect.
> Fuente canonica: [contrato.md](contrato.md).
>
> 1. Dos escenas y solo dos: `PhaserMaster` (mundo) y `generarInterfaz` (HUD). Todo lo demas recibe la escena por parametro.
> 2. Nadie busca a nadie: prohibidos `scene.get()` y `scene.settings.data`. Se inyecta, o se habla por el emisor de eventos de PhaserMaster.
> 3. Las escenas no se declaran en `main.js`; `vista.js` las anade con `game.scene.add()`.
> 4. El tablero es base 1 hacia afuera. Solo `UtilsTablero` indexa en base 0.
> 5. El azar se resuelve en el cliente dueno de la potestad al confirmar, **antes de enviar**, y el resultado viaja en el payload.
> 6. La configuracion serializable es `{ id, nombreDeAccion, objetivo, azar }`. Las acciones viajan por nombre, nunca como funcion.
> 7. PhaserMaster es dueno del estado, no del comportamiento: metodos de 15 lineas, archivo por debajo de 300.
> 8. `utilidadesDeSeleccion.js`: funciones puras, cero imports de Phaser.
> 9. `IndexDePotestades.js` no importa panel, orbes ni show.
> 10. Orden de fases por grupo de velocidad: cancelaciones, resolucion contra la foto, muertes, animacion. El guion no avanza hasta que el show termina.

---

## Objetivo

Convertir un molde en un tablero jugable: el array bidimensional que sostiene
la verdad de que hay en cada casilla, su dibujo en pantalla, y los atajos para
recorrerlo.

## Este spect es fundacional

Los otros nueve dependen de las coordenadas que fije este. Escribirlo mal
obliga a reescribir los demas, asi que la regla 4 del contrato no es
negociable ni siquiera "por comodidad interna".

## Archivos

**Crea** (ya existen como esqueleto, hay que completarlos):

```
frontend/src/battle/administradorTablero/
  AdministradorTablero.js
  UtilsTablero.js
  PotestadesTablero.js
  autotile/                 ya migrado, no se toca
```

**Ya borrados** (su codigo util esta dentro del esqueleto):
`classes/battle/tablero.js`, `scenes/battles/tableroScene.js`,
`classes/battle/familias/bases/phaserMoldFactory.js`, y la parte de
posicionamiento de `familias/bases/baseGeneral.js`.

## Contrato de cada archivo

### UtilsTablero.js

Funciones sueltas, sin estado. El unico modulo que sabe como esta indexado el
tablero por dentro.

| Funcion | Recibe | Devuelve |
| --- | --- | --- |
| `normalizarId(id)` | numero o texto | numero, o texto si no es numerico, o `null` |
| `obtenerIdEntidad(entidad)` | potestad o id suelto | id normalizado o `null` |
| `buscarPorId(id, tablero)` | id, array | `{x, y}` base 1, o `null` |
| `calcularDistancia(idA, idB, tablero)` | dos ids | distancia euclidea o `null` |
| `moverEnTablero(entidad, destino, tablero)` | destino base 1 | `true` si se movio |
| `calcularArea(centro, radio, tablero)` | centro base 1 | array de `{x, y}` base 1 |
| `calcularRayo(origen, direccion, alcance, tablero)` | origen base 1 | array de `{x, y}` base 1 |

Las cinco primeras estan rescatadas y funcionan. Las dos ultimas hay que
escribirlas desde cero; abajo esta por que.

### AdministradorTablero.js

Clase. `new AdministradorTablero(escena, eventos)`.

| Metodo | Que hace |
| --- | --- |
| `static precargar(escena)` | carga `bordesFrames.json` y el spritesheet `grass` |
| `construirDesdeMolde(molde)` | array bidimensional desde `configTablero` y `casillasEspeciales` |
| `dibujar(arrayTablero)` | crea los sprites de casilla y arranca el autotile |
| `registrarZoom()` / `registrarPaneo()` | camara |
| `registrarClicCasilla()` | detecta la casilla y **emite**, no decide |
| `resaltarCasilla(col, fila, ms)` | overlay que se desvanece |
| `quitarBrillo()` | limpia el overlay y su tween |
| `notificarCambioCasilla(col, fila)` | marca la region para el autotile |
| `destruir()` | para el actualizador de bordes y limpia |

Eventos que emite: `casillaPulsada`, `potestadPulsada`, `potestadDoblePulsada`.
Cada uno lleva `{ col, fila, casilla }` o `{ entidad, col, fila }`.

Forma de una casilla:

```js
{ id: 1, entidad: false, casillaPhaser: Sprite|null, bordePhaser: Sprite|null }
```

`id: 0` significa casilla inexistente: no se dibuja, no se puede pisar, no
cuenta para el rango.

### PotestadesTablero.js

El puente entre una potestad y su cuerpo en pantalla. Ya trae rescatadas
`precargarSpritesheet`, `registrarAnimaciones`, `crearSprite`,
`casillaAMundoCentro`, `ubicarEnCasilla` y `cancelarUbicacion`.

Falta la clase que instancia ambos bandos desde el molde, los coloca y
mantiene la correspondencia `id -> potestad -> sprite`. Sustituye a
`entidadScene.js`, que repetia el mismo `forEach` de copia de acciones seis
veces (habilidades, objetos y movimiento, por aliados y por enemigos). Una vez
generica, es un bucle.

## Codigo rescatado

Todo esta ya pegado en los tres archivos, marcado con su origen. Resumen:

| De donde | Que | Estado |
| --- | --- | --- |
| `tablero.js` 35-63, 114-121 | busqueda por id, normalizacion, distancia | sirve tal cual |
| `tablero.js` 80-112 | movimiento | rescatado a medias: la parte visual se fue a PotestadesTablero |
| `tableroScene.js` 50-88 | generacion de casillas y autotile | adaptado a `this.escena` |
| `tableroScene.js` 206-257 | zoom, pan, clic | adaptado; el clic ahora emite |
| `tableroScene.js` 260-327 | brillo de casilla y bordes | adaptado |
| `baseGeneral.js` 55-126 | ubicacion asincrona en casilla | adaptado |
| `phaserMoldFactory.js` | spritesheets, animaciones, sprites | sirve tal cual |

### Lo que hay que reescribir desde cero

`calcularArea` y `calcularRayo` (`tablero.js` 123-168) **no se rescatan**.
Estaban rotas de dos maneras distintas:

1. Restaban 1 a las coordenadas para pasar a base 0 y despues comparaban
   contra `< 1`, mezclando las dos bases en la misma funcion.
2. `calcularRayo` comparaba la distancia contra `cordenadasOrigen*Math.sqrt(2)`,
   multiplicando un **objeto** por un numero. Eso da `NaN` siempre, asi que la
   rama diagonal no se ejecuto nunca.

No conviene arreglarlas: conviene escribirlas otra vez respetando la regla 4.

## Invariantes

- Fuera de este archivo nadie escribe `array[y - 1][x - 1]`.
- `id: 0` es casilla inexistente. Ninguna funcion la devuelve como candidata.
- Una casilla tiene como maximo una potestad. `entidad` es `false` si esta
  vacia, nunca `null` ni `undefined`.
- `AdministradorTablero` no decide nada sobre potestades: detecta y emite.
- `dibujar()` puede llamarse una sola vez por batalla. Redibujar es
  `notificarCambioCasilla`.

## Decisiones ya tomadas

- El tablero deja de ser una escena. Era `tableroScene` y por eso el resto del
  sistema tenia que buscarlo con `scene.get()`: solo `Aliados.js` llamaba a
  `obtenerEscenaTablero()` dieciocho veces.
- El autotile se queda dentro de `administradorTablero/`. Funciona y nadie mas
  lo usa.
- La variante de hierba sigue usando `Phaser.Math.Between`. Es cosmetica y no
  viaja por red, asi que no la alcanza la regla 5.
- El `-80` de `casillaAMundoCentro` se conserva: es el ajuste para que el
  personaje se apoye en el suelo del tile.

## Criterio de cierre

- Un molde con casillas de `id: 0` se dibuja con los huecos donde toca y con
  los bordes correctos alrededor.
- Zoom y paneo funcionan y el brillo de casilla cae en la casilla pulsada con
  cualquier nivel de zoom.
- `buscarPorId` devuelve base 1 para cualquier potestad del molde.
- `calcularArea` con radio 1 sobre una casilla del borde devuelve solo casillas
  existentes, sin negativas y sin desbordar.
- `calcularRayo` en diagonal devuelve una lista no vacia. Con el codigo viejo
  devolvia vacio siempre; ese es el caso de prueba que importa.
- No aparece `scene.get` ni `settings.data` en ninguno de los tres archivos.
