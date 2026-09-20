# Spect 007 — Guion y show

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

Ejecutar el turno: ordenar todas las acciones por velocidad, resolverlas por
grupos y ensenarlas. `guionSincrono` decide **que pasa**; `showAsincrono`
cuenta **como se ve**.

## Fases de entrega

Este spect se cierra en dos fases.

### Fase 1 — red + mapa de guion (hecha)

Pipeline: confirmar → negociar/espejo → precombate → mapa por velocidad.
En fase 1 el log podia ir con `accionPasiva`/`animacion` null.

### Fase 2 (esta entrega) — lectura, show y bucles

1. PhaserMaster llama `prepararTareasDeTurno` (Index): `ejecutar` + animacion activa.
2. `ejecutarTurno` agrupa por velocidad y por cada grupo aplica la regla 10.
3. Activos que devuelven `efectoPasivo` se apilan en `pilaPasivas`.
4. `verificar(momento, ctx)` aplica pasivas cuya `condicion` cumpla y las retira.
5. Al terminar la pila principal del turno, `pila.limpiar()`.
6. `reproducirGrupo` hace `Promise.all` de anims activas + pasivas del grupo.

**Criterio de cierre fase 2**

- Dos potestades de la misma velocidad que se matan mutuamente: ambas actuan;
  ambas animaciones se ven.
- Escudo (`alRecibirProyectil`) cancela el ataque: no se anima el golpe.
- Con tres grupos de velocidad, el segundo no empieza hasta que el primero
  termina de animarse.
- `grep -c "Math.random" guionSincrono.js showAsincrono.js` da cero.
- Guion no importa Index (regla 9); el enriquecimiento lo hace PhaserMaster.

## La regla 10 es este spect

Cada grupo de misma velocidad se resuelve en este orden y en ningun otro:

```
1. CANCELACIONES   escudos y retiradas retiran acciones del grupo
2. RESOLUCION      se calcula TODO contra la foto tomada al inicio del grupo,
                   y despues se aplica de golpe
3. MUERTES         ahora si se retiran las potestades a 0 HP
4. ANIMACION       showAsincrono reproduce el grupo entero en paralelo
```



### Por que la foto

Dos potestades de la misma velocidad se atacan y una muere. ¿Se resuelve el
ataque de la muerta?

Si se aplicara el dano una por una, la respuesta dependeria del orden dentro
del array, y ese orden es arbitrario: sale de como llegaron las
configuraciones por red. La misma jugada daria resultados distintos en cada
cliente.

Con la foto no hay ambiguedad. Misma velocidad significa a la vez: las dos
mueren, las dos pegan. Se calcula todo contra el estado del inicio del grupo y
se aplica despues.

Es lo mismo que hace la regla 5 con el azar, por el mismo motivo: quitarle al
resultado toda dependencia de cosas que los dos clientes no comparten.

### Por que las muertes van despues de resolver

Si se comprobaran antes, la potestad que muere en el paso 2 seguiria en el
tablero durante su propio ataque. Si se comprobaran durante, volveria el
problema del orden. Van al final del grupo, una vez.

### Por que la animacion va en paralelo dentro del grupo y en serie entre grupos

Las acciones de la misma velocidad ocurren a la vez, asi que se ven a la vez.
Pero el jugador tiene que entender por que el grupo siguiente se ejecuta o no,
y para eso necesita haber visto terminar el anterior.

## Archivos

```
frontend/src/battle/
  guionSincrono.js       activos + bucle regla 10
  showAsincrono.js       reproducirGrupo (activas + pasivas)
  pilaPasivas.js         apilar / verificar / limpiar
  utilsEjecucion.js      resultado de grupo guion ↔ show
  IndexDePotestades.js   prepararTareasDeTurno (borde)
  PhaserMaster.js        enriquece y dispara ejecutarTurno
  negociadorDeRonda.js   espejo POV + bucle config
  coneccion.js           transporte WebSocket
```

**Ya borrado:** `classes/battle/controladorJugada.js`. Sus 745 lineas se han
repartido entre este spect (orden, muertes, fin de batalla), 005 (interfaz
tipo 1) y 006 (pila y accionismo).

## Contrato de guionSincrono.js

estructura del guion:

se genera un mapa con las velocidades como claves y como valores un array de tareas.
cada tarea enriquecida trae (ademas de la forma serializable):

- potestad: object (instancia viva)
- ejecutar: function (efecto activo)
- animacion / reproducir: function (anim activa del lanzador)
- accionPasiva: null | { momento, condicion, aplicar } (tras resolver el activo)
- anulada: boolean


