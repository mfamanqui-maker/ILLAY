/**
 * AdministracionDeJugada/comun.js — Lecturas compartidas de config y registro.
 *
 * SPECT: docs/spects/spect004.md y spect007.md
 *
 * configDelTurno: Map id → lista de filas { id, nombreDeAccion, objetivo, azar }.
 */

export { buscarAccion } from '../seleccion/comun.js';

/** Entrada `{ bando, potestad }` del registro, tolerando id numero o string. */
export function entradaDe(registro, id) {
  if (id == null || !registro?.obtenerPorId) return null;
  return registro.obtenerPorId(id) ?? registro.obtenerPorId(Number(id)) ?? null;
}

/** Lista de filas de una potestad en configDelTurno (siempre array). */
export function listaDe(configDelTurno, id) {
  const prev = configDelTurno?.get?.(id)
    ?? configDelTurno?.get?.(Number(id))
    ?? configDelTurno?.get?.(String(id));
  if (Array.isArray(prev)) return prev;
  return prev ? [prev] : [];
}

/** configDelTurno → filas serializables (regla 6 del contrato). */
export function filasDeConfig(configDelTurno) {
  return [...(configDelTurno?.values?.() ?? [])]
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .map(({ id, nombreDeAccion, objetivo, azar }) => ({
      id, nombreDeAccion, objetivo, azar: azar ?? null,
    }));
}
