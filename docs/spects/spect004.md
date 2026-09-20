# Spect 004 — PhaserMaster

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

El coordinador de la batalla: monta el tablero, sostiene la data, reparte los
inputs, lleva el bucle de rondas contra el servidor, guarda el registro de
jugadas y decide cuando se acaba.

## Depende de

003 (tablero), 006 (datos) y 010 (protocolo). Se puede escribir en paralelo,
pero no se puede cerrar hasta que esos tres esten.

## Archivos

```
frontend/src/battle/
  vista.js          ya escrito, funcional
  PhaserMaster.js   esqueleto con las firmas
```

**Ya borrado:** `classes/battle/controladorBatalla.js` y la parte de
orquestacion de `classes/battle/controladorJugada.js`.

## El presupuesto de lineas es parte del spect

**Ningun metodo pasa de 15 lineas. El archivo entero no pasa de 300.**

No es una preferencia de estilo. `controladorJugada.js` llego a 745 lineas
porque cada vez que hacia falta coordinar algo se anadia aqui, y acabo
conteniendo el orden de turnos, la deteccion de muertes, las condiciones de
victoria, la interfaz de seleccion de habilidad tipo 1 con sus particulas, y el
cartel de fin de batalla. PhaserMaster ocupa el mismo hueco en la arquitectura
nueva y tiene la misma presion encima.

La regla operativa: **PhaserMaster es dueno del estado, no del
comportamiento.** Guarda datos y referencias; cada comportamiento no trivial es
una funcion importada que recibe lo que necesita y devuelve un resultado. Si un
metodo crece, no es suyo.

## Contrato de vista.js

```js
import { iniciarBatalla } from './battle/vista.js';
iniciarBatalla(game, molde);
```

Eso es todo lo que un colaborador tiene que saber. `vista.js` registra las dos
escenas con `game.scene.add()` y arranca `PhaserMaster` (regla 3). La guarda
contra clave repetida ya esta puesta: sin ella, volver al menu y entrar a una
segunda batalla lanza excepcion.

## Contrato de PhaserMaster.js

Estado que sostiene:

| Campo | Que es |
| --- | --- |
| `configuracion` | el molde recibido en `init()`. Fuente unica de verdad |
| `eventos` | el `EventEmitter` por el que habla todo el sistema (regla 2) |
| `registroDeJugadas` | lo que leen `historial.js` y `finalidad.js` |
| `estadoRonda` | `'seleccionando'`, `'esperandoRival'`, `'precombate'`, `'ejecutando'` |

Metodos, todos delegando:

| Metodo | Delega en |
| --- | --- |
| `_montarTablero()` | `AdministradorTablero` |
| `_montarPotestades()` | `PotestadesTablero` e `IndexDePotestades` |
| `_alConfirmarJugada()` | decide si abre otra ronda o cierra |
| `_enviarConfiguracion(config, esFinal)` | `coneccion.js` |
| `_recibirConfiguracionRival(config)` | `IndexDePotestades.normalizarConfiguracion` |
| `_ejecutarTurno()` | `guionSincrono` |
| `_anotarJugada(jugada)` | escribe en `registroDeJugadas` |
| `_terminarBatalla(resultado)` | `finalidad.js` |

## El bucle de rondas

Es el corazon del spect. Version en prosa:

1. El jugador reparte acciones entre sus potestades y pulsa Confirmar.
2. Si **ninguna** eligio algo de `acciones/directoConfig1.js`, se envia
   `Enviar_Config_Acciones_Final` y se espera.
3. Si **alguna** lo hizo, se envia `Enviar_Config_Acciones` (sin `_Final`) y se
   espera la del rival para poder decidir.
4. Al llegar la del rival se abre otra vuelta: solo las potestades que
   necesitaban esa informacion vuelven a pedir decision.
5. Se repite hasta que los dos jugadores han mandado su `_Final`.
6. Precombate: los dos tienen la configuracion completa. Se ejecuta.

**El punto que se malinterpreta.** Haber mandado `_Final` no significa dejar de
escuchar. Si un jugador termina y el otro sigue negociando, el que ya termino
le sigue respondiendo con la misma informacion, una y otra vez, hasta que el
otro tambien mande `_Final`. `_Final` describe **tu** configuracion, no el
estado de la sala.

## El azar (regla 5)

Cuando el jugador confirma una accion con componente aleatorio, el dado se tira
**ahi mismo, antes de enviar**, y el resultado viaja dentro del payload en el
campo `azar`. Durante la ejecucion del guion no se tira nada.

Si el azar se resolviera al ejecutar, cada cliente correria su propio
`Math.random` y las dos partidas divergirian desde el primer critico. Tirarlo
antes de enviar es lo que hace que los dos clientes procesen exactamente los
mismos numeros.

## Codigo rescatado

Ninguno. Lo que habia era el orquestador viejo y se descarta entero: mezclaba
todo lo que este spect separa. `vista.js` esta escrito de cero y ya funciona.

## Invariantes

- Dos escenas. Si aparece una tercera, algo se ha ido de sitio.
- Nadie llama a `scene.get()` dentro de `battle/`.
- El registro de jugadas se actualiza siempre, aunque el panel de historial no
  se abra nunca. `finalidad.js` lo necesita completo al terminar.
- `_terminarBatalla` se puede llamar mas de una vez (rendicion y muerte
  simultanea) y solo surte efecto la primera.
- El molde no se modifica durante la batalla. Es entrada, no estado.
- Un `_Final` propio no cierra la escucha del rival.

## Decisiones ya tomadas

- La red vive aqui, no en `generarInterfaz`. La interfaz emite eventos y ya.
- El registro de jugadas lo crea y lo actualiza PhaserMaster. `historial.js`
  solo dibuja.
- La finalidad la decide PhaserMaster. `finalidad.js` solo pinta.
- Dos escenas, no cinco. El sistema viejo tenia `vista`, `tablero`, `entidad` y
  `characterSelect` hablandose entre si; la cadena mas larga cruzaba cinco
  saltos entre dos escenas para encontrar el controlador de turnos.

## Criterio de cierre

- `iniciarBatalla(game, molde)` levanta una batalla completa sin que el
  colaborador toque `main.js`.
- Entrar a una batalla, volver al menu y entrar otra vez no lanza nada.
- Un turno en el que nadie usa acciones de tipo 1 se resuelve en **una** vuelta
  de red.
- Un turno en el que una potestad usa `escudar` se resuelve en dos, y el
  jugador que ya habia mandado `_Final` responde a la segunda peticion sin
  volver a pedirle nada al usuario.
- `wc -l PhaserMaster.js` da menos de 300.
- Ningun metodo del archivo pasa de 15 lineas.
