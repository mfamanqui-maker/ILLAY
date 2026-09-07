# Spect 008 — Finalidad

> **Contrato comun.** Estas diez reglas mandan sobre lo que diga este spect.
> Fuente canonica: [contrato.md](contrato.md).
>
> 1. Dos escenas y solo dos: `PhaserMaster` (mundo) y `generarInterfaz` (HUD). Todo lo demas recibe la escena por parametro.
> 2. Nadie busca a nadie: prohibidos `scene.get()` y `scene.settings.data`. Se inyecta, o se habla por el emisor de eventos de PhaserMaster.
> 3. Las escenas no se declaran en `main.js`; `vista.js` las anade con `game.scene.add()`.
> 4. El tablero es base 1 hacia afuera. Solo `UtilsTablero` indexa en base 0.
> 5. El azar se resuelve en el cliente dueno de la potestad al confirmar, **antes de enviar**, y el resultado viaja en el payload.
> 6. La configuracion serializable es `{ id, nombreDeAccion, objetivo, azar }`. Las acciones viajan por nombre, nunca como funcion.
> 7. PhaserMaster es dueno del estado, no del comportamiento: metodos de 15 lineas, archivo por debajo de 200.
> 8. `utilidadesDeSeleccion.js`: funciones puras, cero imports de Phaser.
> 9. `IndexDePotestades.js` no importa panel, orbes ni show.
> 10. Orden de fases por grupo de velocidad: cancelaciones, resolucion contra la foto, muertes, animacion. El guion no avanza hasta que el show termina.

---

## Objetivo

Cerrar la batalla: ensenar el resultado, resumir lo que paso y devolver al
jugador a donde le toque.

## El reparto

**PhaserMaster decide. `finalidad.js` pinta.**

Entra un resultado ya calculado y sale una escena estatica. Este archivo no
cuenta potestades vivas, no interpreta condiciones de victoria y no habla con
el servidor.

Es el mismo reparto que el historial (spect 001), y por el mismo motivo: la
batalla puede terminar de tres maneras distintas —todas las potestades de un
bando muertas, una rendicion, o una condicion del molde— y las tres tienen que
converger en un solo sitio antes de dibujar nada. Ese sitio es
`PhaserMaster._terminarBatalla()`.

## Archivos

```
frontend/src/battle/finalidad.js    esqueleto con rescate
```

## Contrato

```js
mostrarFinalidad(escenaHud, {
  resultado,   // 'victoria' | 'derrota' | 'empate'
  registro,    // el registroDeJugadas de PhaserMaster (spect 001)
  destino,     // molde.otros.destino[resultado]
  alSalir,     // callback que recibe destino
})
```

No es una escena (regla 1). Dibuja en el HUD.

`destino` sale del molde, rama `otros.destino[resultado]`, que ya existe en
`Molde001.json` con su `key`, `x` e `y`.

## Codigo rescatado

`controladorJugada.js` 676-709, adaptado: el overlay negro, el titulo y la
transicion al destino. Cambia que dibuja en la escena que se le pasa, y que ya
no para escenas por su nombre a mano.

Es literalmente un rectangulo negro y una palabra. Sirve como andamio, no como
resultado final.

## Lo que falta: el informe

El registro de jugadas contiene la batalla entera. Lo minimo que deberia salir
de ahi:

- turnos jugados
- dano hecho y recibido por bando
- potestades caidas de cada lado
- la accion mas usada
- cuantas acciones se cancelaron por escudo o retirada

Ese ultimo dato es el que mas le dice al jugador: le explica por que perdio.

Todo se calcula leyendo `registro`. `finalidad.js` no consulta el estado vivo
de la batalla, que para cuando esto se dibuja ya se esta desmontando.

## Las tres maneras de terminar

| Como | Quien lo detecta |
| --- | --- |
| un bando sin potestades vivas | `guionSincrono.evaluarFinBatalla` |
| rendicion | evento `'rendirse'` de `generarInterfaz` |
| condicion del molde (`otros.condicionesVictoria`) | PhaserMaster |

Las tres pasan por `PhaserMaster._terminarBatalla(resultado)`, que ademas manda
`Partida_Finalizada` al servidor (spect 010) y espera `Resultado_Partida`.

**En multijugador manda el servidor.** Si los dos clientes mandan resultados
incompatibles, el veredicto que se pinta es el de `Resultado_Partida`, no el
local. El local se usa solo para el modo historia, donde no hay servidor.

## Invariantes

- `finalidad.js` no calcula el resultado. Lo recibe.
- Solo lee el registro. No consulta el estado vivo de la batalla.
- Se dibuja una vez. Si `_terminarBatalla` se llama dos veces (rendicion y
  muerte simultanea), la segunda no hace nada.
- Al salir, las dos escenas de batalla se desmontan limpias: sin tweens vivos,
  sin listeners del socket, sin temporizadores.

## Decisiones ya tomadas

- PhaserMaster decide, finalidad pinta.
- El destino sale del molde, no esta escrito en el codigo. Un colaborador puede
  mandar al jugador a donde quiera sin tocar `battle/`.
- El informe se calcula del registro, no de contadores paralelos que habria que
  mantener sincronizados durante toda la partida.
- La escena es estatica. Nada de animar el resumen.

## Criterio de cierre

- Matar a todas las potestades enemigas ensena VICTORIA; perder las propias,
  DERROTA; caer los dos ultimos en el mismo grupo de velocidad, EMPATE.
- Rendirse ensena DERROTA sin esperar a que termine el turno.
- El informe cuadra con lo que se vio: los turnos, el dano y las bajas
  coinciden con el historial.
- Salir lleva a `molde.otros.destino[resultado]` con sus coordenadas.
- Tras salir, `game.scene` no tiene ni `PhaserMaster` ni `interfazBatalla`
  activas, y entrar a otra batalla funciona.
- Un empate por muerte simultanea dibuja **un** cartel, no dos.
