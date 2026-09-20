/**
 * registroJugadas.js — Forma y mutaciones del registro de batalla (spect 001).
 */

import { datosDeEntidad } from '../../datosDePotestades/IndexDePotestades.js';

/** @returns {{ turnos: Array<object> }} */
export function crearRegistroVacio() {
  return { turnos: [] };
}

function mismaId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function etiquetaDe(datos, indiceEnBando) {
  const arquetipo = datos?.arquetipo;
  if (arquetipo) return String(arquetipo);
  return `Potestad ${indiceEnBando + 1}`;
}

function instantaneaPotestad(potestad, indiceEnBando) {
  const datos = datosDeEntidad(potestad);
  const stats = datos?.estadisticas ?? {};
  return {
    idPotestad: datos?.id ?? null,
    etiqueta: etiquetaDe(datos, indiceEnBando),
    arquetipo: datos?.arquetipo ?? null,
    nivel: datos?.nivel ?? null,
    bando: datos?.bando ?? null,
    posicion: datos?.posicion ? { ...datos.posicion } : { x: null, y: null },
    estadisticas: { ...stats },
    constantes: { ...(datos?.constantes ?? {}) },
    hp: stats.hp ?? 0,
    hpMax: stats.hpMax ?? stats.hp ?? 0,
    escudos: stats.escudos ?? 0,
    acciones: [],
  };
}

function construirInstantaneaTurno(numero, registroPotestades) {
  const aliados = [];
  const enemigos = [];
  registroPotestades.todos().forEach(({ bando, potestad }) => {
    const lista = bando === 'Enemigos' ? enemigos : aliados;
    lista.push(instantaneaPotestad(potestad, lista.length));
  });
  return {
    numero,
    aliados,
    enemigos,
    grupos: [],
  };
}

export function registrarTurnoInicial(registro, registroPotestades) {
  if (!registro || !registroPotestades) return registro;
  registro.turnos = [construirInstantaneaTurno(0, registroPotestades)];
  return registro;
}

export function registrarNuevoTurno(registro, registroPotestades) {
  const numero = registro.turnos.length;
  registro.turnos.push(construirInstantaneaTurno(numero, registroPotestades));
  return registro;
}

function idDeObjetivo(objetivo) {
  if (objetivo == null) return null;
  if (typeof objetivo === 'object') {
    if (objetivo.id != null) return objetivo.id;
    if (Number.isFinite(Number(objetivo.x))) {
      return { x: Number(objetivo.x), y: Number(objetivo.y) };
    }
  }
  return objetivo;
}

/**
 * Tarea del guion → jugada plana del registro (spect 001).
 * Sobrevive a JSON.stringify: nada de sprites ni funciones.
 */
export function jugadaDesdeTarea(tarea, turno) {
  const objetivo = tarea?.objetivo;
  return {
    turno,
    grupoVelocidad: tarea?.grupoVelocidad ?? 0,
    bando: tarea?.bando ?? tarea?.potestad?.bando ?? null,
    idPotestad: tarea?.potestad?.id ?? tarea?.potestadId ?? tarea?.id ?? null,
    nombreAccion: tarea?.nombreDeAccion ?? tarea?.accion?.nombre ?? 'accion',
    idObjetivo: idDeObjetivo(objetivo),
    efecto: tarea?.efecto ?? null,
    cancelada: !!tarea?.anulada,
  };
}

function aplicarEfectoEnInstantanea(potestadSnap, efecto) {
  if (!efecto || typeof efecto !== 'object') return;
  if (efecto.hp != null) {
    potestadSnap.hp = (potestadSnap.hp ?? 0) + efecto.hp;
    if (potestadSnap.estadisticas) potestadSnap.estadisticas.hp = potestadSnap.hp;
  }
  if (efecto.escudos != null) {
    potestadSnap.escudos = (potestadSnap.escudos ?? 0) + efecto.escudos;
    if (potestadSnap.estadisticas) potestadSnap.estadisticas.escudos = potestadSnap.escudos;
  }
  if (efecto.posicion) {
    potestadSnap.posicion = { ...efecto.posicion };
  }
  Object.entries(efecto).forEach(([clave, valor]) => {
    if (clave === 'hp' || clave === 'escudos' || clave === 'posicion') return;
    if (potestadSnap.estadisticas && clave in potestadSnap.estadisticas) {
      potestadSnap.estadisticas[clave] = valor;
    }
  });
}

function entradaAccion(jugada) {
  return {
    nombre: jugada.nombreAccion ?? jugada.nombreDeAccion ?? 'accion',
    idObjetivo: jugada.idObjetivo ?? null,
    cancelada: !!jugada.cancelada,
    efecto: jugada.efecto ?? null,
  };
}

export function anotarJugadaEnRegistro(registro, jugada) {
  if (!registro?.turnos?.length || !jugada) return registro;
  const turno = registro.turnos[registro.turnos.length - 1];
  const velocidad = jugada.grupoVelocidad ?? 0;
  let grupo = turno.grupos.find((g) => g.velocidad === velocidad);
  if (!grupo) {
    grupo = { velocidad, jugadas: [] };
    turno.grupos.push(grupo);
  }
  grupo.jugadas.push({ ...jugada });

  const lista = jugada.bando === 'Enemigos' ? turno.enemigos : turno.aliados;
  const lanzador = lista.find((p) => mismaId(p.idPotestad, jugada.idPotestad));
  if (lanzador) lanzador.acciones.push(entradaAccion(jugada));

  const idAfectado = (jugada.idObjetivo != null && typeof jugada.idObjetivo !== 'object')
    ? jugada.idObjetivo
    : jugada.idPotestad;
  const afectado = (turno.aliados.concat(turno.enemigos))
    .find((p) => mismaId(p.idPotestad, idAfectado));
  if (afectado) aplicarEfectoEnInstantanea(afectado, jugada.efecto);
  return registro;
}
