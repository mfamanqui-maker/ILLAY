/**
 * negociacion/faseTipo1.js — Segunda capa de configtype1 (escudar y similares).
 *
 * SPECT: docs/spects/spect004.md
 *
 * Tras Recibir_Config_Acciones: 0 o 1 amenazado se rellena solo; si hay
 * varios, se pide clic. PhaserMaster guarda idsPendientes y _sesionTipo1;
 * este archivo decide que filas faltan y si ya se puede mandar _Final.
 */

import { seleccionarObjetivos } from '../../seleccion/index.js';
import {
  abrirSesionTipo1,
  cerrarSeleccionTipo1,
  pintarPasoTipo1,
} from '../../sistemaDeOrbes/seleccionTipo1.js';
import { buscarAccion, filasDeConfig, listaDe } from '../comun.js';
import { parchearObjetivoTipo1 } from '../cola/colaDeJugada.js';
import { esConfigFinal } from './negociadorDeRonda.js';

export function ctxSeleccionTipo1(registro, configRival, tablero, entrada) {
  return {
    potestades: registro?.todos?.() ?? [],
    origen: entrada?.potestad?.datos?.posicion,
    origenPotestad: entrada?.potestad,
    configuracionRival: configRival,
    tablero,
  };
}

/**
 * Recorre TODAS las filas configtype1 sin objetivo, no solo idsPendientes:
 * con 0/1 amenazado filaEsperaRival ya no la cuenta como pendiente, pero
 * el objetivo automatico hay que escribirlo aqui antes del _Final.
 */
export function recolectarColaTipo1(configDelTurno, registro, configRival, tablero) {
  const cola = [];
  [...(configDelTurno?.keys?.() ?? [])].forEach((id) => {
    listaDe(configDelTurno, id).forEach((fila) => {
      if (fila.objetivo != null) return;
      const entrada = registro?.obtenerPorId(id);
      const accion = buscarAccion(entrada?.potestad, fila.nombreDeAccion);
      if (!accion || !String(accion.type ?? accion.tipo ?? '').toLowerCase().includes('configtype1')) return;
      const sel = seleccionarObjetivos(accion, ctxSeleccionTipo1(registro, configRival, tablero, entrada));
      if (sel.tipo === 'automatico') {
        fila.objetivo = sel.objetivoAuto ?? null;
        return;
      }
      if (sel.tipo === 'entidad') {
        cola.push({ id, accion, potestad: entrada?.potestad, candidatos: sel.candidatos });
      }
    });
  });
  return cola;
}

export function cerrarSesionTipo1(escena) {
  if (!escena?._sesionTipo1) return;
  cerrarSeleccionTipo1(escena._sesionTipo1);
  escena._sesionTipo1 = null;
}

export async function recorrerColaTipo1(escena, cola) {
  escena.orbesSistema?.onDeseleccionar();
  escena.seleccion = null;
  escena._sesionTipo1 = abrirSesionTipo1(escena, {
    configuracionRival: escena.configRival,
    potestades: escena.registro?.todos?.() ?? [],
    tablero: escena.tablero,
  });
  try {
    for (const paso of cola) {
      escena.seleccion = { entidad: paso.potestad };
      const elegido = await pintarPasoTipo1(escena._sesionTipo1, {
        defensor: paso.potestad,
        candidatos: paso.candidatos,
      });
      parchearObjetivoTipo1(escena.configDelTurno, escena.registro, paso.id, paso.accion?.nombre, elegido);
    }
  } finally {
    cerrarSesionTipo1(escena);
  }
}

export function faseTipo1Cerrada(configDelTurno, registro, configRival, tablero) {
  return esConfigFinal(filasDeConfig(configDelTurno), registro, configRival, tablero);
}
