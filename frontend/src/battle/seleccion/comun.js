/**
 * seleccion/comun.js — Busquedas compartidas por la carpeta seleccion.
 *
 * SPECT: docs/spects/spect006.md
 */

export function claveCasilla(x, y) {
  return `${Number(x)},${Number(y)}`;
}

export function buscarAccion(potestad, nombre) {
  return Object.values(potestad?.listaDeAcciones ?? {})
    .flat()
    .find((accion) => accion?.nombre === nombre) ?? null;
}

export function filasDeConfigRival(configuracionRival) {
  if (Array.isArray(configuracionRival)) return configuracionRival;
  if (Array.isArray(configuracionRival?.configuracion)) return configuracionRival.configuracion;
  return [];
}

/** Entrada `{ bando, potestad }` por id, comparando como string. */
export function entradaPorId(potestades, id) {
  const clave = id == null ? null : String(id);
  return (potestades ?? []).find((entrada) => (
    String(entrada.potestad?.id) === clave
    || String(entrada.potestad?.datos?.id) === clave
  )) ?? null;
}
