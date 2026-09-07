# Spect 006 — Administrador de datos de potestades

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

Reunir en un solo sitio todo lo que una potestad es: sus estadisticas, sus
acciones y sus animaciones. Y dar a esos datos la forma que pide cada
consumidor.

## Este spect es fundacional

La regla 6 nace aqui. Si las acciones no se separan de las potestades, no hay
forma de mandarlas por red, y sin eso no hay multijugador. Todo lo que se
construya antes de resolver esto habra que rehacerlo.

## Archivos

**Crea** (ya existen como esqueleto):

```
frontend/src/battle/datosDePotestades/
  potestades/     campesino.js  realista.js  mago.js  intelectual.js  sectario.js
  acciones/       directo.js  directoEnemiga.js  directoConfig1.js
  IndexDePotestades.js
  utilidadesDeSeleccion.js
```

**Ya borrados:** toda la carpeta `classes/battle/familias/`. Incluye
`aliadoEspecifico.js` y `enemigoEspecifico.js` (registros gemelos),
`bases/baseCampesinos.js` y `bases/baseRealistas.js` (clases vacias cuyo unico
metodo devolvia `true`), y los tres archivos de personaje.

## El cambio central: la accion se separa de la potestad

En el codigo viejo la accion era esto, dentro de la clase del personaje:

```js
{
  nombre: "atacar",
  ejecución: (enemigoObjetivo) => { enemigoObjetivo.estadisticas.hp -= 25 + 10*n + ... },
  casoDeElección: 0,
  velocidad: 15 + (n-1),
}
```

Una closure sobre `n` y sobre `aliadoEspecifico`. Eso no cabe en un JSON, asi
que no se puede mandar por red. Y estaba escrita tres veces identica, una por
personaje.

Ahora la potestad declara **el nombre y los numeros**, y la funcion vive en
`acciones/`:

```js
{ nombre: 'atacar', rango: 2, velocidad: 15 + (n - 1), condicional: true, ruta: '...' }
```

Lo que viaja por red es `{ id, nombreDeAccion, objetivo, azar }` (regla 6).
`IndexDePotestades.normalizarConfiguracion` lo vuelve a convertir en tarea
ejecutable al llegar.

## Contrato de cada archivo

### potestades/&lt;familia&gt;.js

Una clase base de familia mas una clase por potestad, todas en el archivo de su
familia. Cada clase de potestad declara:

- `static arquetipo` — la clave con la que la busca el registro.
- `static spritesheet` — `{ clave, archivo, ancho, alto }`.
- `construirAnimaciones()` — array de definiciones para el AnimationManager.
- `obtenerConfigAnimacionEstatica()` — `{ plantillaSprite, animKey }`.

La familia aporta `calcularEstadisticas()` y `calcularAcciones()`, que la
potestad puede sobreescribir.

Al final del archivo, `export const POTESTADES_<FAMILIA> = [...]`. El registro
se construye solo a partir de esas listas: **anadir una potestad no debe
obligar a tocar `IndexDePotestades.js`**.

`campesino.js` y `realista.js` ya estan rescatados. `mago.js`,
`intelectual.js` y `sectario.js` estan vacios a proposito: el selector de
`system/characterSelectScene.js` ya ofrece esas tres familias, y sin el archivo
la opcion no se puede resolver.

### acciones/&lt;tipo&gt;.js

Funciones sueltas. Firma unica:

```js
(objetivo, contexto) => void | Promise
// contexto.tarea.potestad  quien la lanza
// contexto.tablero         el array bidimensional
// contexto.escena          la escena del mundo
// contexto.eventos         el emisor de PhaserMaster
```

**El archivo es la etiqueta.** En que archivo vive una accion es lo que le dice
al negociador de turno si hace falta abrir otra ronda. Por eso el tipo no se
declara a mano en cada accion; lo estampa `IndexDePotestades` al construir el
catalogo. Si se declarara a mano, alguien lo escribiria mal y el bucle de
rondas se quedaria esperando una respuesta que no llega.

- `directo.js` — no necesita nada. Se envia como `..._Final`.
- `directoEnemiga.js` — necesita un objetivo, que se pide al elegirla. Tambien
  `..._Final`.
- `directoConfig1.js` — necesita saber que hizo el rival. Obliga a
  `Enviar_Config_Acciones` (sin `_Final`) y a esperar respuesta.

### IndexDePotestades.js

Dos cosas y nada mas: el registro, y tres funciones de adaptacion.

