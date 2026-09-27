/**
 * guionSincrono.js — Ordena las acciones del turno y resuelve sus efectos.
 *
 * SPECT: docs/spects/spect007.md
 *
 * Parte A — pila principal: activos por velocidad (foto → resolver → muertes).
 * Parte B — pasivas: apilar efectoPasivo y verificar(momento) via pilaPasivas.
 * Show solo anima; este archivo no dibuja.
 *
 * REGLA 10: cancelaciones → resolucion → muertes → animacion (espera show).
 */

import { crearPilaPasivas } from './pilaPasivas.js';
import {
  aplicarMovimientosSimultaneos,
  reconciliarPosicionesEnTablero,
  resolverColisionesDeMovimiento,
} from './tablero/UtilsTablero.js';
import {
  armarResultadoGrupo,
  entradaAnimActiva,
  entradaAnimPasiva,
  claveAnimPasiva,
  tareasNoAnuladas,
} from './utilsEjecucion.js';
import { ponerEfecto, quitarEfecto } from './datosDePotestades/efectosEstado.js';

function obtenerDeRegistro(registro, id) {
  if (id == null || !registro?.obtenerPorId) return undefined;
  return registro.obtenerPorId(id) ?? registro.obtenerPorId(Number(id));
}

function arquetipoDe(potestad) {
  return String(
    potestad?.arquetipo
    ?? potestad?.constructor?.arquetipo
    ?? potestad?.datos?.arquetipo
    ?? '',
  );
}

function buscarDeclarada(potestad, nombre) {
  return Object.values(potestad?.listaDeAcciones ?? {})
    .flat()
    .find((accion) => accion?.nombre === nombre) ?? null;
}

function copiarPotestadStats(potestad) {
  const posicion = potestad?.datos?.posicion;
  return {
    estadisticas: { ...(potestad?.estadisticas ?? {}) },
    nivel: Number(potestad?.nivel ?? potestad?.datos?.nivel ?? 1),
    posicion: posicion
      ? { x: Number(posicion.x), y: Number(posicion.y) }
      : null,
  };
}

function velocidadDeAccion(potestad, nombreAccion) {
  const declarada = buscarDeclarada(potestad, nombreAccion);
  const velocidad = Number(
    declarada?.velocidad ?? potestad?.estadisticas?.velocidad ?? 0,
  );
  return Number.isFinite(velocidad) ? velocidad : 0;
}

function normalizarObjetivo(objetivo, registro) {
  if (objetivo == null) return null;
  if (typeof objetivo === 'object' && Number.isFinite(Number(objetivo.x))) {
    return { x: Number(objetivo.x), y: Number(objetivo.y) };
  }
  const entrada = obtenerDeRegistro(registro, objetivo);
  if (!entrada) return objetivo;
  return arquetipoDe(entrada.potestad) || objetivo;
}

/** Fila serializable → tarea de mapa (sin ejecutar/anim: eso lo pone Index). */
export function tareaDesdeFila(fila, registro) {
  const entrada = obtenerDeRegistro(registro, fila?.id);
  if (!entrada) {
    console.warn('[guionSincrono] Potestad desconocida', fila?.id);
    return null;
  }
  const potestadId = String(entrada.potestad?.id ?? fila.id);
  const nombre = fila?.nombreDeAccion ?? null;
  const arquetipo = arquetipoDe(entrada.potestad);
  return {
    nombre: arquetipo,
    potestadId,
    potestadStats: copiarPotestadStats(entrada.potestad),
    bando: entrada.bando,
    accion: nombre,
    objetivo: normalizarObjetivo(fila?.objetivo ?? null, registro),
    azar: fila?.azar ?? null,
    accionPasiva: null,
    animacion: null,
    _velocidad: velocidadDeAccion(entrada.potestad, nombre),
  };
}

export function construirMapaGuion(filas, registro) {
  const mapa = new Map();
  (Array.isArray(filas) ? filas : []).forEach((fila) => {
    const tarea = tareaDesdeFila(fila, registro);
    if (!tarea) return;
    const velocidad = tarea._velocidad;
    if (!mapa.has(velocidad)) mapa.set(velocidad, []);
    mapa.get(velocidad).push(tarea);
  });
  return mapa;
}

