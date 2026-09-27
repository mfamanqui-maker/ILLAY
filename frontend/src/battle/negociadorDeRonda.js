/**
 * negociadorDeRonda.js — Bucle config1 -> configN -> precombate.
 *
 * SPECT: docs/spects/spect004.md y 010.
 *
 * PhaserMaster es dueno del estado; este archivo es el comportamiento de la
 * ronda. Recibe el Map de configDelTurno y un transporte inyectado: socket
 * o, mas adelante, una IA con la misma forma { id, nombreDeAccion, objetivo, azar }.
 *
 * Cada cliente piensa en SU tablero. Solo las coordenadas de casilla se
 * espejan al enviar: x' = columnas + 1 - x (POV del rival en el cable).
 * Al recibir, el payload ya viene en POV local (el rival espejo al mandar);
 * no se vuelve a espejar. Los ids / arquetipos no se tocan.
 */

import { seleccionarObjetivos } from './datosDePotestades/utilidadesDeSeleccion.js';

export function espejarObjetivo(objetivo, columnas) {
  if (objetivo == null || typeof objetivo !== 'object') return objetivo;
  if (!Number.isFinite(Number(objetivo.x)) || !Number.isFinite(columnas)) return objetivo;
  return { x: columnas + 1 - Number(objetivo.x), y: Number(objetivo.y) };
}

export function espejarAzar(azar, columnas) {
  if (azar == null || typeof azar !== 'object') return azar;
  const out = { ...azar };
  if (azar.rebote) out.rebote = espejarObjetivo(azar.rebote, columnas);
  if (azar.pretendido) out.pretendido = espejarObjetivo(azar.pretendido, columnas);
  return out;
}

export function espejarConfig(filas, columnas) {
  return (Array.isArray(filas) ? filas : []).map((fila) => ({
    ...fila,
    objetivo: espejarObjetivo(fila.objetivo, columnas),
    azar: espejarAzar(fila.azar, columnas),
  }));
}

function buscarAccion(potestad, nombre) {
  return Object.values(potestad?.listaDeAcciones ?? {})
    .flat()
    .find((accion) => accion?.nombre === nombre) ?? null;
}

export function filasDeConfig(configDelTurno) {
  return [...(configDelTurno?.values?.() ?? [])]
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .map(({ id, nombreDeAccion, objetivo, azar }) => ({
      id, nombreDeAccion, objetivo, azar: azar ?? null,
    }));
}

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
