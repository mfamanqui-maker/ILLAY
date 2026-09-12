/**
 * UtilsTablero.js — Atajos para moverse por el array bidimensional.
 *
 * SPECT: docs/spects/spect003.md
 *
 * QUE SERA: el unico modulo que sabe como esta indexado el tablero por dentro.
 * Todo lo demas le pregunta a el.
 *
 * REGLA 4 DEL CONTRATO: el tablero es base 1 hacia afuera (igual que
 * `posicion: {x, y}` en los moldes) y base 0 por dentro. Nadie fuera de este
 * archivo escribe `array[y - 1][x - 1]`. El bug de calcularArea y calcularRayo
 * del codigo viejo nacio exactamente de romper esta regla.
 *
 * Estas funciones son de datos. Nada de dibujar: mover el sprite a la casilla
 * es trabajo de PotestadesTablero.
 *
 * Rescatado de: classes/battle/tablero.js (borrado).
 */

// ─── RESCATE: tablero.js lineas 49-63. Sirve tal cual. ───────────────────────
// Los ids llegan como numero o como texto segun vengan del JSON o de la red,
// asi que se normalizan antes de comparar.

export function normalizarId(id) {
  if (id == null || id === '') return null;
  const numero = Number(id);
  return Number.isNaN(numero) ? String(id) : numero;
}

export function obtenerIdEntidad(entidad) {
  if (!entidad || entidad === false) return null;
  return normalizarId(
    entidad?.data?.id ??
    entidad?.datos?.id ??
    entidad?.id ??
    entidad,
  );
}

// ─── RESCATE: tablero.js lineas 35-47. Sirve tal cual. ───────────────────────
// Devuelve coordenadas base 1, que es lo que espera el resto del sistema.

export function buscarPorId(id, tablero) {
  for (let y = 0; y < tablero.length; y++) {
    for (let x = 0; x < tablero[y].length; x++) {
      if (obtenerIdEntidad(tablero[y][x].entidad) === normalizarId(id)) {
        return { x: x + 1, y: y + 1 };
      }
    }
  }
  return null;
}

// ─── RESCATE: tablero.js lineas 114-121. Sirve tal cual. ─────────────────────

export function calcularDistancia(idInicio, idDestino, tablero) {
  const inicio = buscarPorId(idInicio, tablero);
  const destino = buscarPorId(idDestino, tablero);
  if (!inicio || !destino) return null;
  return Math.hypot(inicio.x - destino.x, inicio.y - destino.y);
}

// ─── RESCATE PARCIAL: tablero.js lineas 80-112. ──────────────────────────────
// Del moverEntidad viejo solo sobrevive la mitad de datos. La otra mitad
// llamaba a ubicarEnCasillaAsync y buscaba la escena por su cuenta: eso ahora
// es de PotestadesTablero. Aqui se mueve el dato y se devuelve si se pudo.

export function moverEnTablero(entidad, destino, tablero) {
  if (!entidad || !destino || !tablero) return false;

  const origen = buscarPorId(obtenerIdEntidad(entidad), tablero);
  if (!origen) return false;

  const casillaOrigen = tablero[origen.y - 1]?.[origen.x - 1];
  const casillaDestino = tablero[destino.y - 1]?.[destino.x - 1];
  if (!casillaOrigen || !casillaDestino) return false;
  if (casillaDestino.entidad && casillaDestino.entidad !== false) return false;

  const movida = casillaOrigen.entidad || entidad;
  casillaOrigen.entidad = false;
  casillaDestino.entidad = movida;
  return true;
}

// ─── A REESCRIBIR DESDE CERO ─────────────────────────────────────────────────
// calcularArea y calcularRayo (tablero.js lineas 123-168) NO se rescatan.
// Estaban rotas de dos maneras:
//   1. Restaban 1 a las coordenadas para pasar a base 0 y despues comparaban
//      contra `< 1`, mezclando las dos bases en la misma funcion.
//   2. calcularRayo comparaba la distancia contra `cordenadasOrigen*Math.sqrt(2)`,
//      multiplicando un OBJETO por un numero, lo que siempre da NaN. La rama
//      diagonal por tanto nunca se ejecutaba.
// El spect 003 define el contrato nuevo de ambas.
