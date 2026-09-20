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

export function espejarConfig(filas, columnas) {
  return (Array.isArray(filas) ? filas : []).map((fila) => ({
    ...fila,
    objetivo: espejarObjetivo(fila.objetivo, columnas),
  }));
}

function buscarAccion(potestad, nombre) {
  return Object.values(potestad?.listaDeAcciones ?? {})
    .flat()
    .find((accion) => accion?.nombre === nombre) ?? null;
}

export function filasDeConfig(configDelTurno) {
  return [...(configDelTurno?.values?.() ?? [])];
}

/** Una fila espera al rival si su type es configtype1 y aun no hay su config. */
export function filaEsperaRival(fila, registro, configuracionRival) {
  const entrada = registro?.obtenerPorId?.(fila.id);
  const accion = buscarAccion(entrada?.potestad, fila.nombreDeAccion);
  if (!accion) return false;
  const seleccion = seleccionarObjetivos(accion, {
    potestades: registro?.todos?.() ?? [],
    origen: entrada?.potestad?.datos?.posicion,
    configuracionRival,
  });
  return seleccion.esperaRival === true;
}

export function esConfigFinal(filas, registro, configuracionRival) {
  return !filas.some((fila) => filaEsperaRival(fila, registro, configuracionRival));
}

export function idsQueEsperanRival(filas, registro, configuracionRival) {
  return filas
    .filter((fila) => filaEsperaRival(fila, registro, configuracionRival))
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
}) {
  const propia = filasDeConfig(configDelTurno);
  const final = esConfigFinal(propia, registro, configuracionRival);

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
      idsPendientes: idsQueEsperanRival(propia, registro, rival),
    };
  }
}
