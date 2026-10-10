/**
 * seleccion/amenazas.js — Que aliados golpea la config del rival.
 *
 * SPECT: docs/spects/spect004.md y spect006.md
 *
 * "Proyectil" lo dicta el catalogo de acciones, el mismo que usa el guion
 * para cancelar: si aqui cuenta como amenaza, alli se puede escudar.
 * La config del rival ya llega en POV local.
 */

import { afectadosPorRayo } from '../tablero/UtilsTablero.js';
import { anulaPorGolpe, esProyectil } from '../datosDePotestades/acciones/catalogo.js';
import { entradaPorId, filasDeConfigRival } from './comun.js';

function idObjetivoRival(objetivo) {
  if (objetivo == null) return null;
  if (typeof objetivo === 'object') {
    if (Number.isFinite(Number(objetivo.x))) return null;
    return objetivo.id ?? objetivo.potestadId ?? null;
  }
  return objetivo;
}

function impactoDirecto(fila, nombre, potestades) {
  const idBlanco = idObjetivoRival(fila.objetivo);
  if (idBlanco == null) return [];
  const blanco = entradaPorId(potestades, idBlanco);
  if (blanco && blanco.bando !== 'Aliados') return [];
  return [{ idBlanco: String(idBlanco), nombre }];
}

function impactosEnLinea(fila, nombre, entrada, potestades, tablero) {
  if (!tablero) return [];
  const dest = fila.objetivo;
  if (!dest || !Number.isFinite(Number(dest.x)) || !Number.isFinite(Number(dest.y))) return [];
  const origen = entrada?.potestad?.datos?.posicion;
  if (!origen) return [];
  return afectadosPorRayo(origen, dest, tablero, fila.id)
    .filter((a) => entradaPorId(potestades, a.id)?.bando === 'Aliados')
    .map((a) => ({ idBlanco: String(a.id), nombre }));
}

function recolectarImpactosRival(configuracionRival, potestades, tablero = null) {
  return filasDeConfigRival(configuracionRival).flatMap((fila) => {
    const entrada = entradaPorId(potestades, fila.id);
    if (entrada && entrada.bando !== 'Enemigos') return [];
    const nombre = String(fila.nombreDeAccion ?? fila.nombre ?? '').trim();
    if (!esProyectil(nombre)) return [];
    if (anulaPorGolpe(nombre)) return impactosEnLinea(fila, nombre, entrada, potestades, tablero);
    return impactoDirecto(fila, nombre, potestades);
  });
}

/** Ids de aliados amenazados por ataques / rayo del rival (config ya en POV local). */
export function idsAmenazadosPorRival(configuracionRival, potestades, tablero = null) {
  return new Set(recolectarImpactosRival(configuracionRival, potestades, tablero).map((i) => i.idBlanco));
}

/** Por aliado: cuantos proyectiles le apuntan y de que accion. */
export function amenazasPorAliado(configuracionRival, potestades, tablero = null) {
  const mapa = new Map();
  recolectarImpactosRival(configuracionRival, potestades, tablero).forEach(({ idBlanco, nombre }) => {
    if (!mapa.has(idBlanco)) mapa.set(idBlanco, { total: 0, porNombre: new Map() });
    const fila = mapa.get(idBlanco);
    fila.total += 1;
    const clave = nombre || 'proyectil';
    fila.porNombre.set(clave, (fila.porNombre.get(clave) ?? 0) + 1);
  });
  return mapa;
}
