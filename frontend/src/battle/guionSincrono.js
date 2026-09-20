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
  armarResultadoGrupo,
  entradaAnimActiva,
  entradaAnimPasiva,
  claveAnimPasiva,
  tareasNoAnuladas,
} from './utilsEjecucion.js';

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
  const obj = typeof tarea.objetivo === 'object' && tarea.objetivo?.estadisticas
    ? tarea.objetivo
    : null;
  if (obj) {
    const prev = fotoDe(foto, obj.id);
    if (prev) {
      const dHp = Number(obj.estadisticas.hp) - Number(prev.hp);
      if (dHp) return { hp: dHp };
    }
  }
  const lanzador = tarea.potestad;
  if (!lanzador?.estadisticas) return null;
  const prev = fotoDe(foto, lanzador.id);
  if (!prev) return null;
  const efecto = {};
  const dHp = Number(lanzador.estadisticas.hp) - Number(prev.hp);
  if (dHp) efecto.hp = dHp;
  const pos = lanzador.datos?.posicion;
  if (pos && prev.posicion && (Number(pos.x) !== prev.posicion.x || Number(pos.y) !== prev.posicion.y)) {
    efecto.posicion = { x: Number(pos.x), y: Number(pos.y) };
  }
  return Object.keys(efecto).length ? efecto : null;
}

function idObjetivoTarea(tarea) {
  const o = tarea?.objetivo;
  if (o == null) return null;
  if (typeof o === 'object' && o.estadisticas) return o.id;
  if (typeof o === 'object' && Number.isFinite(Number(o.x))) return null;
  return o;
}

function esAtaqueProyectil(tarea) {
  const nombre = tarea?.accion?.nombre ?? tarea?.nombreDeAccion ?? '';
  const tipo = String(tarea?.accion?.tipo ?? '').toLowerCase();
  return tipo.includes('enemigo') || ['atacar', 'rayoDeMagia', 'disparar', 'maldicion'].includes(nombre);
}

/**
 * Escudos / retiros: marca anulada si una pasiva alRecibirProyectil protege al blanco.
 */
export function aplicarCancelaciones(grupo, pila) {
  const tareas = grupo?.tareas ?? [];
  const pasivas = pila?.listar?.() ?? [];
  tareas.forEach((tarea) => {
    if (!esAtaqueProyectil(tarea)) return;
    const idBlanco = idObjetivoTarea(tarea);
    if (idBlanco == null) return;
    const protege = pasivas.some((p) => {
      if (p.momento !== 'alRecibirProyectil') return false;
      try {
        return p.condicion({ objetivo: { id: idBlanco }, tarea }) === true;
      } catch {
        return false;
      }
    });
    if (protege) tarea.anulada = true;
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

/**
 * Resuelve activos del grupo. Apila pasivas nuevas. Verifica momentos.
 * @returns resultado de grupo para show
 */
export function resolverGrupo(grupo, foto, entorno) {
  const pila = entorno.pila;
  const animacionesPasivas = [];
  const resueltas = [];

  tareasNoAnuladas(grupo.tareas).forEach((tarea) => {
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

    const resultado = typeof tarea.ejecutar === 'function'
      ? tarea.ejecutar(ctxBase)
      : null;

    if (resultado?.efectoPasivo) {
      tarea.accionPasiva = resultado.efectoPasivo;
      pila.apilar(resultado.efectoPasivo, tarea);
    }

    const nombre = tarea.accion?.nombre ?? tarea.nombreDeAccion;
    if (nombre === 'moverse') {
      const disparadas = pila.verificar('alMoverseACasilla', ctxBase);
      animacionesPasivas.push(...animsPasivasPorDisparos(disparadas, ctxBase));
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
        const anim = entradaAnimPasiva(tarea.objetivo, claveAnimPasiva('cura'));
        if (anim) animacionesPasivas.push(anim);
      }
    }

    tarea.efecto = efectoDeTarea(tarea, foto);
    resueltas.push(tarea);
  });

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
  return (potestades ?? []).filter(
    (potestad) => Number(potestad?.estadisticas?.hp) <= 0,
  );
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
  return { fin, pila };
}
