# Spect 002 — Interfaz de combate

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

La escena del HUD: los botones de control de la batalla, fijos a camara, por
encima del mundo.

## La linea que este spect no cruza

**`generarInterfaz.js` no toca la red.** Los botones emiten eventos y ahi se
acaba su trabajo. El bucle de rondas y el envio al servidor son de
PhaserMaster (spect 004).

No es purismo. En el sistema viejo la logica de turnos importaba
`obtenerConfiguracionManual()` desde `ui/Entidades/`: la maquina de estados del
turno vivia dentro de la capa de presentacion. La consecuencia practica es que
no se podia cambiar un boton sin arriesgarse a romper el protocolo, ni probar
el protocolo sin levantar la interfaz.

Confirmar es especialmente tentador, porque parece que el que confirma deberia
enviar. No: confirmar emite `'confirmar'`, y PhaserMaster decide si eso
significa abrir otra ronda o pasar a precombate. Esa decision depende de que
acciones se eligieron, que es informacion que la interfaz no tiene ni deberia
tener.

## Archivos

```
frontend/src/battle/generarInterfaz.js    esqueleto
```

## Contrato

Clase `GenerarInterfaz extends Phaser.Scene`, clave `'interfazBatalla'`. Es la
segunda y ultima escena (regla 1).

Recibe en `init()` el emisor de eventos de PhaserMaster.

Botones: **confirmar, rendirse, pausa, historial, ignorar interfaz**.

Eventos que emite:

| Evento | Cuando |
| --- | --- |
| `'confirmar'` | el jugador cierra su seleccion del turno |
| `'rendirse'` | tras confirmacion, porque no tiene vuelta atras |
| `'pausa'` | alternar pausa |
| `'historial'` | abrir o cerrar el panel de jugadas (spect 001) |
| `'ignorarInterfaz'` | ocultar el HUD sin desmontarlo, para ver el tablero |

Metodo `actualizarPorFase(estadoRonda)`: los botones no estan activos en todas
las fases. Durante `'ejecutando'` solo deben responder pausa y rendirse;
confirmar no tiene sentido mientras se resuelve el turno, y dejarlo pulsable
manda un evento que PhaserMaster tiene que descartar.

Estados posibles: `'seleccionando'`, `'esperandoRival'`, `'precombate'`,
`'ejecutando'`.

## Quien mas dibuja aqui

El HUD es tambien el lienzo de tres cosas que no son escenas y reciben esta
escena por parametro:

- `panelEntidad/` — documentacion de la potestad (spect 005)
- `historial.js` — panel de jugadas (spect 001)
- `finalidad.js` — cartel de resultado (spect 008)

Las **orbes no**. Esas dibujan en el mundo, porque siguen al sprite de la
potestad y tienen que moverse con el zoom y el paneo del tablero.

## Codigo rescatado

Ninguno. El sistema viejo no tenia interfaz de combate: no habia boton de
confirmar, ni de rendirse, ni de historial. El turno se cerraba solo.

Se puede reutilizar el estilo visual de `panelEntidad/partes/cajaMarron.js`
(`crearBotonMarron`) para que los botones no desentonen con el panel.

## Invariantes

- Cero llamadas a `coneccion.js` desde este archivo.
- Cero logica de juego. La interfaz no sabe que es una potestad ni que es una
  velocidad.
- Todo elemento va con `setScrollFactor(0)`. El HUD no se mueve con la camara
  del mundo.
- Ignorar interfaz **oculta**, no destruye. Volver a pulsarlo la trae intacta.
- Rendirse pide confirmacion. Es el unico boton que termina la partida.

## Decisiones ya tomadas

- Dos escenas, y esta es la segunda. Nada de una escena por panel.
- Los botones emiten; no ejecutan.
- El estado de la ronda lo dicta PhaserMaster; la interfaz solo reacciona.
- El panel de entidad y el historial dibujan aqui, pero son de otros spects.

## Criterio de cierre

- `grep -E "coneccion|WebSocket|enviarMensaje" generarInterfaz.js` no encuentra
  nada.
- `grep -E "scene\.get|settings\.data" generarInterfaz.js` no encuentra nada.
- Los cinco botones responden y cada uno emite su evento una sola vez por
  pulsacion.
- Durante `'ejecutando'`, confirmar esta deshabilitado y visiblemente apagado.
- Ignorar interfaz oculta el HUD, el tablero sigue jugable, y volver a
  pulsarlo devuelve los botones con el mismo estado que tenian.
- Con zoom del tablero al maximo y al minimo, el HUD no cambia de tamano ni de
  sitio.
