/**
 * negociacion/negociadorDeRonda.js — Bucle config1 -> configN -> precombate.
 *
 * SPECT: docs/spects/spect004.md y 010.
 *
 * PhaserMaster es dueno del estado; este archivo es el comportamiento de la
 * ronda. Recibe el Map de configDelTurno y un transporte inyectado: socket
 * o, mas adelante, una IA con la misma forma { id, nombreDeAccion, objetivo, azar }.
 */

import { seleccionarObjetivos } from '../../seleccion/index.js';
import { buscarAccion, filasDeConfig } from '../comun.js';
import { espejarConfig } from './espejo.js';

export { filasDeConfig };

/**
 * Una fila configtype1 sin objetivo espera al rival:
 *   - sin config del rival (null): siempre;
 *   - con config: solo si hay que elegir (>1 amenazado). Con 0/1 ya esta
 *     resuelta por la seleccion automatica, aunque sea con null.
 */
export function filaEsperaRival(fila, registro, configuracionRival, tablero = null) {
  const entrada = registro?.obtenerPorId?.(fila.id);
  const accion = buscarAccion(entrada?.potestad, fila.nombreDeAccion);
  if (!accion) return false;
  const tipo = String(accion.type ?? accion.tipo ?? '').toLowerCase();
  if (!tipo.includes('configtype1')) return false;
  if (fila.objetivo != null) return false;
  if (configuracionRival == null) return true;
  const seleccion = seleccionarObjetivos(accion, {
    potestades: registro?.todos?.() ?? [],
    origen: entrada?.potestad?.posicionPlanificada ?? entrada?.potestad?.datos?.posicion,
    configuracionRival,
    tablero,
  });
  return seleccion.tipo === 'entidad';
}

export function esConfigFinal(filas, registro, configuracionRival, tablero = null) {
  return !filas.some((fila) => filaEsperaRival(fila, registro, configuracionRival, tablero));
}

export function idsQueEsperanRival(filas, registro, configuracionRival, tablero = null) {
  return filas
    .filter((fila) => filaEsperaRival(fila, registro, configuracionRival, tablero))
    .map((fila) => fila.id);
}

function normalizarFilas(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.configuracion)) return data.configuracion;
  return [];
}

/**
 * Confirma la config del turno. Sin socket: _Final local y precombate.
 * Con socket: escucha ANTES de enviar (evita perder un Recibir temprano),
 * reenvia si el rival sigue, o pide otra seleccion si alguna potestad
 * propia esperaba al rival.
 */
export async function negociar(configDelTurno, {
  transporte,
  columnas,
  registro,
  haySocket,
  configuracionRival = null,
  tablero = null,
}) {
  const propia = filasDeConfig(configDelTurno);
  const final = esConfigFinal(propia, registro, configuracionRival, tablero);

  if (!haySocket) {
    return { fase: 'precombate', propia, rival: [] };
  }

  let pendiente = transporte.recibirConfigDelRival();
  transporte.enviarConfiguracion(espejarConfig(propia, columnas), final);

  while (true) {
    const recibido = await pendiente;
    if (recibido.type === 'Resultado_Partida') {
      return { fase: 'terminada', resultado: recibido.data };
    }

    // Ya en POV local: el emisor espejo al enviar. No doblar el espejo.
    const rival = normalizarFilas(recibido.data);

    if (final && recibido.esFinal) {
      return { fase: 'precombate', propia, rival };
    }
    if (final && !recibido.esFinal) {
      transporte.enviarConfiguracion(espejarConfig(propia, columnas), true);
      pendiente = transporte.recibirConfigDelRival();
      continue;
    }

    return {
      fase: 'seleccionando',
      propia,
      rival,
      idsPendientes: idsQueEsperanRival(propia, registro, rival, tablero),
    };
  }
}
