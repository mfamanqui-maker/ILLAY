/**
 * acciones/directoEnemiga.js — Acciones que necesitan un objetivo.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE SERA: el catalogo de acciones que no se pueden lanzar sin que el jugador
 * senale a alguien. Se piden en el momento de elegirlas y despues se envian
 * como Final: no hace falta saber nada del rival.
 *
 * Firma: (objetivo, contexto) => void | Promise
 *
 * Rescatado de: familias/campesinos/lumel.js, familias/campesinos/brunn.js y
 * familias/realistas/soldado1.js (los tres borrados).
 *
 * ESTADO: esqueleto con rescate. Revisar contra el spect 006.
 */

// ─── RESCATE: lumel.js linea 75, brunn.js linea 68, soldado1.js linea 66. ────
// Tres copias identicas en el codigo viejo, una por personaje.

export function atacar(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  const n = lanzador.datos.nivel;
  objetivo.estadisticas.hp -= 25 + 10 * n + lanzador.estadisticas.ataque;
}

// ─── RESCATE: lumel.js linea 53, brunn.js linea 47, soldado1.js linea 45. ────

export function curar(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  const n = lanzador.datos.nivel;
  objetivo.estadisticas.hp += 25 + 10 * n;
  lanzador.estadisticas.curas -= 1;
}

// ─── DECISION ABIERTA PARA EL SPECT 006 ──────────────────────────────────────
//
// El nombre del archivo dice "enemiga", pero `curar` apunta a un aliado y
// `atacar` a un enemigo: las dos necesitan lo mismo, un objetivo. Ademas hay
// un tercer caso que no tiene archivo todavia, las acciones que piden una
// CASILLA en vez de una potestad. Estas dos estan rescatadas aqui a la espera
// de la decision, porque no tienen sitio propio:
//
//   moverse(coordenadas, contexto)
//     De lumel.js linea 124, brunn.js linea 117, soldado1.js linea 112.
//     Llamaba a tablero.moverEntidad; ahora seria UtilsTablero.moverEnTablero
//     mas la reubicacion visual de PotestadesTablero.
//
//   ponerTrampa(coordenadas, contexto)
//     De lumel.js linea 114. En el codigo viejo era un console.log: no hay
//     nada que rescatar mas alla del nombre y de que pide casilla.
//
// El spect 006 decide si el criterio de los archivos es "que informacion falta"
// (y entonces esto se parte en objetivo y casilla) o si se queda como esta.
