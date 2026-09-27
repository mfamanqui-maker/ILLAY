/**
 * cola/colaDeJugada.js — Cola de acciones elegidas este turno.
 *
 * SPECT: docs/spects/spect004.md
 *
 * Escribe en configDelTurno respetando el cupo de accionismo. En la
 * segunda capa de tipo 1 la eleccion no apila: completa el objetivo que
 * faltaba (parchearObjetivoTipo1). PhaserMaster solo llama aqui al cambiar
 * de fase y al borrar/marcar. Las orbes leen los Maps.
 */

import {
  colocarFantasmaMovilidad,
  cupoAccionismo,
  esAccionDeMovilidad,
  marcarAccionismoGastado,
  quitarFantasmaMovilidad,
} from '../../seleccion/index.js';
import { buscarAccion, entradaDe, listaDe } from '../comun.js';
import { aplicarPermanentes, quitarPermanentePorFila } from './permanentes.js';

export function filasDeCola(configDelTurno, id, potestad) {
  return listaDe(configDelTurno, id)
    .map((fila, indiceLista) => {
      const accion = buscarAccion(potestad, fila.nombreDeAccion);
      return {
        fila,
        indiceLista,
        accion,
        velocidad: Number(accion?.velocidad ?? 0),
      };
    })
    .sort((a, b) => b.velocidad - a.velocidad);
}

export function apilarAccion(configDelTurno, permanentes, id, fila, cupo) {
  const lista = listaDe(configDelTurno, id);
  let gastada = false;
  if (lista.length >= cupo) {
    const vieja = lista[lista.length - 1];
    if (vieja?.permanente) quitarPermanentePorFila(permanentes, id, vieja);
    lista[lista.length - 1] = fila;
  } else {
    lista.push(fila);
    gastada = true;
  }
  configDelTurno.set(id, lista);
  return { lista, gastada };
}

export function quitarDeCola(configDelTurno, permanentes, id, indiceLista) {
  const lista = listaDe(configDelTurno, id);
  const fila = lista[indiceLista];
  if (!fila) return null;
  lista.splice(indiceLista, 1);
  if (lista.length === 0) configDelTurno.delete(id);
  else configDelTurno.set(id, lista);
  if (fila.permanente) quitarPermanentePorFila(permanentes, id, fila);
  return fila;
}

/** Rellena el objetivo de un configtype1 / escudar que aun no tenia diana. */
export function parchearObjetivoTipo1(configDelTurno, registro, id, nombreDeAccion, objetivo) {
  const lista = listaDe(configDelTurno, id);
  if (lista.length === 0) return false;
  const fila = lista.find((f) => f.nombreDeAccion === nombreDeAccion && f.objetivo == null)
    ?? lista.find((f) => f.objetivo == null);
  if (!fila) return false;
  const tipo = String(buscarAccion(entradaDe(registro, id)?.potestad, fila.nombreDeAccion)?.type ?? '').toLowerCase();
  if (!tipo.includes('configtype1') && nombreDeAccion !== 'escudar') return false;
  fila.objetivo = objetivo;
  if (nombreDeAccion) fila.nombreDeAccion = nombreDeAccion;
  return true;
}

/** Ultima movilidad de la cola pinta el fantasma; si no hay, se quita. */
export function actualizarFantasmaMovilidad(potestad, lista, escena, tileSize) {
  const mov = [...(lista ?? [])].reverse().find((f) => esAccionDeMovilidad(f?.nombreDeAccion));
  const dest = mov?.objetivo;
  if (dest && Number.isFinite(Number(dest.x)) && Number.isFinite(Number(dest.y))) {
    colocarFantasmaMovilidad(potestad, dest, escena, tileSize ?? 400);
    return;
  }
  if (potestad?.id != null) quitarFantasmaMovilidad(potestad.id);
  if (potestad) potestad.posicionPlanificada = null;
}

export function inyectarPermanentesEnFase(configDelTurno, permanentes, registro, tablero, escena, tileSize) {
  aplicarPermanentes(configDelTurno, permanentes, registro, tablero);
  configDelTurno.forEach((lista, id) => {
    actualizarFantasmaMovilidad(registro.obtenerPorId(id)?.potestad, lista, escena, tileSize);
  });
}

/**
 * Escribe la eleccion en configDelTurno.
 * Devuelve 'cerrarTipo1' si hay que reintentar el _Final.
 */
export function registrarEleccion(escena, { id, nombreDeAccion, objetivo, azar }) {
  const entrada = escena.registro?.obtenerPorId(id);
  if (escena.idsPendientes && parchearObjetivoTipo1(escena.configDelTurno, escena.registro, id, nombreDeAccion, objetivo)) {
    return 'cerrarTipo1';
  }
  const cupo = cupoAccionismo(entrada?.potestad);
  if (cupo < 1) return 'nada';
  const { lista, gastada } = apilarAccion(
    escena.configDelTurno, escena.permanentes, id,
    { id, nombreDeAccion, objetivo, azar: azar ?? null },
    cupo,
  );
  if (gastada) marcarAccionismoGastado(entrada?.potestad);
  actualizarFantasmaMovilidad(entrada?.potestad, lista, escena, escena.administrador?.tileSize);
  return escena.idsPendientes ? 'cerrarTipo1' : 'ok';
}
