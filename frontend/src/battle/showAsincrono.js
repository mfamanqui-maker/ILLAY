/**
 * showAsincrono.js — Reproduce las animaciones de un grupo de acciones.
 *
 * SPECT: docs/spects/spect007.md
 *
 * Parte A: animaciones activas (lanzador).
 * Parte B: animaciones pasivas (receptor: recibirDano, serCurado, morir…).
 * Ambas van en el mismo Promise.all del grupo.
 *
 * Aqui no se resta vida a nadie. Los numeros ya estan calculados.
 */

import { fusionarAnimsParaShow } from './utilsEjecucion.js';

// ─── RESCATE: controladorJugada.js lineas 260-280. Adaptado. ─────────────────

export function crearContextoEjecucion(tarea, entorno) {
  return {
    tarea,
    tablero: entorno.tablero,
    escena: entorno.escena,
    eventos: entorno.eventos,
  };
}

export function resolverParametroAccion(tarea) {
  return tarea?.casillaObjetivo ?? tarea?.objetivo ?? null;
}

/** Ejecuta la funcion de la accion y espera si devuelve promesa. */
export async function ejecutarAccion(tarea, entorno) {
  const resultado = tarea?.accion?.ejecucion?.(
    resolverParametroAccion(tarea),
    crearContextoEjecucion(tarea, entorno),
  );
  if (resultado?.then) await resultado;
}

function contextoDeShow(entrada, entorno) {
  const objetivo = entrada.tarea?.objetivo ?? null;
  const destino = (objetivo && objetivo.x != null && !objetivo.estadisticas) ? objetivo : null;
  return {
    escena: entorno.escena,
    tablero: entorno.tablero,
    eventos: entorno.eventos,
    tarea: entrada.tarea ?? null,
    potestad: entrada.potestad ?? entrada.tarea?.potestad ?? null,
    objetivo,
    destino,
    tamanoCasilla: entorno.tamanoCasilla ?? 400,
  };
}

async function lanzarEntrada(entrada, entorno) {
  if (!entrada?.reproducir) return;
  const r = entrada.reproducir(contextoDeShow(entrada, entorno));
  if (r?.then) await r;
}

/**
 * Reproduce activas + pasivas del grupo en paralelo.
 * @param {object} resultadoGrupo — de utilsEjecucion.armarResultadoGrupo
 * @param {object} entorno — { escena, tablero, eventos }
 */
export function reproducirGrupo(resultadoGrupo, entorno) {
  const entradas = fusionarAnimsParaShow(resultadoGrupo);
  if (entradas.length === 0) return Promise.resolve();
  return Promise.all(entradas.map((e) => lanzarEntrada(e, entorno)));
}
