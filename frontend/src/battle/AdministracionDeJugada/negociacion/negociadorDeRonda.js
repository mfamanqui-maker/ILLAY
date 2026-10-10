/**
 * PhaserMaster es dueno del estado; este archivo es el comportamiento de la
 * ronda. Recibe el Map de configDelTurno y un transporte inyectado: socket
 * o, mas adelante, una IA con la misma forma { id, nombreDeAccion, objetivo, azar }.
 *
 * El escudo (configtype1) no elige objetivo aqui: solo obliga a pedir la
 * config del rival. Cuando llega, la ronda es final y pasa a precombate.
 */

import { anulaPorGolpe } from '../../datosDePotestades/acciones/catalogo.js';
import { costeDeAccion, ganarAccionismoExtra, gastarFichas } from '../../datosDePotestades/acciones/diana.js';
import { abrirFaseEscudo } from '../../faseEscudo.js';
import { afectadosPorRayo } from '../../tablero/UtilsTablero.js';
import { buscarAccion, entradaDe, filasDeConfig, listaDe } from '../comun.js';
import { espejarConfig } from './espejo.js';

export { filasDeConfig };

export function filaEsperaRival(fila, registro, configuracionRival) {
  const entrada = registro?.obtenerPorId?.(fila.id);
  const accion = buscarAccion(entrada?.potestad, fila.nombreDeAccion);
  const tipo = String(accion?.type ?? accion?.tipo ?? '').toLowerCase();
  if (!accion || !tipo.includes('configtype1')) return false;
  return configuracionRival == null;
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
 * Con socket: escucha ANTES de enviar (evita perder un Recibir temprano).
 * Tras recibir al rival se recalcula si ya no hace falta mas datos.
 */
export async function negociar(configDelTurno, { transporte, columnas, registro, haySocket, configuracionRival = null }) {
  const propia = filasDeConfig(configDelTurno);

  if (!haySocket) return { fase: 'precombate', propia, rival: [] };

  let pendiente = transporte.recibirConfigDelRival();
  let final = esConfigFinal(propia, registro, configuracionRival);
  transporte.enviarConfiguracion(espejarConfig(propia, columnas), final);

  while (true) {
    const recibido = await pendiente;
    if (recibido.type === 'Resultado_Partida') {
      return { fase: 'terminada', resultado: recibido.data };
    }

    const rival = normalizarFilas(recibido.data);
    final = esConfigFinal(propia, registro, rival);

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

/**
 * Si hay escudo, pide la config del rival.
 * Escucha ANTES de enviar: si el rival ya confirmo, su mensaje esta en el buzon
 * y el sigue bloqueado hasta que reciba la nuestra.
 * Si nosotros acabamos primero, el envio no-final lo despierta cuando confirme.
 */
export async function buscarInformacionDeRival(configDelTurno, { transporte, columnas, haySocket } = {}) {
  if (!haySocket || !transporte?.recibirConfigDelRival) return null;
  let pideInfo = false;
  for (const [, filas] of configDelTurno) {
    const lista = Array.isArray(filas) ? filas : [filas];
    if (lista.some((fila) => fila?.nombreDeAccion === 'escudar')) {
      pideInfo = true;
      break;
    }
  }
  if (!pideInfo) return null;
  const pendiente = transporte.recibirConfigDelRival();
  transporte.enviarConfiguracion(espejarConfig(filasDeConfig(configDelTurno), columnas), false);
  const recibido = await pendiente;
  if (recibido.type === 'Resultado_Partida') {
    return { fase: 'terminada', resultado: recibido.data };
  }
  return { rival: normalizarFilas(recibido.data), esFinal: recibido.esFinal === true };
}

function idDeObjetivo(objetivo) {
  if (objetivo == null) return null;
  if (typeof objetivo !== 'object') return objetivo;
  if (Number.isFinite(Number(objetivo.x))) return null;
  return objetivo.id ?? objetivo.potestadId ?? null;
}

function esObjetivoCasilla(objetivo) {
  return objetivo != null && typeof objetivo === 'object'
    && Number.isFinite(Number(objetivo.x)) && Number.isFinite(Number(objetivo.y));
}

function idsAfectadosDe(fila, registro, tablero) {
  if (Array.isArray(fila?.afectados)) {
    return fila.afectados;
  }
  if (anulaPorGolpe(fila?.nombreDeAccion) && esObjetivoCasilla(fila?.objetivo)) {
    const origen = entradaDe(registro, fila.id)?.potestad?.datos?.posicion;
    return afectadosPorRayo(origen, fila.objetivo, tablero, fila.id).map((a) => a.id);
  }
  const id = idDeObjetivo(fila?.objetivo);
  return id != null ? [id] : [];
}

function anotarAfectados(filas, registro, tablero) {
  (filas ?? []).forEach((fila) => {
    if (!anulaPorGolpe(fila?.nombreDeAccion) || !esObjetivoCasilla(fila?.objetivo)) return;
    const origen = entradaDe(registro, fila.id)?.potestad?.datos?.posicion;
    fila.afectados = afectadosPorRayo(origen, fila.objetivo, tablero, fila.id).map((a) => a.id);
  });
}

function idsDeBando(registro, bando, fallback = []) {
  const ids = (registro?.porBando?.(bando) ?? []).map(({ potestad }) => String(potestad.id));
  return new Set(ids.length > 0 ? ids : fallback);
}

function ordenEstable(a, b) {
  const porId = String(a?.id ?? '').localeCompare(String(b?.id ?? ''), 'en', { numeric: true });
  if (porId !== 0) return porId;
  return String(a?.nombreDeAccion ?? '').localeCompare(String(b?.nombreDeAccion ?? ''));
}

function filasHacia(filas, idsBlanco, registro, tablero) {
  const out = [];
  (filas ?? []).forEach((fila) => {
    idsAfectadosDe(fila, registro, tablero).forEach((idBlanco) => {
      if (!idsBlanco.has(String(idBlanco))) return;
      out.push({ ...fila, objetivo: idBlanco });
    });
  });
  return out;
}

function escudosDe(filas) {
  return (filas ?? []).filter((fila) => fila?.nombreDeAccion === 'escudar');
}

function sinEscudar(filas) {
  return (filas ?? []).filter((fila) => fila?.nombreDeAccion !== 'escudar');
}

function emparejarEscudos(defensores, atacantes) {
  const def = [...defensores].sort(ordenEstable);
  const atk = [...atacantes].sort(ordenEstable);
  def.forEach((fila, i) => {
    fila.objetivo = idDeObjetivo(atk[i]?.objetivo);
  });
}

function resolverLado(filasDelLado, atacantesHaciaEseLado) {
  const defensores = escudosDe(filasDelLado);
  const nA = atacantesHaciaEseLado.length;
  const nD = defensores.length;
  if (nD === 0) return filasDelLado ?? [];
  if (defensores.every((d) => d.objetivo != null)) return filasDelLado ?? [];
  if (nA === 0) return sinEscudar(filasDelLado);
  if (nD === nA) {
    emparejarEscudos(defensores, atacantesHaciaEseLado);
    return filasDelLado ?? [];
  }
  return filasDelLado ?? [];
}

function publicarType1(ctx) {
  if (!ctx.escena) return;
  ctx.escena.configPropia = ctx.propia;
  ctx.escena.configRival = ctx.rival;
  const cola = ctx.escena.configDelTurno;
  if (cola?.clear) {
    cola.clear();
    (ctx.propia ?? []).forEach((fila) => {
      const lista = listaDe(cola, fila.id);
      lista.push(fila);
      cola.set(fila.id, lista);
    });
  }
}

function casoSinAmenazas(ctx) {
  ctx.propia = sinEscudar(ctx.propia);
  ctx.rival = resolverLado(ctx.rival, ctx.ataquesHaciaEnemigos);
}

function casoEmpateEscudos(ctx) {
  emparejarEscudos(ctx.integrantes.defensores, ctx.integrantes.atacantes);
  ctx.rival = resolverLado(ctx.rival, ctx.ataquesHaciaEnemigos);
}

function aplicarSeleccionEscudo(ctx, resultado) {
  const asignaciones = resultado?.asignaciones ?? [];
  const registro = ctx.escena?.registro;
  const pool = [...ctx.integrantes.defensores];
  asignaciones.forEach((asig) => {
    const fila = pool.find((d) => String(d.id) === String(asig.defensorId) && d.objetivo == null);
    if (fila) fila.objetivo = asig.objetivo;
  });
  ctx.propia = (ctx.propia ?? []).filter((f) => f.nombreDeAccion !== 'escudar' || f.objetivo != null);

  asignaciones.forEach((asig) => {
    const defensor = entradaDe(registro, asig.defensorId)?.potestad;
    const protegido = entradaDe(registro, asig.objetivo)?.potestad;
    if (!defensor || !protegido) return;
    if (!gastarFichas(defensor, costeDeAccion(null, 'escudar'))) return;
    ganarAccionismoExtra(defensor, 1);
    protegido.activacionEscudo = true;
  });

  ctx.rival = resolverLado(ctx.rival, ctx.ataquesHaciaEnemigos);
}

async function casoSeleccionEscudo(ctx) {
  if (!ctx.escena) return;
  const { defensores, atacantes } = ctx.integrantes;
  const resultado = await abrirFaseEscudo(ctx.escena, {
    defensores,
    listaDeProyectiles: atacantes.map((fila) => ({
      idAtacante: fila.id,
      idObjetivo: idDeObjetivo(fila.objetivo),
      nombreDeAccion: fila.nombreDeAccion,
      fila,
    })),
    idsAtacantes: [...new Set(atacantes.map((f) => f.id))],
    idsDefensores: [...new Set(defensores.map((f) => f.id))],
  });
  aplicarSeleccionEscudo(ctx, resultado);
}

async function casoMasDefensores(ctx) {
  await casoSeleccionEscudo(ctx);
}

async function casoMasAtacantes(ctx) {
  await casoSeleccionEscudo(ctx);
}

function armarContextoType1(configuracionRival, configuracionPropia, registro, escena) {
  const propia = configuracionPropia ?? [];
  const rival = configuracionRival ?? [];
  const tablero = escena?.tablero ?? null;
  anotarAfectados(propia, registro, tablero);
  anotarAfectados(rival, registro, tablero);
  const idsAliados = idsDeBando(registro, 'Aliados', propia.map((fila) => String(fila.id)));
  const idsEnemigos = idsDeBando(registro, 'Enemigos');
  const defensores = escudosDe(propia);
  const atacantes = filasHacia(rival, idsAliados, registro, tablero);
  return {
    escena,
    propia,
    rival,
    integrantes: { atacantes, defensores },
    ataquesHaciaEnemigos: filasHacia(propia, idsEnemigos, registro, tablero),
  };
}

export async function utilsType1(configuracionRival, configuracionPropia, registro = null, escena = null) {
  const ctx = armarContextoType1(configuracionRival, configuracionPropia, registro, escena);
  const { atacantes, defensores } = ctx.integrantes;
  const pendientes = defensores.filter((d) => d.objetivo == null);

  if (pendientes.length > 0) {
    ctx.integrantes.defensores = pendientes;
    if (atacantes.length === 0) {
      casoSinAmenazas(ctx);
    } else if (pendientes.length === atacantes.length) {
      casoEmpateEscudos(ctx);
    } else if (pendientes.length > atacantes.length) {
      await casoMasDefensores(ctx);
    } else {
      await casoMasAtacantes(ctx);
    }
  } else {
    ctx.rival = resolverLado(ctx.rival, ctx.ataquesHaciaEnemigos);
  }
  publicarType1(ctx);
}


