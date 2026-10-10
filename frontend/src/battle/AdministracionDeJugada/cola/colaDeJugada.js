/**
 * cola/colaDeJugada.js — Cola de acciones elegidas este turno.
 *
 * SPECT: docs/spects/spect004.md
 *
 * Escribe en configDelTurno respetando el cupo de accionismo.
 * PhaserMaster solo llama aqui al cambiar de fase y al borrar/marcar.
 */

import { anulaPorGolpe } from '../../datosDePotestades/acciones/catalogo.js';
import {
  colocarFantasmaMovilidad,
  cupoAccionismo,
  esAccionDeMovilidad,
  marcarAccionismoGastado,
  quitarFantasmaMovilidad,
} from '../../seleccion/index.js';
import { afectadosPorRayo } from '../../tablero/UtilsTablero.js';
import { buscarAccion, listaDe } from '../comun.js';
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
  if (!fila) return [];

  const quitadas = esAccionDeMovilidad(fila.nombreDeAccion)
    ? lista.filter((f) => esAccionDeMovilidad(f?.nombreDeAccion))
    : [fila];

  const quedan = esAccionDeMovilidad(fila.nombreDeAccion)
    ? lista.filter((f) => !esAccionDeMovilidad(f?.nombreDeAccion))
    : lista.filter((_, i) => i !== indiceLista);

  if (quedan.length === 0) configDelTurno.delete(id);
  else configDelTurno.set(id, quedan);

  quitadas.forEach((f) => {
    if (f.permanente) quitarPermanentePorFila(permanentes, id, f);
  });
  return quitadas;
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

function afectadosDeFila(id, nombreDeAccion, objetivo, escena) {
  if (!anulaPorGolpe(nombreDeAccion) || !objetivo) return undefined;
  const origen = escena.registro?.obtenerPorId?.(id)?.potestad?.datos?.posicion;
  const ids = afectadosPorRayo(origen, objetivo, escena.tablero, id).map((a) => a.id);
  return ids;
}

/** Escribe la eleccion en configDelTurno. */
export function registrarEleccion(escena, { id, nombreDeAccion, objetivo, azar }) {
  const entrada = escena.registro?.obtenerPorId(id);
  const cupo = cupoAccionismo(entrada?.potestad);
  if (cupo < 1) return 'nada';
  const afectados = afectadosDeFila(id, nombreDeAccion, objetivo, escena);
  const { lista, gastada } = apilarAccion(
    escena.configDelTurno, escena.permanentes, id,
    { id, nombreDeAccion, objetivo, azar: azar ?? null, ...(afectados ? { afectados } : {}) },
    cupo,
  );
  if (gastada) marcarAccionismoGastado(entrada?.potestad);
  actualizarFantasmaMovilidad(entrada?.potestad, lista, escena, escena.administrador?.tileSize);
  return 'ok';
}
