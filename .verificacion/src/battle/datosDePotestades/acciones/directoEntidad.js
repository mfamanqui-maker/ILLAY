/**
 * acciones/directoEntidad.js — Acciones que necesitan senalar a una potestad.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE ES: el catalogo de acciones que no se pueden lanzar sin que el jugador
 * senale a alguien. El objetivo se pide en el momento de elegirlas y despues
 * se envian como Final: no hace falta saber nada del rival.
 *
 * ANTES SE LLAMABA directoEnemiga.js. El nombre mentia: `curar` apunta a un
 * aliado y `atacar` a un enemigo, y las dos estan aqui porque necesitan lo
 * mismo, una potestad senalada. El criterio de reparto de acciones/ es que
 * informacion falta para poder enviar la jugada, no a quien afecta.
 *
 * Firma: (objetivo, contexto) => void | Promise, con `objetivo` una potestad.
 *
 * Rescatado de: familias/campesinos/lumel.js, familias/campesinos/brunn.js y
 * familias/realistas/soldado1.js (los tres borrados).
 */

// ─── RESCATE: lumel.js linea 75, brunn.js linea 68, soldado1.js linea 66. ────
// Tres copias identicas en el codigo viejo, una por personaje.
// NUMERO REESCALADO: el original hacia `25 + 10*n + ataque` contra vidas de
// 100 a 350. La tabla nueva tiene el dano como estadistica propia (1 a 3) y
// vidas de 3 a 7, asi que el golpe es exactamente lo que la potestad pega.

export function atacar(objetivo, contexto) {
  objetivo.estadisticas.hp -= contexto.tarea.potestad.estadisticas.dano;
}

// ─── RESCATE: lumel.js linea 53, brunn.js linea 47, soldado1.js linea 45. ────
// NUMERO REESCALADO por lo mismo: curaba 25 + 10*n.
// El tope es `hpMax`, que vive en las constantes de la familia.

export function curar(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  const techo = Number(objetivo.constantes?.hpMax ?? Infinity);
  objetivo.estadisticas.hp = Math.min(objetivo.estadisticas.hp + 1, techo);
  lanzador.estadisticas.curas -= 1;
  lanzador.calcularAcciones();
}

// ─── NUEVA: familia Mago ─────────────────────────────────────────────────────
// Gasta la magia que `generarMagia` acumulo. Es la razon de que el Mago tenga
// un recurso: sin gasto, acumularlo no significaria nada.

export function rayoDeMagia(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  objetivo.estadisticas.hp -= lanzador.estadisticas.dano + 1;
  lanzador.estadisticas.magia -= 1;
  lanzador.calcularAcciones();
}

// ─── NUEVAS: familia Intelectual ─────────────────────────────────────────────
// Van encadenadas: `apuntar` deja marcado a quien, y solo entonces `disparar`
// deja de estar en gris. Guardar el id y no la potestad es deliberado: lo que
// se guarda en estadisticas tiene que sobrevivir a un JSON.stringify.

export function apuntar(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  lanzador.estadisticas.apuntando = objetivo.id;
  lanzador.calcularAcciones();
}

export function disparar(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  if (lanzador.estadisticas.apuntando !== objetivo.id) return;
  objetivo.estadisticas.hp -= lanzador.estadisticas.dano * 2;
  lanzador.estadisticas.apuntando = null;
  lanzador.calcularAcciones();
}

// ─── NUEVA: familia Sectario ─────────────────────────────────────────────────
// Gasta anticristo, igual que el rayo gasta magia. Los numeros son la lectura
// literal de la tabla del Sectario y estan pendientes de confirmar.

export function maldicion(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  objetivo.estadisticas.hp -= lanzador.estadisticas.dano + 1;
  lanzador.estadisticas.anticristo -= 1;
  lanzador.calcularAcciones();
}

// ─── SIN MECANICA DEFINIDA ───────────────────────────────────────────────────
// `zombiosis` aparece en la lista del Mago y como constante de cada familia,
// pero no hay nada que diga que hace. Igual que `pacto`: declarada, publicada
// en gris por su familia, sin cuerpo inventado.

export function zombiosis(objetivo, contexto) {}