| Funcion                              | Recibe                     | Devuelve                                       | Fase |
| ------------------------------------ | -------------------------- | ---------------------------------------------- | ---- |
| `construirMapaGuion(filas, registro)`| configs + registro         | `Map<velocidad, tarea[]>`                      | 1    |
| `loguearMapaGuion(mapa)`            | el mapa                   | void (console)                                 | 1    |
| `resolverVelocidad(tarea)`           | tarea                      | numero                                         | 1    |
| `agruparPorVelocidad(tareas)`        | array de tareas            | `[{velocidad, tareas}]`, mas rapido primero    | 1    |
| `tomarFoto(potestades)`              | potestades                 | copia de estadisticas                          | 2    |
| `aplicarCancelaciones(grupo, pila)`  | grupo + pila               | grupo con `anulada`                            | 2    |
| `resolverGrupo(grupo, foto, ent)`    | grupo, foto, entorno       | resultado de grupo (utilsEjecucion)            | 2    |
| `detectarMuertes(potestades)`        | potestades                 | las que estan a 0                              | 1    |
| `evaluarFinBatalla(vivosA, vivosE)`  | dos numeros                | `'victoria'`, `'derrota'`, `'empate'` o `null` | 1    |
| `ejecutarTurno(tareas, contexto)`    | todo                       | `Promise<{ fin }>`                             | 2    |

### Contrato de pilaPasivas.js

| Metodo | Que hace |
| --- | --- |
| `apilar(efectoPasivo)` | guarda `{ momento, condicion, aplicar }` |
| `verificar(momento, ctx)` | aplica las que cumplan; las retira; las devuelve |
| `limpiar()` | vacia la pila (fin de turno) |

Momentos: `alRecibirProyectil`, `alRecibirDano`, `alMoverseACasilla`, `alHacerAccion`.

`ejecutarTurno` es el bucle. Por cada grupo, las cuatro fases, emitiendo
`'jugadaEjecutada'` por cada accion resuelta para que PhaserMaster la anote en
el registro (spect 001).

## Contrato de showAsincrono.js


| Funcion                                  | Que hace                                  |
| ---------------------------------------- | ----------------------------------------- |
| `crearContextoEjecucion(tarea, entorno)` | el segundo argumento de toda accion       |
| `resolverParametroAccion(tarea)`         | casilla u objetivo, segun la accion       |
| `ejecutarAccion(tarea, entorno)`         | llama a la funcion y espera si es promesa |
| `reproducirGrupo(resultado, entorno)`    | `Promise.all` activas + pasivas del grupo |


`reproducirGrupo` usa `Promise.all` sobre las animaciones, **no** un `for` con
`await`: eso las pondria en fila y romperia la simultaneidad del grupo.

Aqui no se resta vida a nadie. Los numeros ya estan calculados cuando este
archivo empieza a trabajar.

### Contrato de utilsEjecucion.js

Resultado de grupo: `{ tareas, animacionesActivas, animacionesPasivas, anuladas }`.
Helpers: `entradaAnimActiva`, `entradaAnimPasiva`, `fusionarAnimsParaShow`,
`claveAnimPasiva`.

## Codigo rescatado


| De donde                              | Que                     | Estado                               |
| ------------------------------------- | ----------------------- | ------------------------------------ |
| `controladorJugada.js` 55-63          | resolucion de velocidad | sirve tal cual                       |
| `controladorJugada.js` 65-81, 160-166 | agrupacion              | adaptado: agrupa y ordena de una vez |
| `controladorJugada.js` 595-605        | deteccion de muertes    | adaptado: recibe las listas          |
| `controladorJugada.js` 657-673        | fin de batalla          | adaptado                             |
| `controladorJugada.js` 260-280        | contexto de ejecucion   | adaptado: la escena se inyecta       |


El original guardaba `Map<velocidad, tarea[]>` y despues lo recorria al reves
con `toReversed()`. El rescate agrupa y devuelve ya ordenado.

## Invariantes

- El orden de las cuatro fases no cambia nunca.
- Dentro de un grupo, el orden del array **no** afecta al resultado. Es la
prueba de que la foto se esta usando bien.
- El guion no dibuja. El show no calcula.
- `guionSincrono` no avanza al grupo siguiente hasta que `showAsincrono`
resuelve su promesa.
- Nadie llama a `Math.random` en estos dos archivos. El azar llega resuelto
dentro de la tarea (regla 5).
- Si la batalla termina a mitad de turno, los grupos que quedan no se ejecutan,
pero el grupo en curso termina su animacion.



## Decisiones ya tomadas

- Dos archivos, no uno. La division es de responsabilidad, no de tiempo.
- Las muertes se comprueban una vez por grupo, no por accion.
- El fin de batalla lo **detecta** el guion y lo **decide** PhaserMaster:
`evaluarFinBatalla` devuelve un resultado, no llama a `finalidad.js`.
- Mas rapido primero. `velocidad` alta significa que actua antes.



## Criterio de cierre

**Fase 1** — mapa por velocidad tras negociar (hecha).

**Fase 2**

- Dos potestades de la misma velocidad que se matan mutuamente mueren **las
dos**, y las dos animaciones se ven.
- Barajar el array de tareas de entrada no cambia el resultado del turno
  (misma foto / mismas cancelaciones).
- Un escudo puesto sobre una potestad amenazada cancela el ataque y el ataque
no se anima.
- Con tres grupos de velocidad, el segundo no empieza hasta que el primero
termina de animarse.
- Rendirse a mitad de turno no deja tweens vivos ni promesas sin resolver.
- `grep -c "Math.random" guionSincrono.js showAsincrono.js` da cero.
- Al fin de `ejecutarTurno` la pila de pasivas queda vacia.

