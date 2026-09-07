# Spect 001 — Sistema de guardado de jugadas

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

Guardar todo lo que pasa en la batalla y dejar que el jugador lo consulte.

## El reparto

**Un registro, dos lectores.**

- El objeto registro lo **crea y actualiza PhaserMaster**, escuchando
  `'jugadaEjecutada'` del guion.
- `historial.js` solo **dibuja** el panel y lo administra para que el jugador
  lo pueda ver.
- `finalidad.js` lee el **mismo** registro para el informe de fin de batalla.

Por eso el guardado no puede vivir dentro del panel: `AGENTS.md` punto 15 pide
guardar las acciones para el informe, y eso tiene que ocurrir desde el turno 1
aunque nadie abra el panel en toda la partida.

## Archivos

```
frontend/src/battle/historial.js    esqueleto
```

El registro en si es un campo de `PhaserMaster` (`registroDeJugadas`), no un
archivo aparte.

## Forma del registro

Este spect fija la forma **porque `finalidad.js` tambien la va a leer**. Si
cambia despues, hay que tocar los dos.

```js
{
  turnos: [
    {
      numero: 1,
      grupos: [
        {
          velocidad: 25,
          jugadas: [ /* Jugada */ ]
        }
      ]
    }
  ]
}
```

Una jugada:

```js
{
  turno: 1,
  grupoVelocidad: 25,
  bando: 'Aliados',          // o 'Enemigos'
  idPotestad: 3,
  nombreAccion: 'atacar',
  idObjetivo: 7,             // o null
  efecto: { hp: -45 },       // lo que cambio
  cancelada: false           // true si un escudo o retirada la anulo
}
```

**Datos planos.** Ni sprites, ni potestades, ni funciones. El registro tiene
que sobrevivir a `JSON.stringify` para poder mandarse en el informe final. Es
la misma razon por la que las acciones viajan por nombre (regla 6).

Se guardan tambien las jugadas **canceladas**, marcadas. Que un escudo anulara
un ataque es informacion que el jugador quiere ver: es justo lo que le explica
por que el turno salio como salio.

## Contrato de historial.js

No es una escena (regla 1). Recibe la escena del HUD por parametro.

| Funcion | Recibe | Devuelve |
| --- | --- | --- |
| `abrirHistorial(escenaHud, registro, opciones)` | escena, registro | handle del panel |
| `cerrarHistorial(handle)` | handle | nada |
| `actualizarHistorial(handle, registro)` | handle, registro | nada |

`actualizarHistorial` existe para el refresco en caliente: si el panel esta
abierto durante la ejecucion de un turno, las jugadas van apareciendo.

## Codigo rescatado

Ninguno directo: el sistema viejo no guardaba nada.

Pero **la lista scrollable ya existe**:
`panelEntidad/partes/listaScrollable.js` y `panelEntidad/partes/filaItem.js`.
Estan escritas, funcionan y ya reciben la escena por parametro. Reutilizarlas
en vez de escribir otra lista.

## Invariantes

- El registro se actualiza siempre, se abra el panel o no.
- Es de solo lectura para todo el mundo menos PhaserMaster.
- Sobrevive a `JSON.stringify` y `JSON.parse` sin perder nada.
- Una jugada se anota **despues** de resolverse, con el efecto real aplicado, no
  con el previsto.
- Abrir o cerrar el panel no pausa la batalla ni altera el estado de la ronda.

## Decisiones ya tomadas

- El registro lo lleva PhaserMaster. El panel no guarda nada.
- Se agrupa por turno y dentro por grupo de velocidad, que es como el jugador
  vivio la batalla. Una lista plana de acciones no le dice nada.
- Las canceladas se guardan marcadas, no se descartan.
- El panel dibuja en el HUD.

## Criterio de cierre

- Tras cinco turnos, el registro tiene cinco entradas en `turnos`, con sus
  grupos en el mismo orden en que se ejecutaron.
- `JSON.parse(JSON.stringify(registro))` da un objeto identico.
- Abrir el historial a mitad de batalla ensena las jugadas de los dos bandos,
  y las canceladas se distinguen de las que surtieron efecto.
- Con el panel abierto durante un turno, las jugadas nuevas aparecen solas.
- Cerrar el panel y reabrirlo no duplica nada.
