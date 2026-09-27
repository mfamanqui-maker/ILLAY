/**
 * colaDeJugada.js — Cola de acciones elegidas y permanentes.
 *
 * Ordena por velocidad, valida objetivos al reinyectar, y respeta el
 * cupo de accionismo al marcar permanentes. PhaserMaster solo llama
 * aqui al cambiar de fase y al borrar/marcar. Las orbes leen los Maps.
 */

import {
  casillaEstaOcupada,
  cupoAccionismo,
  esAccionDeMovilidad,
  estaDentroDeRango,
  marcarAccionismoGastado,
  normalizarCasoSeleccion,
  obtenerRangoAccion,
} from './datosDePotestades/utilidadesDeSeleccion.js';

function listaDe(configDelTurno, id) {
  const prev = configDelTurno?.get?.(id);
  if (Array.isArray(prev)) return prev;
  return prev ? [prev] : [];
}

function buscarAccion(potestad, nombre) {
  return Object.values(potestad?.listaDeAcciones ?? {})
    .flat()
    .find((accion) => accion?.nombre === nombre) ?? null;
}

function entradaDe(registro, id) {
  if (id == null || !registro?.obtenerPorId) return null;
  return registro.obtenerPorId(id) ?? registro.obtenerPorId(Number(id)) ?? null;
}

export function copiaPersistente(fila) {
  return {
    nombreDeAccion: fila.nombreDeAccion,
    objetivo: fila.objetivo ?? null,
    azar: fila.azar ?? null,
  };
}

function mismaAccion(a, b) {
  return a?.nombreDeAccion === b?.nombreDeAccion
    && JSON.stringify(a?.objetivo ?? null) === JSON.stringify(b?.objetivo ?? null)
    && (a?.azar ?? null) === (b?.azar ?? null);
}

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

function idDeObjetivo(objetivo) {
  if (objetivo == null || typeof objetivo !== 'object') return objetivo;
  if (Number.isFinite(Number(objetivo.x))) return null;
  return objetivo.id ?? objetivo.potestadId ?? null;
}

function casillaSigueValida(fila, accion, origen, tablero) {
  const dest = { x: Number(fila.objetivo?.x), y: Number(fila.objetivo?.y) };
  if (!Number.isFinite(dest.x) || !Number.isFinite(dest.y)) return false;
  if (!estaDentroDeRango(origen, dest, obtenerRangoAccion(accion))) return false;
  const casilla = tablero?.[dest.y - 1]?.[dest.x - 1];
  if (!casilla || casilla.id === 0) return false;
  const permite = accion.permiteCasillaOcupada === true
    || esAccionDeMovilidad(accion.nombre)
    || String(accion.nombre ?? '').toLowerCase() === 'rayo de magia';
  return permite || !casillaEstaOcupada(casilla);
}

function entidadSigueValida(fila, accion, origen, registro, caso) {
  const idObj = idDeObjetivo(fila.objetivo);
  const entrada = entradaDe(registro, idObj);
  const potestad = entrada?.potestad;
  if (!potestad) return false;
  const hp = Number(potestad.estadisticas?.hp ?? 0);
  if (potestad.muerta || hp <= 0) return false;
  if (caso.bandos?.length && !caso.bandos.includes(entrada.bando)) return false;
  return estaDentroDeRango(origen, potestad.datos?.posicion, obtenerRangoAccion(accion));
}

export function objetivoSigueValido(fila, potestad, registro, tablero) {
  const accion = buscarAccion(potestad, fila?.nombreDeAccion);
  if (!accion) return false;
  const caso = normalizarCasoSeleccion(accion.type ?? accion.tipo);
  if (caso.tipo === 'automatico' || caso.tipo === 'posterior') return true;
  const origen = potestad?.datos?.posicion;
  if (caso.tipo === 'casilla') return casillaSigueValida(fila, accion, origen, tablero);
  return entidadSigueValida(fila, accion, origen, registro, caso);
}

export function quitarPermanentePorFila(permanentes, id, fila) {
  const guardadas = permanentes?.get?.(id) ?? [];
  const idx = guardadas.findIndex((g) => mismaAccion(g, fila));
  if (idx < 0) return;
  guardadas.splice(idx, 1);
  if (guardadas.length === 0) permanentes.delete(id);
  else permanentes.set(id, guardadas);
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

export function conmutarPermanente(permanentes, configDelTurno, id, indiceLista, cupo) {
  const lista = listaDe(configDelTurno, id);
  const fila = lista[indiceLista];
  if (!fila || !permanentes) return 'nada';
  const guardadas = permanentes.get(id) ?? [];
  if (fila.permanente) {
    fila.permanente = false;
    quitarPermanentePorFila(permanentes, id, fila);
    return 'off';
  }
  if (guardadas.length >= cupo) return 'rechazo';
  fila.permanente = true;
  permanentes.set(id, [...guardadas, copiaPersistente(fila)]);
  return 'on';
}

function vigentesDe(guardadas, potestad, registro, tablero, cupo) {
  return (guardadas ?? [])
    .filter((rec) => objetivoSigueValido(rec, potestad, registro, tablero))
    .slice(0, cupo);
}

export function aplicarPermanentes(configDelTurno, permanentes, registro, tablero) {
  if (!permanentes || !registro) return;
  for (const id of [...permanentes.keys()]) {
    const potestad = entradaDe(registro, id)?.potestad;
    if (!potestad || potestad.muerta || Number(potestad.estadisticas?.hp) <= 0) {
      permanentes.delete(id);
      continue;
    }
    const inyectar = vigentesDe(permanentes.get(id), potestad, registro, tablero, cupoAccionismo(potestad));
    if (inyectar.length === 0) {
      permanentes.delete(id);
      continue;
    }
    permanentes.set(id, inyectar.map(copiaPersistente));
    configDelTurno.set(id, inyectar.map((rec) => ({
      id, ...copiaPersistente(rec), permanente: true,
    })));
    inyectar.forEach(() => marcarAccionismoGastado(potestad));
  }
}
