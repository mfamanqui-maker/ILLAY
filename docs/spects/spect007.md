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
> 7. PhaserMaster es dueno del estado, no del comportamiento: metodos de 15 lineas, archivo por debajo de 200.
> 8. `utilidadesDeSeleccion.js`: funciones puras, cero imports de Phaser.
> 9. `IndexDePotestades.js` no importa panel, orbes ni show.
> 10. Orden de fases por grupo de velocidad: cancelaciones, resolucion contra la foto, muertes, animacion. El guion no avanza hasta que el show termina.

---

## Objetivo

Ejecutar el turno: ordenar todas las acciones por velocidad, resolverlas por
grupos y ensenarlas. `guionSincrono` decide **que pasa**; `showAsincrono`
cuenta **como se ve**.

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
  guionSincrono.js    esqueleto con rescate
  showAsincrono.js    esqueleto con rescate
```

**Ya borrado:** `classes/battle/controladorJugada.js`. Sus 745 lineas se han
repartido entre este spect (orden, muertes, fin de batalla), 005 (interfaz
tipo 1) y 006 (pila y accionismo).

## Contrato de guionSincrono.js

| Funcion | Recibe | Devuelve |
| --- | --- | --- |
| `resolverVelocidad(tarea)` | tarea | numero |
| `agruparPorVelocidad(tareas)` | array de tareas | `[{velocidad, tareas}]`, mas rapido primero |
| `tomarFoto(potestades)` | potestades | copia de estadisticas |
| `aplicarCancelaciones(grupo, tipo1)` | grupo | grupo sin las tareas anuladas |
| `resolverGrupo(grupo, foto)` | grupo y foto | efectos a aplicar |
| `detectarMuertes(potestades)` | potestades | las que estan a 0 |
| `evaluarFinBatalla(vivosA, vivosE)` | dos numeros | `'victoria'`, `'derrota'`, `'empate'` o `null` |
| `ejecutarTurno(tareas, contexto)` | todo | `Promise` que resuelve al acabar el turno |

Las cuatro primeras marcadas como rescate ya estan escritas.

`ejecutarTurno` es el bucle. Por cada grupo, las cuatro fases, emitiendo
`'jugadaEjecutada'` por cada accion resuelta para que PhaserMaster la anote en
el registro (spect 001).

## Contrato de showAsincrono.js

| Funcion | Que hace |
| --- | --- |
| `crearContextoEjecucion(tarea, entorno)` | el segundo argumento de toda accion |
| `resolverParametroAccion(tarea)` | casilla u objetivo, segun la accion |
| `ejecutarAccion(tarea, entorno)` | llama a la funcion y espera si es promesa |
| `reproducirGrupo(acciones, entorno)` | `Promise` que resuelve al acabar el grupo |

`reproducirGrupo` usa `Promise.all` sobre las animaciones, **no** un `for` con
`await`: eso las pondria en fila y romperia la simultaneidad del grupo.

Aqui no se resta vida a nadie. Los numeros ya estan calculados cuando este
archivo empieza a trabajar.

## Codigo rescatado

| De donde | Que | Estado |
| --- | --- | --- |
| `controladorJugada.js` 55-63 | resolucion de velocidad | sirve tal cual |
| `controladorJugada.js` 65-81, 160-166 | agrupacion | adaptado: agrupa y ordena de una vez |
| `controladorJugada.js` 595-605 | deteccion de muertes | adaptado: recibe las listas |
| `controladorJugada.js` 657-673 | fin de batalla | adaptado |
| `controladorJugada.js` 260-280 | contexto de ejecucion | adaptado: la escena se inyecta |

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

- Dos potestades de la misma velocidad que se matan mutuamente mueren **las
  dos**, y las dos animaciones se ven.
- Barajar el array de tareas de entrada no cambia el resultado del turno.
- Un escudo puesto sobre una potestad amenazada cancela el ataque y el ataque
  no se anima.
- Con tres grupos de velocidad, el segundo no empieza hasta que el primero
  termina de animarse.
- Rendirse a mitad de turno no deja tweens vivos ni promesas sin resolver.
- `grep -c "Math.random" guionSincrono.js showAsincrono.js` da cero.
