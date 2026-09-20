/**
 * acciones/diana.js — Fabricas compartidas para acciones que senalan a alguien.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Las clases de cada type (dianaEnemigo, dianaAliado, …) piden numeros y
 * devuelven una funcion viva `(objetivo, contexto)`. Aqui viven las piezas
 * que se repiten: resolver el blanco y aplicar dano o cura.
 */

export function resolverPotestad(objetivo) {
  if (!objetivo || objetivo === false) return null;
  if (objetivo.estadisticas) return objetivo;
  return null;
}

export function recalcular(potestad) {
  potestad?.calcularAcciones?.();
}

export function lanzadorDe(contexto) {
  const tarea = contexto?.tarea;
  if (tarea?.potestad?.estadisticas) return tarea.potestad;
  const id = tarea?.potestadId ?? tarea?.id;
  if (id == null) return null;
  return contexto?.registro?.obtenerPorId?.(id)?.potestad
    ?? contexto?.registro?.obtenerPorId?.(Number(id))?.potestad
    ?? null;
}

export class AccionesDiana {
  static hacerDano(cantidad) {
    return (objetivo) => {
      const blanco = resolverPotestad(objetivo);
      if (!blanco?.estadisticas) return;
      const n = Number(cantidad ?? 0);
      if (!Number.isFinite(n)) return;
      blanco.estadisticas.hp = Number(blanco.estadisticas.hp ?? 0) - n;
    };
  }

  static curarHp(cantidad) {
    return (objetivo) => {
      const blanco = resolverPotestad(objetivo);
      if (!blanco?.estadisticas) return;
      const n = Number(cantidad ?? 1);
      const techo = Number(blanco.constantes?.hpMax ?? Infinity);
      blanco.estadisticas.hp = Math.min(Number(blanco.estadisticas.hp ?? 0) + n, techo);
    };
  }
}