export function loguearMapaGuion(mapa) {
  const plano = Object.fromEntries(
    [...(mapa ?? new Map()).entries()]
      .sort(([a], [b]) => b - a)
      .map(([velocidad, tareas]) => [
        String(velocidad),
        tareas.map(({ _velocidad, ejecutar, reproducir, animacion, ...tarea }) => ({
          ...tarea,
          animacion: animacion ? '[fn]' : null,
          ejecutar: ejecutar ? '[fn]' : null,
        })),
      ]),
  );
  console.log('[guion] mapa por velocidad', plano);
  return plano;
}

export function resolverVelocidad(tarea) {
  if (Number.isFinite(tarea?._velocidad)) return tarea._velocidad;
  if (typeof tarea?.accion === 'object' && tarea.accion != null) {
    const velocidad = Number(
      tarea.accion.velocidad ?? tarea?.potestad?.estadisticas?.velocidad ?? 0,
    );
    return Number.isFinite(velocidad) ? velocidad : 0;
  }
  const desdeStats = Number(tarea?.potestadStats?.estadisticas?.velocidad ?? 0);
  return Number.isFinite(desdeStats) ? desdeStats : 0;
}

export function agruparPorVelocidad(tareas) {
  const grupos = new Map();
  (tareas ?? []).forEach((tarea) => {
    const velocidad = resolverVelocidad(tarea);
    if (!grupos.has(velocidad)) grupos.set(velocidad, []);
    grupos.get(velocidad).push(tarea);
  });

  return Array.from(grupos.entries())
    .sort(([a], [b]) => b - a)
    .map(([velocidad, lista]) => ({ velocidad, tareas: lista }));
}

/** Copia plana de estadisticas + posicion al inicio del grupo. */
export function tomarFoto(potestades) {
  return (potestades ?? []).map((p) => ({
    id: p?.id,
    hp: Number(p?.estadisticas?.hp ?? 0),
    estadisticas: { ...(p?.estadisticas ?? {}) },
    posicion: p?.datos?.posicion
      ? { x: Number(p.datos.posicion.x), y: Number(p.datos.posicion.y) }
      : null,
  }));
}

function fotoDe(foto, id) {
  return (foto ?? []).find((f) => String(f.id) === String(id)) ?? null;
}

/** Delta contra la foto del grupo: lo que el registro de jugadas tiene que guardar. */
function efectoDeTarea(tarea, foto) {
  const efecto = {};
  const obj = typeof tarea.objetivo === 'object' && tarea.objetivo?.estadisticas
    ? tarea.objetivo
    : null;
  if (obj) {
    const prevObj = fotoDe(foto, obj.id);
    if (prevObj) {
      const dHp = Number(obj.estadisticas.hp) - Number(prevObj.hp);
      if (dHp) efecto.hp = dHp;
    }
  }
  const lanzador = tarea.potestad;
  if (!lanzador?.estadisticas) return Object.keys(efecto).length ? efecto : null;
  const prev = fotoDe(foto, lanzador.id);
  if (!prev) return Object.keys(efecto).length ? efecto : null;
  if (efecto.hp == null) {
    const dHp = Number(lanzador.estadisticas.hp) - Number(prev.hp);
    if (dHp) efecto.hp = dHp;
  }
  const pos = lanzador.datos?.posicion;
  if (pos && prev.posicion && (Number(pos.x) !== prev.posicion.x || Number(pos.y) !== prev.posicion.y)) {
    efecto.posicion = { x: Number(pos.x), y: Number(pos.y) };
  }
  const statsPrev = prev.estadisticas ?? {};
  ['magia', 'conocimiento'].forEach((clave) => {
    const d = Number(lanzador.estadisticas[clave] ?? 0) - Number(statsPrev[clave] ?? 0);
    if (d) efecto[clave] = d;
  });
  return Object.keys(efecto).length ? efecto : null;
}

function idObjetivoTarea(tarea) {
  const o = tarea?.objetivo;
  if (o == null) return null;
  if (typeof o === 'object' && o.estadisticas) return o.id;
  if (typeof o === 'object' && Number.isFinite(Number(o.x))) return null;
  return o;
}

function nombreDeTarea(tarea) {
  return String(tarea?.accion?.nombre ?? tarea?.nombreDeAccion ?? '').trim();
}

function esMovilidadNombre(nombre) {
  const n = String(nombre ?? '').trim().toLowerCase();
  return n === 'moverse' || n === 'movilidad rapida' || n === 'movilidad lenta';
}

