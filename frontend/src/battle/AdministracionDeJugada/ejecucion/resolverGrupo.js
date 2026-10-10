/**
 * ejecucion/resolverGrupo.js — Resuelve un grupo de velocidad, fase a fase.
 *
 * SPECT: docs/spects/spect007.md
 *
 * Orden de fases (lo dicta el catalogo de acciones):
 *   1) trampa        el suelo cambia antes de que nadie pise
 *   2) movimiento    todos a la vez (aplicarMovimientosSimultaneos)
 *   3) preparacion   escudos, curas, directos: apilan pasivas
 *   4) proyectil     tras cancelar los que bloquea una pasiva
 * Asi quien sale del rayo en el mismo tick no recibe el golpe, y quien
 * pisa una trampa recien puesta si. Este archivo no dibuja.
 */

import {
  aplicarMovimientosSimultaneos,
  reconciliarPosicionesEnTablero,
  resolverColisionesDeMovimiento,
} from '../../tablero/UtilsTablero.js';
import { quitarEfecto } from '../../datosDePotestades/efectosEstado.js';
import { entradaDe } from '../comun.js';
import { aplicarCancelaciones } from './cancelaciones.js';
import {
  armarResultadoGrupo,
  claveAnimPasiva,
  entradaAnimActiva,
  entradaAnimBloqueada,
  entradaAnimEscudo,
  entradaAnimPasiva,
  tareasNoAnuladas,
} from './contratoShow.js';
import { efectoDeTarea } from './foto.js';
import { MOMENTOS } from './pilaPasivas.js';
import { faseDeTarea } from './tareasActivas.js';

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

function soltarCaza(registro, marca) {
  const cazador = entradaDe(registro, marca?.idCazador)?.potestad;
  if (!cazador) return;
  cazador.cazaActiva = false;
  if (cazador.estadisticas) cazador.estadisticas.apuntando = null;
  quitarEfecto(cazador, 'caza');
}

/** Caza: el marcado que actua (moverse, permanente, lo que sea) recibe el dano. */
function aplicarMarcaCazaSiActua(tarea, registro) {
  const marcado = tarea?.potestad;
  if (!marcado?.marcadoApuntar || !marcado.estadisticas) return false;
  const marca = marcado.marcadoApuntar;
  marcado.marcadoApuntar = null;
  soltarCaza(registro, marca);
  if (marcado.pactoActivo) return false;
  marcado.estadisticas.hp = Number(marcado.estadisticas.hp ?? 0) - Number(marca.dano ?? 3);
  return true;
}

function animsPasivasPorDisparos(disparadas, ctx) {
  const out = [];
  disparadas.forEach(() => {
    const potestad = ctx?.objetivo?.estadisticas ? ctx.objetivo : ctx?.tarea?.potestad;
    if (!potestad) return;
    const entrada = entradaAnimPasiva(potestad, claveAnimPasiva('dano'));
    if (entrada) out.push(entrada);
  });
  return out;
}

function hpDeObjetivo(tarea) {
  return Number(
    (typeof tarea.objetivo === 'object' && tarea.objetivo?.estadisticas)
      ? tarea.objetivo.estadisticas.hp
      : NaN,
  );
}

/** Dano / cura / revivir sobre el objetivo: pasivas y anims del receptor. */
function reaccionesDelObjetivo(tarea, hpAntes, ctxBase, entorno, anims) {
  if (!(typeof tarea.objetivo === 'object' && tarea.objetivo?.estadisticas)) return;
  if (!Number.isFinite(hpAntes)) return;
  const hpDespues = Number(tarea.objetivo.estadisticas.hp);
  if (hpDespues < hpAntes) {
    const ctxRecibir = { ...ctxBase, objetivo: tarea.objetivo, dano: hpAntes - hpDespues };
    const disparadas = entorno.pila.verificar(MOMENTOS.recibirDano, ctxRecibir);
    anims.push(...animsPasivasPorDisparos(disparadas, ctxRecibir));
    const anim = entradaAnimPasiva(tarea.objetivo, claveAnimPasiva('dano'));
    if (anim) anims.push(anim);
    return;
  }
  if (hpDespues > hpAntes) {
    const revive = hpAntes <= 0;
    if (revive) {
      tarea.objetivo.muerta = false;
      tarea.objetivo._muerteAnimada = false;
      tarea.objetivo.aplicarCuerpoVivo?.(entorno.escena);
    }
    const anim = entradaAnimPasiva(tarea.objetivo, claveAnimPasiva(revive ? 'revivir' : 'cura'));
    if (anim) anims.push(anim);
  }
}

