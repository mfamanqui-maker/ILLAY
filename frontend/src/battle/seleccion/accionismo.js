/**
 * seleccion/accionismo.js — Cuantas acciones le quedan a cada potestad.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Estado del modulo: quien ya gasto su cupo este turno. El brillo de
 * "puede actuar" se apaga al agotarlo.
 */

import { frenarBrillo, iniciarBrillo } from './brillos.js';

/** ids de potestades que ya confirmaron accion este turno. */
const gastados = new Set();
/** usos de accionismo por id, para cupos > 1. */
const usosAccionismo = new Map();

export function cupoAccionismo(potestad) {
  return Number(potestad?.constantes?.accionismo ?? 1);
}

export function usosAccionismoDe(potestad) {
  if (potestad?.id == null) return 0;
  return usosAccionismo.get(potestad.id) ?? 0;
}

export function potestadTieneEspera(potestad) {
  if (!potestad) return false;
  if (potestad.muerta || Number(potestad.estadisticas?.hp) <= 0) return false;
  if (potestad.id != null && gastados.has(potestad.id)) return false;
  if (usosAccionismoDe(potestad) >= cupoAccionismo(potestad)) return false;
  return cupoAccionismo(potestad) > 0 && Boolean(potestad.sprite?.active);
}

export function iniciarBrilloAccionismo(potestad, escena, bando) {
  if (bando !== 'Aliados' || !potestadTieneEspera(potestad)) return;
  iniciarBrillo(potestad.sprite, { escena });
}

export function restaurarBrillosAccionismo(contexto) {
  const escena = contexto?.escena;
  if (!escena) return;
  (contexto.potestades ?? []).forEach(({ bando, potestad }) => {
    iniciarBrilloAccionismo(potestad, escena, bando);
  });
}

export function marcarAccionismoGastado(potestad) {
  if (potestad?.id == null) return;
  const usados = usosAccionismoDe(potestad) + 1;
  usosAccionismo.set(potestad.id, usados);
  if (usados >= cupoAccionismo(potestad)) {
    gastados.add(potestad.id);
    frenarBrillo(potestad?.sprite);
  }
}

export function liberarAccionismo(potestad) {
  if (potestad?.id == null) return;
  const usados = Math.max(0, usosAccionismoDe(potestad) - 1);
  if (usados === 0) usosAccionismo.delete(potestad.id);
  else usosAccionismo.set(potestad.id, usados);
  gastados.delete(potestad.id);
}

/** Sin ids: turno nuevo. Con ids: solo esas vuelven a esperar (ronda tipo 1). */
export function reiniciarAccionismo(ids) {
  if (ids == null) {
    gastados.clear();
    usosAccionismo.clear();
    return;
  }
  ids.forEach((id) => {
    gastados.delete(id);
    usosAccionismo.delete(id);
  });
}

export function aplicarAccionismoDelTurno(potestades) {
  (potestades ?? []).forEach((entrada) => {
    const potestad = entrada?.potestad ?? entrada;
    if (!potestad?.constantes) return;
    const extra = Number(potestad.accionismoExtra ?? 0);
    potestad.constantes.accionismo = 1 + extra;
    potestad.accionismoExtra = 0;
  });
}
