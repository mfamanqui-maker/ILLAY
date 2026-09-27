/**
 * ejecucion/tareasActivas.js — Lista de activas del turno: velocidad y fase.
 *
 * SPECT: docs/spects/spect007.md
 *
 * Filas serializables (propia + rival) → tareas vivas (IndexDePotestades) →
 * grupos por velocidad, de mayor a menor. Dentro de cada grupo las tareas
 * se reparten por la fase que dicta el catalogo de acciones:
 *   trampa → movimiento → preparacion → proyectil
 */

import { prepararTareasDeTurno } from '../../datosDePotestades/IndexDePotestades.js';
import { FASES, faseDeAccion } from '../../datosDePotestades/acciones/catalogo.js';

export function nombreDeTarea(tarea) {
  return String(tarea?.accion?.nombre ?? tarea?.nombreDeAccion ?? '').trim();
}

export function faseDeTarea(tarea) {
  return tarea?.accion?.fase ?? faseDeAccion(nombreDeTarea(tarea));
}

/** Potestad objetivo de la tarea (null si apunta a casilla o a nada). */
export function blancoDeTarea(tarea) {
  const o = tarea?.objetivo;
  return (o && typeof o === 'object' && o.estadisticas) ? o : null;
}

export function idObjetivoTarea(tarea) {
  const o = tarea?.objetivo;
  if (o == null) return null;
  if (typeof o === 'object' && o.estadisticas) return o.id;
  if (typeof o === 'object' && Number.isFinite(Number(o.x))) return null;
  return o;
}

export function resolverVelocidad(tarea) {
  if (Number.isFinite(tarea?._velocidad)) return tarea._velocidad;
  const velocidad = Number(
    tarea?.accion?.velocidad ?? tarea?.potestad?.estadisticas?.velocidad ?? 0,
  );
  return Number.isFinite(velocidad) ? velocidad : 0;
}

function repartirPorFase(tareas) {
  const fases = Object.fromEntries(FASES.map((fase) => [fase, []]));
  tareas.forEach((tarea) => {
    const fase = faseDeTarea(tarea);
    (fases[fase] ?? fases.preparacion).push(tarea);
  });
  return fases;
}

/** [{ velocidad, tareas, fases: { trampa, movimiento, preparacion, proyectil } }] */
export function agruparPorVelocidad(tareas) {
  const grupos = new Map();
  (tareas ?? []).forEach((tarea) => {
    const velocidad = resolverVelocidad(tarea);
    if (!grupos.has(velocidad)) grupos.set(velocidad, []);
    grupos.get(velocidad).push(tarea);
  });
  return Array.from(grupos.entries())
    .sort(([a], [b]) => b - a)
    .map(([velocidad, lista]) => ({ velocidad, tareas: lista, fases: repartirPorFase(lista) }));
}

export function construirTareasActivas(filas, registro) {
  return agruparPorVelocidad(prepararTareasDeTurno(filas, registro));
}

export function loguearTareasActivas(grupos) {
  const plano = Object.fromEntries((grupos ?? []).map((grupo) => [
    String(grupo.velocidad),
    Object.fromEntries(Object.entries(grupo.fases).map(([fase, tareas]) => [
      fase,
      tareas.map((t) => ({ potestad: t.potestad?.id, accion: nombreDeTarea(t), objetivo: t.objetivo?.id ?? t.objetivo })),
    ])),
  ]));
  console.log('[guion] tareas activas por velocidad y fase', plano);
  return plano;
}