function esAtaqueProyectil(tarea) {
  const nombre = nombreDeTarea(tarea).toLowerCase().replace(/\s+/g, '');
  const tipo = String(tarea?.accion?.tipo ?? tarea?.accion?.type ?? '').toLowerCase();
  return tipo.includes('enemigo')
    || ['atacar', 'rayodemagia', 'disparar', 'maldicion'].includes(nombre);
}

function blancoDeTarea(tarea) {
  const o = tarea?.objetivo;
  return (o && typeof o === 'object' && o.estadisticas) ? o : null;
}

function soltarCaza(registro, marca) {
  const cazador = obtenerDeRegistro(registro, marca?.idCazador)?.potestad;
  if (!cazador) return;
  cazador.cazaActiva = false;
  if (cazador.estadisticas) cazador.estadisticas.apuntando = null;
  quitarEfecto(cazador, 'caza');
}

function aplicarMarcaApuntarPorMovimiento(tarea, registro) {
  const marcado = tarea?.potestad;
  if (!marcado?.marcadoApuntar || !marcado.estadisticas) return false;
  if (!esMovilidadNombre(nombreDeTarea(tarea))) return false;
  const marca = marcado.marcadoApuntar;
  if (marcado.pactoActivo) {
    marcado.marcadoApuntar = null;
    soltarCaza(registro, marca);
    return false;
  }
  const dano = Number(marca.dano ?? 3);
  marcado.estadisticas.hp = Number(marcado.estadisticas.hp ?? 0) - dano;
  marcado.marcadoApuntar = null;
  soltarCaza(registro, marca);
  return true;
}

function esRayoDeMagia(tarea) {
  return nombreDeTarea(tarea).toLowerCase().replace(/\s+/g, '') === 'rayodemagia';
}

/**
 * Escudos / retiros: anula proyectiles single-target cuyo blanco esta protegido.
 * El rayo NO se anula entero aqui: se filtra hit a hit en rayoDeMagia.
 */
export function aplicarCancelaciones(grupo, pila) {
  const tareas = grupo?.tareas ?? [];
  tareas.forEach((tarea) => {
    // Muerta en un grupo anterior: no actua en los siguientes.
    // Dentro del mismo grupo todas resuelven contra la foto (regla 10).
    if (Number(tarea?.potestad?.estadisticas?.hp ?? 0) <= 0 || tarea?.potestad?.muerta) {
      tarea.anulada = true;
      return;
    }
    const blanco = blancoDeTarea(tarea);
    if (esAtaqueProyectil(tarea) && blanco?.pactoActivo) {
      tarea.anulada = true;
      return;
    }
    if (!esAtaqueProyectil(tarea) || esRayoDeMagia(tarea)) return;
    const idBlanco = idObjetivoTarea(tarea);
    if (idBlanco == null) return;
    let anulado = false;
    const disparadas = pila?.verificar?.('alRecibirProyectil', {
      objetivo: blanco ?? { id: idBlanco },
      tarea,
      anular: () => { anulado = true; },
      dano: 0,
    }) ?? [];
    if (anulado || disparadas.length > 0) tarea.anulada = true;
  });
  return {
    ...grupo,
    tareas,
    anuladas: tareas.filter((t) => t.anulada),
  };
}

function contextoDeTarea(tarea, entorno, extras = {}) {
  return {
    tarea,
    tablero: entorno.tablero,
    escena: entorno.escena,
    eventos: entorno.eventos,
    registro: entorno.registro,
    pila: entorno.pila,
    tamanoCasilla: entorno.tamanoCasilla ?? 400,
    ...extras,
  };
}

function animsPasivasPorDisparos(disparadas, ctx) {
  const out = [];
  disparadas.forEach((item) => {
    const potestad = ctx?.objetivo?.estadisticas
      ? ctx.objetivo
      : ctx?.tarea?.potestad;
    if (!potestad) return;
    const entrada = entradaAnimPasiva(potestad, claveAnimPasiva('dano'));
    if (entrada) out.push(entrada);
  });
  return out;
}

function esPonerTrampa(tarea) {
  return String(tarea?.accion?.nombre ?? tarea?.nombreDeAccion ?? '')
    .trim()
    .toLowerCase() === 'poner trampa';
}

function esTareaDeMovilidad(tarea) {
  return esMovilidadNombre(tarea?.accion?.nombre ?? tarea?.nombreDeAccion);
}

