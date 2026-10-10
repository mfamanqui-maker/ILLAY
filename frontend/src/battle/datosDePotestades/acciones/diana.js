/**
 * acciones/diana.js — Fabricas compartidas para acciones que senalan a alguien.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Las clases de cada type (dianaEnemigo, dianaAliado, …) piden numeros y
 * devuelven una funcion viva `(objetivo, contexto)`. Aqui viven las piezas
 * que se repiten: resolver el blanco y aplicar dano o cura.
 */

/** Un escudo para un golpe: al bloquear se apaga y no cubre el siguiente. */
export function consumirEscudo(entidad, { conservarAura = false } = {}) {
  if (!entidad?.activacionEscudo) return false;
  entidad.activacionEscudo = false;
  if (conservarAura) return true;
  const aura = entidad._auraEscudo;
  if (aura) {
    aura.escena?.events?.off?.('update', aura.seguir);
    aura.circulo?.destroy?.();
    entidad._auraEscudo = null;
  }
  return true;
}

export function resolverPotestad(objetivo, registro = null) {
  if (!objetivo || objetivo === false) return null;
  if (objetivo.estadisticas) return objetivo;
  const id = typeof objetivo === 'object'
    ? (objetivo.id ?? objetivo.potestadId)
    : objetivo;
  if (id == null || !registro?.obtenerPorId) return null;
  return registro.obtenerPorId(id)?.potestad
    ?? registro.obtenerPorId(Number(id))?.potestad
    ?? null;
}

export function recalcular(potestad) {
  potestad?.calcularAcciones?.();
}

/** Costes de fichas. La clave es el nombre de la estadistica. */
export const COSTES_DE_ACCION = {
  curar: { curas: 1 },
  escudar: { escudos: 1 },
  apuntar: { conocimiento: 1 },
  disparar: { conocimiento: 1 },
  'rayo de magia': { magia: 3 },
  rayoDeMagia: { magia: 3 },
  zombiosis: { magia: 2, curas: 2 },
  pacto: { anticristo: 1 },
  maldicion: { anticristo: 1 },
};

export function costeDeAccion(accion, nombre = null) {
  if (accion?.coste && typeof accion.coste === 'object' && !Array.isArray(accion.coste)) {
    return { ...accion.coste };
  }
  const clave = String(nombre ?? accion?.nombre ?? '').trim();
  const porNombre = COSTES_DE_ACCION[clave] ?? COSTES_DE_ACCION[clave.toLowerCase()];
  return porNombre ? { ...porNombre } : {};
}

export function puedePagarCoste(estadisticas, coste) {
  const tabla = coste && typeof coste === 'object' && !Array.isArray(coste) ? coste : {};
  return Object.entries(tabla).every(([ficha, crudo]) => {
    const need = Number(crudo);
    if (!Number.isFinite(need) || need <= 0) return true;
    return Number(estadisticas?.[ficha] ?? 0) >= need;
  });
}

/** Resta fichas. Si no alcanza, no toca nada. Nunca deja un valor negativo. */
export function gastarFichas(lanzador, coste) {
  if (!lanzador?.estadisticas) return false;
  const tabla = coste && typeof coste === 'object' && !Array.isArray(coste) ? coste : {};
  if (!puedePagarCoste(lanzador.estadisticas, tabla)) return false;
  Object.entries(tabla).forEach(([ficha, crudo]) => {
    const need = Number(crudo);
    if (!Number.isFinite(need) || need <= 0) return;
    const actual = Number(lanzador.estadisticas[ficha] ?? 0);
    lanzador.estadisticas[ficha] = Math.max(0, actual - need);
  });
  recalcular(lanzador);
  return true;
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

export function ganarAccionismoExtra(potestad, cantidad = 1) {
  if (!potestad) return;
  potestad.accionismoExtra = Number(potestad.accionismoExtra ?? 0) + Number(cantidad ?? 1);
}

export function esAccionNada(nombre) {
  const n = String(nombre ?? '').trim().toLowerCase();
  return n === '' || n === 'nada' || n === 'descansar' || n === 'descansa';
}

export function estaDentroDeRangoCoords(origen, destino, rango) {
  if (!Number.isFinite(Number(rango)) || Number(rango) === Infinity) return true;
  if (!origen || !destino) return false;
  const dx = Math.abs(Number(destino.x) - Number(origen.x));
  const dy = Math.abs(Number(destino.y) - Number(origen.y));
  return Math.max(dx, dy) <= Number(rango);
}

export class AccionesDiana {
  static hacerDano(cantidad) {
    return (objetivo, contexto) => {
      const blanco = resolverPotestad(objetivo, contexto?.registro);
      if (!blanco?.estadisticas) return;
      const lanzador = lanzadorDe(contexto);
      const rango = contexto?.tarea?.accion?.rango;
      if (
        lanzador
        && !estaDentroDeRangoCoords(
          lanzador.datos?.posicion,
          blanco.datos?.posicion,
          rango,
        )
      ) {
        return;
      }
      if (blanco.pactoActivo) return;
      if (consumirEscudo(blanco)) return;
      const n = Number(cantidad ?? 0);
      if (!Number.isFinite(n)) return;
      blanco.estadisticas.hp = Number(blanco.estadisticas.hp ?? 0) - n;
    };
  }

  static curarHp(cantidad) {
    return (objetivo, contexto) => {
      const blanco = resolverPotestad(objetivo, contexto?.registro);
      if (!blanco?.estadisticas) return;
      const n = Number(cantidad ?? 1);
      const techo = Number(blanco.constantes?.hpMax ?? Infinity);
      blanco.estadisticas.hp = Math.min(Number(blanco.estadisticas.hp ?? 0) + n, techo);
    };
  }
}
