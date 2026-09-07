# Spect 010 — Protocolo de red

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

Implementar el protocolo que describe `AGENTS.md`. Hoy no existe: el servidor
solo empareja, y el rival de las pruebas era un JSON escrito a mano.

## Archivos

```
frontend/src/battle/coneccion.js
backend/server.js
```

## Estado actual, sin adornos

El servidor entiende **un** mensaje, `join_room`, y responde **uno**,
`room_created`. Eso empareja a dos jugadores y les da el equipo del contrario.
Nada mas. Ninguno de los mensajes de configuracion de acciones existe.

Los nombres se inventaron sobre la marcha y no coinciden con `AGENTS.md`.

## Los mensajes que hay que implementar

| Mensaje | Direccion | Cuando |
| --- | --- | --- |
| `Buscar_Partida` | cliente → servidor | el jugador confirma su equipo |
| `Partida_Encontrada` | servidor → cliente | hay dos en cola; lleva el equipo del rival |
| `Partida_No_Encontrada` | servidor → cliente | se agoto el tiempo de busqueda |
| `Enviar_Config_Acciones` | cliente → servidor | he elegido, pero **necesito** saber que hizo el rival |
| `Recibir_Config_Acciones` | servidor → cliente | lo que eligio el rival, que aun negocia |
| `Enviar_Config_Acciones_Final` | cliente → servidor | he elegido y **no** necesito nada mas |
| `Recibir_Config_Acciones_Final` | servidor → cliente | el rival ya cerro su configuracion |
| `Partida_Finalizada` | cliente → servidor | he ganado, he perdido o me rindo |
| `Resultado_Partida` | servidor → cliente | el veredicto |

`Partida_No_Encontrada` no tiene hoy quien lo dispare: hay que anadir el
temporizador de cola.

## Cierre de la fase de seleccion

**La fase se cierra cuando los dos jugadores han mandado su `_Final`.** Ese es
el momento en que los dos tienen la configuracion completa que necesita
`guionSincrono`, y el servidor puede dar la seleccion por terminada.

**El punto que se malinterpreta.** Haber mandado `_Final` no significa dejar de
responder. Si un jugador termina y el otro sigue negociando, el que ya termino
le sigue mandando la misma informacion, una y otra vez, hasta que el otro
tambien mande `_Final`. `_Final` describe **tu** configuracion, no el estado de
la sala.

Sin esto, la partida se cuelga: el que aun negocia espera un
`Recibir_Config_Acciones` que nunca llega porque el otro ya "termino".

Estado que la sala tiene que llevar por ronda:

```js
{
  ronda: 1,
  configuraciones: { jugadorA: {...}, jugadorB: {...} },
  finalizado:      { jugadorA: false, jugadorB: true }
}
```

Cuando los dos `finalizado` son `true`, la fase se cierra y empieza el
precombate. Entonces se resetea para la ronda siguiente.

## Forma del payload

Regla 6. Una configuracion es un array de:

```js
{ id: 3, nombreDeAccion: 'atacar', objetivo: 7, azar: null }
```

`azar` lleva el resultado **ya resuelto** (regla 5): lo tira el cliente dueno
de la potestad antes de enviar. El servidor no genera numeros aleatorios ni
valida reglas de juego: reenvia.

## Los cuatro defectos concretos a arreglar

### 1. Fuga de listeners en `esperar()`

`Glosario.md` ya la denuncia. En el codigo:

```js
socket.addEventListener('message', onMessage);   // se anade siempre
if (data.type === type) {
    socket.removeEventListener('message', onMessage);   // solo se quita aqui
    resolve(data.data);
}
} catch (error) {
    reject(error);        // reject SIN quitar el listener
}
```

Dos caminos lo dejan colgado: un mensaje que no parsea, y una promesa que no
se cumple nunca. Ahora mismo `esperar()` se llama dos veces por partida y no
se nota. En un bucle que la llama una vez por ronda, se acumula durante toda
la partida.

Arreglo: quitar el listener en los tres caminos, y anadir tiempo de espera
maximo para que la promesa no pueda quedarse abierta.

### 2. `enviarMensaje()` sin guarda

```js
if (socket.readyState === WebSocket.OPEN)
```

`socket` empieza en `null`. Llamar a `enviarMensaje` antes de `coneccion()`
lanza un `TypeError` en vez del error claro que deberia dar.

### 3. Las salas no se limpian

`rooms.set(room.id, room)` y nunca `delete`. Cuando un socket de una sala se
desconecta, la sala se queda en memoria con un miembro muerto. El bucle
`ws.on('close')` solo limpia la cola, no las salas.

### 4. Un desconectado a mitad de partida no se detecta

Si un jugador cierra la pestana durante la seleccion, el otro se queda
esperando un `Recibir_Config_Acciones` que no va a llegar. Hace falta que la
desconexion cierre la partida con `Resultado_Partida` para el que queda.

## Invariantes

- El servidor reenvia; no arbitra. No conoce las reglas del juego, no valida
  acciones y no genera azar.
- Todo mensaje es `{ type, data }`. Sin excepciones.
- El nombre del tipo es exactamente el de `AGENTS.md`, con sus guiones bajos.
- Un `_Final` propio no cierra la escucha del rival.
- `esperar()` siempre termina: o resuelve, o rechaza por tiempo. Nunca se queda
  abierta.
- El socket es un singleton de modulo, compartido entre el emparejamiento y la
  batalla. Es la misma sesion.

## Decisiones ya tomadas

- `ws`, no Socket.io. `AGENTS.md` menciona Socket.io por error; el repo entero
  usa `ws` y asi se queda.
- `coneccion.js` vive dentro de `battle/`, no en `system/`. El sistema trae su
  propia conexion para poder copiarse de una pieza.
- El azar se resuelve antes de enviar (regla 5). El servidor nunca tira dados.
- La IA queda fuera de esta rama. Pero el negociador de PhaserMaster recibe el
  transporte inyectado, asi que sustituir el WebSocket por una IA local no
  deberia tocar nada mas.

## Criterio de cierre

- Dos navegadores se emparejan con `Buscar_Partida` y reciben
  `Partida_Encontrada` con el equipo del contrario.
- Un turno sin acciones de tipo 1 se resuelve con un `_Final` por lado y una
  sola vuelta.
- Un turno donde A usa `escudar` y B no: A manda `Enviar_Config_Acciones`, B
  manda `_Final`, A recibe `Recibir_Config_Acciones_Final`, A decide y manda su
  `_Final`. La partida sigue.
- Un turno donde los dos usan tipo 1 se resuelve en dos vueltas sin colgarse.
- Cerrar una pestana a mitad de seleccion hace que el otro reciba
  `Resultado_Partida` en vez de quedarse esperando.
- Cien rondas seguidas no aumentan el numero de listeners del socket.
- Al terminar una partida, `rooms` vuelve a estar vacio.
