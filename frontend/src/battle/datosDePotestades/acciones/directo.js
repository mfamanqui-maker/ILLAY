/**
 * acciones/directo.js — Acciones que no necesitan ninguna informacion extra.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE SERA: el catalogo de acciones que se resuelven solas. El jugador las
 * elige y ya esta: no hay que pedirle un objetivo ni esperar a saber que hizo
 * el rival. Se envian siempre como Enviar_Config_Acciones_Final.
 *
 * EL ARCHIVO ES LA ETIQUETA: en que archivo vive una accion es lo que dice al
 * negociador de turno si hace falta abrir otra ronda. Por eso el tipo no se
 * declara a mano en cada accion; lo estampa IndexDePotestades al construir el
 * catalogo. Si se declarara a mano, alguien lo escribiria mal y el bucle de
 * rondas se colgaria esperando una respuesta que no llega.
 *
 * Firma de toda accion: (objetivo, contexto) => void | Promise
 *   contexto.tarea.potestad  quien la lanza
 *   contexto.tablero         el array bidimensional
 *   contexto.escena          la escena del mundo
 *
 * Rescatado de: familias/campesinos/lumel.js, familias/campesinos/brunn.js y
 * familias/realistas/soldado1.js (los tres borrados).
 *
 * ESTADO: esqueleto con rescate. Revisar contra el spect 006.
 */

// ─── RESCATE: lumel.js linea 85, brunn.js linea 78, soldado1.js linea 76. ────
// Estaba escrita tres veces identica, una por personaje. Ahora es una sola y
// lee el nivel de quien la lanza.

export function descansar(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  const n = lanzador.datos.nivel;
  lanzador.estadisticas.ataque += n + 5;
}

// ─── RESCATE: lumel.js lineas 93-98. ─────────────────────────────────────────
// La version de soldado1 era un console.log de relleno; se descarta.

export function dopar(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  lanzador.estadisticas.ulti = false;
  contexto.eventos?.emit('doparActivado', { idPotestad: lanzador.id });
}

// ─── RESCATE: lumel.js linea 107, brunn.js linea 100, soldado1.js linea 95. ──

export function tomarBebida(objetivo, contexto) {
  contexto.tarea.potestad.estadisticas.hp += 30;
}
