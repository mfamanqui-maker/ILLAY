# Spect 005 — Panel y orbes

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

Adaptar los dos sistemas mejor escritos del codigo viejo al arbol nuevo. Es un
spect de migracion, no de diseno: casi todo el codigo ya existe y funciona.

## Archivos

```
frontend/src/battle/
  panelEntidad/           ya migrado entero, incluye GenerarTexto/ y BarraVida/
  sistemaDeOrbes/
    orbes.js              rescate de Aliados.js, sin adaptar
    seleccionTipo1.js     rescate de la mecanica tipo 1 de controladorJugada
    index.js
```

## panelEntidad: casi nada que hacer

Unas 950 lineas que van practicamente intactas. Es lo mejor escrito del repo:
ya recibe la escena por parametro, asi que cumple la regla 1 sin tocarlo.

Ya hecho en la migracion:

- Movido de `scenes/battles/ui/PanelEntidad/` a `battle/panelEntidad/`.
- `GenerarTexto/` y `BarraVida/` absorbidos dentro. Solo los usaba el panel.
- Rutas de import de `../../GenerarTexto/` a `../GenerarTexto/`.
- Rutas de las descripciones JSON en `panelEntidadConfig.js`.

Lo que queda:

1. **Dibujar en el HUD.** El panel es interfaz: le toca `generarInterfaz`, no
   `PhaserMaster`. Se le pasa la escena del HUD.
2. **Consumir `adaptarParaPanel`.** `construirDatosDetalle` vivia en
   `Aliados.js` (el archivo de los aliados) y `Enemigos.js` lo importaba de
   ahi. Ahora esta en `IndexDePotestades.adaptarParaPanel` y devuelve lo mismo.
3. **Comprobar que las descripciones cargan** desde
   `src/battle/panelEntidad/descripciones/`.

No refactorizar el panel. Funciona.

## sistemaDeOrbes: aqui esta el trabajo

`Aliados.js` eran 1099 lineas que hacian tres cosas distintas. Ya se han
repartido:

| Que | A donde |
| --- | --- |
| menu radial, cadenas, flechas, marcado | `sistemaDeOrbes/orbes.js` |
| `_obtenerCandidatos*`, `_estaDentroDeRango`, `_normalizar*` | `datosDePotestades/utilidadesDeSeleccion.js` |
| `construirDatosDetalle`, `aItems` | `IndexDePotestades.adaptarParaPanel` |
| `iniciarAliado` | `administradorTablero/PotestadesTablero.js` |

`orbes.js` esta en el repo **sin adaptar**, con puentes de compatibilidad para
que el rescate no quede roto. Hay que quitarlos.

### 1. Las dieciocho llamadas

El original buscaba la escena del tablero con `scene.get('tablero')` y llamaba
a `obtenerEscenaTablero()` dieciocho veces. Ahora la escena se inyecta por
constructor y ese metodo devuelve `this.escena` como puente.

Sustituir las dieciocho por `this.escena` y borrar el metodo. Tambien quitar el
alias `this.sceneEntidad`, que el rescate sigue leyendo en tres sitios para
sacar las listas de vivos: eso pasa a ser el registro de `IndexDePotestades`.

### 2. La cadena de cinco saltos

El original, linea 670:

```js
this.obtenerEscenaTablero()?.scene?.settings?.data?.controlador?.controladorTurnos
```

Cinco saltos entre dos escenas para encontrar el controlador de turnos, y si
cualquiera fallaba la accion se perdia en silencio. Se sustituye por
`this.eventos.emit('accionElegida', tarea)`. Se ha dejado
`_obtenerControladorJugada()` en el archivo, reducido, como recordatorio.

### 3. Las delegaciones

`_normalizarCasoSeleccion`, `_normalizarBandosObjetivo`,
`_obtenerRangoAccion`, `_estaDentroDeRango` y `_casillaEstaOcupada` son ahora
metodos de una linea que llaman a `utilidadesDeSeleccion`. Borrarlos y llamar
directo a la funcion importada.

### 4. El nombre

La clase se llama `SistemaDeOrbes`. Revisar que no quede ningun `aliado` ni
`aliadoEspecifico` en nombres de campo: las orbes las usan las dos bandos.

## seleccionTipo1.js

Unas 250 lineas de tweens y particulas que estaban dentro de
`controladorJugada.js`, que es logica pura. Se han rescatado
`pausarAnimaciones`, `asegurarTexturaParticula`, `crearParpadeo`,
`crearTooltip` y `resumirAmenazas`.

Falta `mostrarSeleccionTipo1(escena, opciones) -> Promise<candidato|null>`, la
coreografia completa: filtro oscuro, parpadeo azul en los candidatos,
particulas rojas en los amenazados, tooltip con el resumen al pasar el cursor,
y espera al clic.

Dos cosas que arreglar respecto al original:

1. **Listener colgado.** El filtro se reposicionaba escuchando `'update'` de la
   escena, y ese listener solo se quitaba en el camino feliz. Si la batalla
   terminaba durante la seleccion, se quedaba.
2. **Promesa sin salida.** Si el jugador no pulsaba nada, no se resolvia nunca.
   Hace falta cancelar con Escape y resolver a `null`.

Lo que devuelva esta funcion alimenta la fase de cancelacion de la regla 10.

## Codigo rescatado

| De donde | Cuanto | Estado |
| --- | --- | --- |
| `ui/PanelEntidad/**` | ~950 lineas | migrado, casi intacto |
| `Aliados.js` menu de orbes | ~600 lineas | en `orbes.js`, sin adaptar |
| `controladorJugada.js` 288-555 | ~250 lineas | en `seleccionTipo1.js`, parcial |

## Invariantes

- Las orbes dibujan en el mundo (`PhaserMaster`); el panel dibuja en el HUD
  (`generarInterfaz`). No al reves.
- Elegir una accion emite un evento. No escribe en ninguna estructura ajena.
- Toda marca visual que se pone (tinte, alpha, tween) se quita al cancelar.
  El original ya llevaba `_restauradoresBrilloObjetivo` justamente por esto.
- Ni `orbes.js` ni `seleccionTipo1.js` importan `guionSincrono`. La seleccion
  produce datos; ejecutarlos es de otro.

## Decisiones ya tomadas

- El panel no se reescribe. Se mueve, se renombra y se conecta.
- El sistema de orbes se conserva entero. La navegacion por cadenas con
  teclado y flechas funciona y no hay motivo para rehacerla.
- La mecanica tipo 1 se parte en dos: la interfaz aqui, el efecto en
  `acciones/directoConfig1.js`.
- El puente `obtenerEscenaTablero()` es temporal y este spect lo borra.

## Criterio de cierre

- `grep -c "obtenerEscenaTablero" orbes.js` da cero.
- `grep -E "scene\.get|settings\.data" sistemaDeOrbes/` no encuentra nada.
- Seleccionar una potestad abre las tres orbes; pulsar una despliega su cadena;
  las flechas y el teclado navegan; Escape vuelve.
- Elegir una accion con objetivo marca los candidatos, y cancelar deja todos
  los sprites exactamente como estaban, sin tinte ni alpha residual.
- Doble clic en una potestad abre el panel con sus datos, para los dos bandos.
- Cerrar la batalla a mitad de una seleccion tipo 1 no deja listeners vivos.