function crearProcesador(foto, entorno, anims, resueltas) {
  const { pila } = entorno;
  return (tarea, { saltarEjecutar = false } = {}) => {
    const ctxBase = contextoDeTarea(tarea, entorno, { foto });
    const fase = faseDeTarea(tarea);

    if (fase === 'proyectil') {
      const objetivo = typeof tarea.objetivo === 'object' ? tarea.objetivo : null;
      pila.verificar(MOMENTOS.recibirProyectil, {
        ...ctxBase,
        objetivo,
        anular: () => {
          tarea.anulada = true;
          tarea.bloqueadaPor = objetivo?.estadisticas ? objetivo : null;
        },
        dano: null,
      });
    }
    if (tarea.anulada) {
      tarea.efecto = null;
      return;
    }

    const hpAntes = hpDeObjetivo(tarea);
    if (!saltarEjecutar) {
      const resultado = typeof tarea.ejecutar === 'function' ? tarea.ejecutar(ctxBase) : null;
      if (resultado?.efectoPasivo) {
        tarea.accionPasiva = resultado.efectoPasivo;
        pila.apilar(resultado.efectoPasivo, tarea);
        const aura = entradaAnimEscudo(resultado.efectoPasivo.protegido);
        if (aura) anims.push(aura);
      }
    }

    if (fase === 'movimiento') {
      anims.push(...animsPasivasPorDisparos(pila.verificar(MOMENTOS.moverseACasilla, ctxBase), ctxBase));
    }
    if (aplicarMarcaCazaSiActua(tarea, entorno.registro)) {
      const anim = entradaAnimPasiva(tarea.potestad, claveAnimPasiva('dano'));
      if (anim) anims.push(anim);
    }
    if (tarea.trampaPisada) {
      const anim = entradaAnimPasiva(tarea.potestad, claveAnimPasiva('dano'));
      if (anim) anims.push(anim);
    }

    anims.push(...animsPasivasPorDisparos(pila.verificar(MOMENTOS.hacerAccion, ctxBase), ctxBase));
    reaccionesDelObjetivo(tarea, hpAntes, ctxBase, entorno, anims);

    tarea.efecto = efectoDeTarea(tarea, foto);
    resueltas.push(tarea);
  };
}

/**
 * @param grupo { velocidad, tareas, fases } de tareasActivas
 * @returns resultado de grupo para show (contratoShow)
 */
export function resolverGrupo(grupo, foto, entorno) {
  const animacionesPasivas = [];
  const resueltas = [];
  const procesar = crearProcesador(foto, entorno, animacionesPasivas, resueltas);

  const potestadesTablero = entorno.registro?.todos?.().map((e) => e.potestad) ?? [];
  reconciliarPosicionesEnTablero(potestadesTablero, entorno.tablero);
  resolverColisionesDeMovimiento(grupo.tareas, entorno.tablero);

  const { trampa, movimiento, preparacion, proyectil } = grupo.fases;

  tareasNoAnuladas(trampa).forEach((tarea) => procesar(tarea));

  const moves = tareasNoAnuladas(movimiento);
  aplicarMovimientosSimultaneos(moves, entorno.tablero);
  reconciliarPosicionesEnTablero(potestadesTablero, entorno.tablero);
  moves.forEach((tarea) => procesar(tarea, { saltarEjecutar: true }));

  tareasNoAnuladas(preparacion).forEach((tarea) => procesar(tarea));

  const proyectiles = tareasNoAnuladas(proyectil);
  aplicarCancelaciones(proyectiles, entorno.pila);
  tareasNoAnuladas(proyectiles).forEach((tarea) => procesar(tarea));

  const anuladas = (grupo.tareas ?? []).filter((t) => t.anulada);
  return armarResultadoGrupo({
    tareas: resueltas,
    animacionesActivas: [
      ...resueltas.map((t) => entradaAnimActiva(t)),
      ...anuladas.map((t) => entradaAnimBloqueada(t)),
    ].filter(Boolean),
    animacionesPasivas,
    anuladas,
  });
}