| Exporta | Que hace |
| --- | --- |
| `REGISTRO_POR_ARQUETIPO` | mapa arquetipo → clase, construido desde las listas de familia |
| `resolverClase(datos)` | clase concreta, o error con el arquetipo que fallo |
| `crearRegistro(equipos)` | instancia los dos bandos; devuelve `porId`, `todos`, `porBando` |
| `normalizarConfiguracion(config, registro)` | el puente serializable: JSON plano → tareas |
| `adaptarParaPanel(potestad, bando)` | la forma que espera `abrirPanelEntidad` |
| `adaptarParaOrbes(potestad)` | las tres cadenas navegables con color y condicional |
| `adaptarParaGuion(tarea)` | velocidad mas funcion resuelta desde `acciones/` |

**El bando es un dato, no una clase.** Habia dos registros gemelos, identicos
salvo el nombre. En multijugador las potestades del rival son de las mismas
familias que las tuyas, asi que la distincion no daba informacion.

Regla 9: este archivo no importa `panelEntidad`, `sistemaDeOrbes` ni
`guionSincrono`. Expone los datos con la forma que piden; no los conoce.

### utilidadesDeSeleccion.js

Funciones puras. Regla 8: cero imports de Phaser. Ya rescatado casi entero de
`Aliados.js` 563-667.

`normalizarCasoSeleccion`, `normalizarBandosObjetivo`, `obtenerRangoAccion`,
`estaDentroDeRango`, `casillaEstaOcupada`, `candidatosPorBando`,
`candidatosCasilla`.

## Trabajo pendiente concreto

1. **Clasificar las acciones que no encajan.** `curar` apunta a un aliado y
   `atacar` a un enemigo: las dos necesitan lo mismo, un objetivo, pero el
   archivo se llama `directoEnemiga`. Y `moverse` y `ponerTrampa` piden una
   **casilla**, que no tiene archivo. Estan rescatadas en `directoEnemiga.js`
   bajo un bloque marcado, esperando la decision. Decidir si el criterio es
   "que informacion falta" (y entonces se parte en objetivo y casilla) o si se
   deja como esta.

2. **Completar `normalizarConfiguracion`.** El rescate busca la accion dentro
   de la potestad; hay que resolverla contra el catalogo de `acciones/` y
   propagar el campo `azar` de la regla 5.

3. **Escribir `adaptarParaOrbes` y `adaptarParaGuion`.** Solo esta hecha
   `adaptarParaPanel`.

4. **Resolver el azar.** Ninguna accion actual tira dados, pero el campo existe
   porque la regla 5 lo exige. Definir la forma de `azar` antes de que haga
   falta: cuando llegue la primera accion aleatoria, el protocolo ya tiene que
   aceptarla.

5. **Dos bugs heredados de `realista.js`,** marcados en el archivo: `curar`
   exige `curas > 0` con `curas` fijado a `0`, asi que no se podia usar nunca;
   y `dopar` condiciona sobre `stats.ulti`, que esa familia no define, con lo
   que la condicion valia `undefined`. Se han rescatado tal cual para no
   perder los numeros. Decidir que hacen.

## Invariantes

- Una accion nunca se guarda como funcion en la configuracion de turno. Solo
  su nombre.
- `condicional` se recalcula cada vez que cambian las estadisticas. Es un valor
  derivado, no un dato.
- Un arquetipo desconocido lanza error con el nombre que fallo. No devuelve
  `undefined` ni una clase por defecto: un error temprano y claro cuesta menos
  que una potestad invisible.
- Los ids son unicos entre los dos bandos, no por bando.
- `utilidadesDeSeleccion.js` no importa Phaser. Ni una vez.

## Decisiones ya tomadas

- Una clase por potestad, dentro del archivo de su familia. Ni un archivo por
  potestad ni una sola clase con todo.
- Las acciones se agrupan por el input que necesitan, no por su efecto.
- Colocar en casilla ya no es de la potestad: se fue a `PotestadesTablero`. En
  el codigo viejo vivia en `BaseGeneral`, y por eso cada clase de personaje
  arrastraba Phaser hasta la raiz de la jerarquia.
- La clave de inventario esta escrita `invetario` en los moldes. Se conserva:
  cambiarla rompe los moldes existentes sin ganar nada.

## Criterio de cierre

- Anadir una potestad nueva se hace tocando un solo archivo: el de su familia.
- Una configuracion `{ id, nombreDeAccion, objetivo, azar }` sobrevive a
  `JSON.stringify` y `JSON.parse` y sigue siendo ejecutable despues de
  `normalizarConfiguracion`.
- `atacar` esta escrita **una vez** para todo el juego, no una por personaje.
- `grep -c "import" utilidadesDeSeleccion.js` da cero.
- `grep -E "panelEntidad|sistemaDeOrbes|guionSincrono" IndexDePotestades.js` no
  encuentra nada.