/**
 * Resuelve activos del grupo. Apila pasivas nuevas. Verifica momentos.
 * Orden dentro del grupo:
 *   1) trampas (el suelo cambia)
 *   2) movimientos simultaneos (salen / entran casillas)
 *   3) resto (rayos, ataques… usan el tablero ya movido)
 * Asi quien sale del rayo en el mismo tick no recibe el golpe, y quien
 * pisa una trampa recien puesta si.
 * @returns resultado de grupo para show
 */
export function resolverGrupo(grupo, foto, entorno) {
  const pila = entorno.pila;
  const animacionesPasivas = [];
  const resueltas = [];

  const potestadesTablero = entorno.registro?.todos?.().map((e) => e.potestad) ?? [];
  reconciliarPosicionesEnTablero(potestadesTablero, entorno.tablero);
  resolverColisionesDeMovimiento(grupo.tareas, entorno.tablero);

  const pendientes = tareasNoAnuladas(grupo.tareas);
  const movimientos = pendientes.filter(esTareaDeMovilidad);
  const trampas = pendientes.filter((t) => !esTareaDeMovilidad(t) && esPonerTrampa(t));
  const resto = pendientes.filter((t) => !esTareaDeMovilidad(t) && !esPonerTrampa(t));

  const procesarTarea = (tarea, { saltarEjecutar = false } = {}) => {
    const ctxBase = contextoDeTarea(tarea, entorno, { foto });
    let anuladoPorPasiva = false;
    const ctxDano = {
      ...ctxBase,
      objetivo: typeof tarea.objetivo === 'object' ? tarea.objetivo : null,
      anular: () => { anuladoPorPasiva = true; },
      dano: null,
    };

    if (esAtaqueProyectil(tarea)) {
      pila.verificar('alRecibirProyectil', ctxDano);
    }

    if (anuladoPorPasiva || tarea.anulada) {
      tarea.anulada = true;
      tarea.efecto = null;
      return;
    }

    const hpAntes = Number(
      (typeof tarea.objetivo === 'object' && tarea.objetivo?.estadisticas)
        ? tarea.objetivo.estadisticas.hp
        : NaN,
    );

    if (!saltarEjecutar) {
      const resultado = typeof tarea.ejecutar === 'function'
        ? tarea.ejecutar(ctxBase)
        : null;

      if (resultado?.efectoPasivo) {
        tarea.accionPasiva = resultado.efectoPasivo;
        pila.apilar(resultado.efectoPasivo, tarea);
      }
    }

    const nombre = tarea.accion?.nombre ?? tarea.nombreDeAccion;
    if (esMovilidadNombre(nombre)) {
      const disparadas = pila.verificar('alMoverseACasilla', ctxBase);
      animacionesPasivas.push(...animsPasivasPorDisparos(disparadas, ctxBase));
      if (aplicarMarcaApuntarPorMovimiento(tarea, entorno.registro)) {
        const anim = entradaAnimPasiva(tarea.potestad, claveAnimPasiva('dano'));
        if (anim) animacionesPasivas.push(anim);
      }
    }
    if (tarea.trampaPisada) {
      const anim = entradaAnimPasiva(tarea.potestad, claveAnimPasiva('dano'));
      if (anim) animacionesPasivas.push(anim);
    }

    const disparadasAccion = pila.verificar('alHacerAccion', ctxBase);
    animacionesPasivas.push(...animsPasivasPorDisparos(disparadasAccion, ctxBase));

    if (typeof tarea.objetivo === 'object' && tarea.objetivo?.estadisticas) {
      const hpDespues = Number(tarea.objetivo.estadisticas.hp);
      if (Number.isFinite(hpAntes) && hpDespues < hpAntes) {
        const ctxRecibir = {
          ...ctxBase,
          objetivo: tarea.objetivo,
          dano: hpAntes - hpDespues,
        };
        const disparadas = pila.verificar('alRecibirDano', ctxRecibir);
        animacionesPasivas.push(...animsPasivasPorDisparos(disparadas, ctxRecibir));
        const anim = entradaAnimPasiva(tarea.objetivo, claveAnimPasiva('dano'));
        if (anim) animacionesPasivas.push(anim);
      } else if (Number.isFinite(hpAntes) && hpDespues > hpAntes) {
        const tipo = hpAntes <= 0 ? 'revivir' : 'cura';
        if (hpAntes <= 0 && tarea.objetivo) {
          tarea.objetivo.muerta = false;
          tarea.objetivo._muerteAnimada = false;
          tarea.objetivo.aplicarCuerpoVivo?.(entorno.escena);
        }
        const anim = entradaAnimPasiva(tarea.objetivo, claveAnimPasiva(tipo));
        if (anim) animacionesPasivas.push(anim);
      }
    }

    tarea.efecto = efectoDeTarea(tarea, foto);
    resueltas.push(tarea);
  };

  trampas.forEach((tarea) => procesarTarea(tarea));
  aplicarMovimientosSimultaneos(movimientos, entorno.tablero);
  reconciliarPosicionesEnTablero(potestadesTablero, entorno.tablero);
  movimientos.forEach((tarea) => procesarTarea(tarea, { saltarEjecutar: true }));

  // Escudos / setups antes que proyectiles del mismo tick; luego cancelar.
  const restoSetup = resto.filter((t) => !esAtaqueProyectil(t));
  const restoProyectiles = resto.filter((t) => esAtaqueProyectil(t));
  restoSetup.forEach((tarea) => procesarTarea(tarea));
  aplicarCancelaciones({ tareas: restoProyectiles }, pila);
  restoProyectiles.filter((t) => !t.anulada).forEach((tarea) => procesarTarea(tarea));

  const animacionesActivas = resueltas
    .map((t) => entradaAnimActiva(t))
    .filter(Boolean);

  return armarResultadoGrupo({
    tareas: resueltas,
    animacionesActivas,
    animacionesPasivas,
    anuladas: (grupo.tareas ?? []).filter((t) => t.anulada),
  });
}

