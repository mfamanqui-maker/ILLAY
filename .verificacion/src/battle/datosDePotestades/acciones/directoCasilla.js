/**
 * acciones/directoCasilla.js — Acciones que necesitan senalar una casilla.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE ES: el tercer tipo de input. Estas acciones no apuntan a nadie, apuntan
 * a suelo. Como una casilla se puede senalar sin saber nada del rival, se
 * envian como Final igual que las de directoEntidad.js.
 *
 * POR QUE ARCHIVO PROPIO: el spect 006 dejaba la pregunta abierta al final del
 * viejo directoEnemiga.js, donde `moverse` y `ponerTrampa` estaban rescatadas
 * sin sitio. Si el criterio de reparto es que informacion falta, hay cuatro
 * respuestas posibles —ninguna, una potestad, una casilla, la jugada del
 * rival— y por tanto cuatro archivos. Mezclar casilla y potestad obligaria a
 * las orbes a mirar dentro de la accion para saber que pedir.
 *
 * Firma: (objetivo, contexto) => void | Promise, con `objetivo` unas
 * coordenadas base 1 `{x, y}` (regla 4 del contrato).
 *
 * Rescatado de: familias/campesinos/lumel.js, familias/campesinos/brunn.js y
 * familias/realistas/soldado1.js (los tres borrados).
 */

import { moverEnTablero } from '../../administradorTablero/UtilsTablero.js';

// ─── RESCATE: lumel.js linea 124, brunn.js linea 117, soldado1.js linea 112. ─
// El original llamaba a `tablero.moverEntidad`, que movia el dato Y reubicaba
// el sprite. Aqui solo se mueve el dato: la parte visual la hace el show a
// partir del evento, porque una accion no conoce Phaser.

export function moverse(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  if (!moverEnTablero(lanzador, objetivo, contexto.tablero)) return;

  const origen = lanzador.datos.posicion;
  lanzador.datos.posicion = { x: objetivo.x, y: objetivo.y };
  contexto.eventos?.emit('potestadMovida', { idPotestad: lanzador.id, origen, destino: objetivo });
}

// ─── RESCATE: lumel.js linea 114. ────────────────────────────────────────────
// En el codigo viejo era un console.log: del original solo sobrevive el nombre
// y el hecho de que pide casilla. La trampa se deja marcada en la casilla y
// quien la dispara es el guion, no esta funcion: aqui no se sabe quien pasara
// por encima ni cuando.

export function ponerTrampa(objetivo, contexto) {
  const casilla = contexto.tablero?.[objetivo.y - 1]?.[objetivo.x - 1];
  if (!casilla) return;

  const lanzador = contexto.tarea.potestad;
  casilla.trampa = { idDueno: lanzador.id, dano: lanzador.estadisticas.dano };
  contexto.eventos?.emit('trampaColocada', { idPotestad: lanzador.id, posicion: objetivo });
}
