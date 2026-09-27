/**
 * ejecucion/cancelaciones.js — Que activas ya no ocurren.
 *
 * SPECT: docs/spects/spect007.md
 *
 * Se anula una tarea si su lanzador murio en un grupo anterior, o si es un
 * proyectil contra un blanco con pacto o protegido por una pasiva
 * (escudo en alRecibirProyectil). El rayo (anulaPorGolpe) no se anula
 * entero: se filtra golpe a golpe dentro de la accion.
 */

import { anulaPorGolpe } from '../../datosDePotestades/acciones/catalogo.js';
import { MOMENTOS } from './pilaPasivas.js';
import {
  blancoDeTarea,
  faseDeTarea,
  idObjetivoTarea,
  nombreDeTarea,
} from './tareasActivas.js';

function lanzadorMuerto(tarea) {
  return Number(tarea?.potestad?.estadisticas?.hp ?? 0) <= 0 || tarea?.potestad?.muerta;
}

function cancelarUna(tarea, pila) {
  // Dentro del mismo grupo todas resuelven contra la foto (regla 10).
  if (lanzadorMuerto(tarea)) return true;
  if (faseDeTarea(tarea) !== 'proyectil') return false;
  const blanco = blancoDeTarea(tarea);
  if (blanco?.pactoActivo) return true;
  if (anulaPorGolpe(nombreDeTarea(tarea))) return false;
  const idBlanco = idObjetivoTarea(tarea);
  if (idBlanco == null) return false;
  let anulado = false;
  const disparadas = pila?.verificar?.(MOMENTOS.recibirProyectil, {
    objetivo: blanco ?? { id: idBlanco },
    tarea,
    anular: () => { anulado = true; },
    dano: 0,
  }) ?? [];
  if (!anulado && disparadas.length === 0) return false;
  tarea.bloqueadaPor = blanco;
  return true;
}

/** Marca `tarea.anulada` y devuelve las anuladas. */
export function aplicarCancelaciones(tareas, pila) {
  (tareas ?? []).forEach((tarea) => {
    if (cancelarUna(tarea, pila)) tarea.anulada = true;
  });
  return (tareas ?? []).filter((t) => t.anulada);
}