export function detectarMuertes(potestades) {
  return (potestades ?? []).filter((potestad) => {
    const muertaAhora = Number(potestad?.estadisticas?.hp) <= 0;
    if (!muertaAhora) return false;
    if (potestad._muerteAnimada) return false;
    potestad.muerta = true;
    potestad._muerteAnimada = true;
    ponerEfecto(potestad, 'muerto');
    return true;
  });
}

export function evaluarFinBatalla(aliadosVivos, enemigosVivos) {
  if (aliadosVivos === 0 && enemigosVivos === 0) return 'empate';
  if (enemigosVivos === 0) return 'victoria';
  if (aliadosVivos === 0) return 'derrota';
  return null;
}

function contarVivos(registro, bando) {
  return (registro?.porBando?.(bando) ?? [])
    .filter(({ potestad }) => Number(potestad?.estadisticas?.hp ?? 0) > 0)
    .length;
}

function flatTareas(entrada) {
  if (entrada instanceof Map) {
    return [...entrada.values()].flat();
  }
  if (Array.isArray(entrada)) return entrada;
  return [];
}

/**
 * Bucle del turno. contexto: { escena, tablero, eventos, registro, reproducirGrupo, onJugada }
 */
export async function ejecutarTurno(tareasOMapa, contexto = {}) {
  const pila = contexto.pila ?? crearPilaPasivas();
  const entorno = {
    escena: contexto.escena,
    tablero: contexto.tablero,
    eventos: contexto.eventos,
    registro: contexto.registro,
    pila,
    tamanoCasilla: contexto.tamanoCasilla ?? 400,
  };
  const reproducir = contexto.reproducirGrupo
    ?? (async () => {});

  const grupos = agruparPorVelocidad(flatTareas(tareasOMapa));
  let fin = null;

  for (const grupo of grupos) {
    aplicarCancelaciones(grupo, pila);
    const potestades = contexto.registro?.todos?.().map((e) => e.potestad) ?? [];
    const foto = tomarFoto(potestades);
    const resultado = resolverGrupo(grupo, foto, entorno);

    const muertes = detectarMuertes(potestades);
    muertes.forEach((p) => {
      const anim = entradaAnimPasiva(p, claveAnimPasiva('muerte'));
      if (anim) resultado.animacionesPasivas.push(anim);
    });

    (grupo.tareas ?? []).forEach((tarea) => {
      contexto.onJugada?.({
        ...tarea,
        grupoVelocidad: grupo.velocidad,
      });
      entorno.eventos?.emit?.('jugadaEjecutada', tarea);
    });

    await reproducir(resultado, entorno);

    const vivosA = contarVivos(contexto.registro, 'Aliados');
    const vivosE = contarVivos(contexto.registro, 'Enemigos');
    fin = evaluarFinBatalla(vivosA, vivosE);
    if (fin) break;
  }

  pila.limpiar();
  (contexto.registro?.todos?.() ?? []).forEach(({ potestad }) => {
    if (potestad) potestad.pactoActivo = false;
  });
  return { fin, pila };
}
