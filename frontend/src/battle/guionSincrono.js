/**
 * guionSincrono.js — Ordena las acciones del turno y resuelve sus efectos.
 *
 * SPECT: docs/spects/spect007.md
 *
 * QUE SERA: recibe todas las acciones del turno (las del jugador y las del
 * rival), las ordena por velocidad, las agrupa, y por cada grupo resuelve la
 * logica y entrega a showAsincrono el array de animaciones a reproducir.
 * Espera a que el show termine antes de tocar el grupo siguiente.
 *
 * REGLA 10 DEL CONTRATO — el invariante central de este archivo.
 * Cada grupo de misma velocidad se resuelve en este orden y no en otro:
 *
 *   1. CANCELACIONES  escudos y retiradas retiran acciones del grupo.
 *   2. RESOLUCION     se calcula TODO contra la foto tomada al inicio del
 *                     grupo, y despues se aplica de golpe.
 *   3. MUERTES        ahora si se retiran las potestades a 0 HP.
 *   4. ANIMACION      showAsincrono reproduce el grupo entero en paralelo.
 *
 * El paso 2 es el que no se puede saltar. Si dos potestades de la misma
 * velocidad se atacan y una muere, la accion de la muerta se resuelve igual.
 * Eso solo funciona calculando contra la foto: si se aplicara el dano una por
 * una, el orden dentro del array decidiria quien vive, y ese orden es
 * arbitrario.
 *
 * Rescatado de: classes/battle/controladorJugada.js (borrado).
 *
 * ESTADO: esqueleto con rescate. Revisar contra el spect 007.
 */

// ─── RESCATE: controladorJugada.js lineas 55-63. Sirve tal cual. ─────────────
// La velocidad puede venir de la accion o de las estadisticas de quien la usa.

export function resolverVelocidad(tarea) {
  const velocidad = Number(
    tarea?.accion?.velocidad ??
    tarea?.potestad?.estadisticas?.velocidad ??
    0,
  );
  return Number.isFinite(velocidad) ? velocidad : 0;
}

// ─── RESCATE ADAPTADO: controladorJugada.js lineas 65-81 y 160-166. ──────────
// El codigo viejo guardaba Map<velocidad, tarea[]> y despues lo recorria al
// reves con toReversed(). Aqui se hace de una vez: agrupar y devolver los
// grupos ya en orden de ejecucion (mas rapido primero).

export function agruparPorVelocidad(tareas) {
  const grupos = new Map();
  tareas.forEach((tarea) => {
    const velocidad = resolverVelocidad(tarea);
    if (!grupos.has(velocidad)) grupos.set(velocidad, []);
    grupos.get(velocidad).push(tarea);
  });

  return Array.from(grupos.entries())
    .sort(([a], [b]) => b - a)
    .map(([velocidad, lista]) => ({ velocidad, tareas: lista }));
}

// ─── RESCATE: controladorJugada.js lineas 595-605 y 657-673. Adaptado. ───────
// Deteccion de muertes y de fin de batalla. El codigo viejo iba a buscar la
// escena `entidad` para leer las listas de vivos; ahora las recibe.

export function detectarMuertes(potestades) {
  return (potestades ?? []).filter(
    (potestad) => Number(potestad?.estadisticas?.hp) <= 0,
  );
}

export function evaluarFinBatalla(aliadosVivos, enemigosVivos) {
  if (aliadosVivos === 0 && enemigosVivos === 0) return 'empate';
  if (enemigosVivos === 0) return 'victoria';
  if (aliadosVivos === 0) return 'derrota';
  return null;
}

// ─── A CONSTRUIR ─────────────────────────────────────────────────────────────
//
// tomarFoto(potestades)            copia de las estadisticas al inicio del grupo
// aplicarCancelaciones(grupo)      escudos y retiradas retiran tareas del grupo
// resolverGrupo(grupo, foto)       calcula contra la foto y aplica de golpe
// ejecutarTurno(tareas, contexto)  el bucle: por cada grupo, las 4 fases,
//                                  emitiendo 'jugadaEjecutada' por cada accion
//                                  resuelta para que PhaserMaster la anote.
//
// El spect 007 define las firmas exactas y que lleva la foto.
