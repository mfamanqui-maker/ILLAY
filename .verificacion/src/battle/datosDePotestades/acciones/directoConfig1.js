/**
 * acciones/directoConfig1.js — Acciones que necesitan saber que hizo el rival.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE SERA: el catalogo de acciones que no se pueden decidir a ciegas. Elegir
 * una obliga a enviar Enviar_Config_Acciones (no Final) y a esperar la
 * configuracion del rival antes de poder senalar objetivo.
 *
 * Este archivo es el que hace que exista el bucle de rondas. Si ninguna
 * potestad elige nada de aqui, el turno se resuelve en una sola vuelta.
 *
 * Rescatado de: familias/campesinos/lumel.js, familias/campesinos/brunn.js y
 * familias/realistas/soldado1.js (los tres borrados).
 *
 * ESTADO: esqueleto con rescate. Revisar contra el spect 006.
 */

// ─── RESCATE: lumel.js lineas 62-71, brunn.js 56-64, soldado1.js 54-61. ──────
// El cuerpo era una sola linea (gastar un escudo). Lo que hacia el trabajo de
// verdad era `efectoTipo1: 'escudo'`, que el ejecutor leia para cancelar el
// proyectil dirigido al aliado que el jugador senalaba.

export function escudar(objetivo, contexto) {
  contexto.tarea.potestad.estadisticas.escudos -= 1;
}
escudar.efectoTipo1 = 'escudo';

// ─── RESCATE: lumel.js lineas 133-141, brunn.js 126-134, soldado1.js 121-129. ─
// El cuerpo estaba vacio a proposito: retirar a la potestad del tablero y
// cancelar lo que le venia encima lo hacia el ejecutor a partir de
// `efectoTipo1: 'retirada'`.

export function retirada(objetivo, contexto) {}
retirada.efectoTipo1 = 'retirada';

// ─── LO QUE HAY QUE RECUPERAR DEL EJECUTOR VIEJO ─────────────────────────────
//
// El comportamiento real de estas dos acciones vivia en controladorJugada.js,
// unas 200 lineas repartidas entre:
//
//   _resolverHabilidadTipo1   lineas 412-426   decide escudo o retirada
//   _aplicarEscudo            lineas 428-437   marca el proyectil bloqueado
//   _aplicarRetirada          lineas 439-447   saca a la potestad del tablero
//   _mostrarSeleccionTipo1    lineas 449-555   toda la interfaz de seleccion
//
// La interfaz (filtro oscuro, particulas rojas sobre el amenazado, tooltip con
// el resumen de lo que le viene, y la espera al clic) se rescata en
// sistemaDeOrbes/seleccionTipo1.js, no aqui. Aqui solo queda el efecto.
//
// La cancelacion es la fase 1 de la regla 10: se aplica al principio del grupo,
// antes de resolver nada.
