/**
 * seleccion/selectores.js — Una funcion por type de accion, menos directo.
 *
 * SPECT: docs/spects/spect006.md
 *
 * `seleccionarObjetivos(accion, contexto)` es la puerta: lee accion.type y
 * delega. Devuelve { tipo, bandos, candidatos, esperaRival, objetivoAuto? }.
 * Si el contexto trae escena, pinta las marcas.
 */

import {
  candidatosCasilla,
  candidatosPorBando,
  destinosMoverseAliados,
  esAccionDeMovilidad,
  obtenerRangoAccion,
} from './casos.js';
import { aplicarMarcasSeleccion } from './marcas.js';

function resultadoEntidad(bandos, contexto, accion) {
  const rango = obtenerRangoAccion(accion);
  const soloMuertos = String(accion?.nombre ?? '').toLowerCase() === 'zombiosis';
  const resultado = {
    tipo: 'entidad',
    bandos,
    candidatos: candidatosPorBando(contexto?.potestades, bandos, contexto?.origen, rango, { soloMuertos }),
    esperaRival: false,
  };
  return aplicarMarcasSeleccion(resultado, contexto);
}

/** configtype1: no pide diana ahora; solo marca que hay que esperar al rival. */
function resultadoPosterior(bandos) {
  return { tipo: 'posterior', bandos, candidatos: [], esperaRival: true };
}

export function seleccionarDiana(accion, contexto) {
  return resultadoEntidad(['Aliados', 'Enemigos'], contexto, accion);
}

export function seleccionarDianaEnemigo(accion, contexto) {
  return resultadoEntidad(['Enemigos'], contexto, accion);
}

export function seleccionarDianaAliado(accion, contexto) {
  return resultadoEntidad(['Aliados'], contexto, accion);
}

export function seleccionarConfigType1() {
  return resultadoPosterior(['Aliados', 'Enemigos']);
}

export function seleccionarConfigType1Aliado() {
  return resultadoPosterior(['Aliados']);
}

export function seleccionarConfigType1Enemigo() {
  return resultadoPosterior(['Enemigos']);
}

export function seleccionarCasilla(accion, contexto) {
  const rango = obtenerRangoAccion(accion);
  const reservadas = esAccionDeMovilidad(accion?.nombre)
    ? (contexto?.destinosAliados ?? destinosMoverseAliados(contexto?.configDelTurno, contexto?.origenPotestad?.id))
    : null;
  const resultado = {
    tipo: 'casilla',
    bandos: [],
    candidatos: candidatosCasilla(
      contexto?.tablero,
      contexto?.origen,
      rango,
      accion?.permiteCasillaOcupada === true
        || esAccionDeMovilidad(accion?.nombre)
        || String(accion?.nombre ?? '').toLowerCase() === 'rayo de magia',
      reservadas,
    ),
    esperaRival: false,
  };
  return aplicarMarcasSeleccion(resultado, contexto);
}

const POR_TIPO = {
  diana: seleccionarDiana,
  dianaenemigo: seleccionarDianaEnemigo,
  dianaaliado: seleccionarDianaAliado,
  casilla: seleccionarCasilla,
  dianacasilla: seleccionarCasilla,
  configtype1: seleccionarConfigType1,
  configtype1aliado: seleccionarConfigType1Aliado,
  configtype1enemigo: seleccionarConfigType1Enemigo,
};

/** Puerta: lee accion.type y delega. directo y lo desconocido no piden nada. */
export function seleccionarObjetivos(accion, contexto) {
  const clave = String(accion?.type ?? accion?.tipo ?? '').toLowerCase().replace(/\s+/g, '');
  const fn = POR_TIPO[clave];
  if (!fn) return { tipo: 'automatico', bandos: [], candidatos: [], esperaRival: false };
  return fn(accion, contexto);
}
