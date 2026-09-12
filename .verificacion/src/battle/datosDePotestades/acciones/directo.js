/**
 * acciones/directo.js — Acciones que no necesitan ninguna informacion extra.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE ES: el catalogo de acciones que se resuelven solas. El jugador las
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
 *   contexto.eventos         el emisor de PhaserMaster
 *
 * Aqui `objetivo` siempre llega null: es el precio de que las cuatro familias
 * de acciones compartan una sola firma y el guion pueda invocarlas sin mirar
 * de que archivo salieron.
 *
 * Rescatado de: familias/campesinos/lumel.js, familias/campesinos/brunn.js y
 * familias/realistas/soldado1.js (los tres borrados).
 */

// ─── RESCATE: lumel.js linea 85, brunn.js linea 78, soldado1.js linea 76. ────
// Estaba escrita tres veces identica, una por personaje.
// NUMERO REESCALADO: el original sumaba `n + 5` sobre un `ataque` de 10 a 35.
// La tabla nueva mueve el dano al rango 1-3, asi que el incremento es 1.

export function descansar(objetivo, contexto) {
  contexto.tarea.potestad.estadisticas.dano += 1;
}

// ─── RESCATE: lumel.js lineas 93-98. ─────────────────────────────────────────
// La version de soldado1 era un console.log de relleno; se descarta.
// Ninguna familia de la tabla nueva declara `ulti`, asi que hoy no la lista
// nadie. Se conserva en el catalogo porque la accion es correcta y el catalogo
// no tiene por que limitarse a lo que las familias usan ahora mismo.

export function dopar(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  lanzador.estadisticas.ulti = false;
  contexto.eventos?.emit('doparActivado', { idPotestad: lanzador.id });
}

// ─── RESCATE: lumel.js linea 107, brunn.js linea 100, soldado1.js linea 95. ──
// NUMERO REESCALADO: `hp += 30` sobre una vida de 100-350. Con hp de 3 a 7, +1.

export function tomarBebida(objetivo, contexto) {
  contexto.tarea.potestad.estadisticas.hp += 1;
}

// ─── NUEVAS: familias Mago, Intelectual y Sectario ───────────────────────────
// Las tres acumulan el recurso que su familia declara en la tabla. Es la
// lectura literal de esas estadisticas; si los incrementos deben ser otros, se
// cambian aqui y en ningun otro sitio.

export function generarMagia(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  lanzador.estadisticas.magia += 1;
  lanzador.calcularAcciones();
}

export function estudiar(objetivo, contexto) {
  contexto.tarea.potestad.estadisticas.conocimiento += 1;
}

export function ritual(objetivo, contexto) {
  const lanzador = contexto.tarea.potestad;
  lanzador.estadisticas.anticristo += 1;
  lanzador.calcularAcciones();
}

// ─── SIN MECANICA DEFINIDA ───────────────────────────────────────────────────
// `pacto` esta declarada en la lista del Sectario pero su efecto no existe en
// ningun sitio: ni en el codigo viejo ni en el spect. Se deja registrada y su
// familia la publica con `condicional: false`, asi que aparece en la orbe en
// gris y no se puede elegir. Un hueco visible cuesta menos que un no-op que
// el jugador elige y no hace nada.

export function pacto(objetivo, contexto) {}
