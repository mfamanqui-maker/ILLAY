/**
 * ejecucion/contratoShow.js — Lo que el guion entrega al show por grupo.
 *
 * SPECT: docs/spects/spect007.md (fase 2)
 *
 * Resultado de grupo: { tareas, animacionesActivas, animacionesPasivas, anuladas }.
 * Marcas que el guion deja en cada tarea y el show lee:
 *   colisionMovimiento + destinoPretendido   choque (ir, temblor, reubicar)
 *   trampaPisada {x,y}                        mover y luego explotar la mina
 *   intercambio { potestad, destino }         segundo sprite que se desplaza
 *   bloqueadaPor potestad                     proyectil parado por un escudo
 */

import { animBloqueoEscudo, animEscudoSobre } from './secuenciasShow.js';

export function armarResultadoGrupo({
  tareas = [],
  animacionesActivas = [],
  animacionesPasivas = [],
  anuladas = [],
} = {}) {
  return { tareas, animacionesActivas, animacionesPasivas, anuladas };
}

export function tareasNoAnuladas(tareas) {
  return (tareas ?? []).filter((t) => !t?.anulada);
}

/**
 * Mapea un efecto resuelto a una clave de animacion pasiva del receptor.
 * @param {'dano'|'cura'|'revivir'|'muerte'} tipo
 */
export function claveAnimPasiva(tipo) {
  if (tipo === 'cura') return 'serCurado';
  if (tipo === 'revivir') return 'revivir';
  if (tipo === 'muerte') return 'morir';
  if (tipo === 'dano') return 'recibirDano';
  return null;
}

/** Entrada para show: reproducir una anim del lanzador (activa). */
export function entradaAnimActiva(tarea) {
  if (!tarea || tarea.anulada) return null;
  const anim = tarea.animacion ?? tarea.reproducir;
  if (!anim && !tarea.potestad?.animaciones) return null;
  return {
    tipo: 'activa',
    tarea,
    potestad: tarea.potestad,
    reproducir: typeof anim === 'function'
      ? anim
      : (ctx) => {
        const nombre = tarea.accion?.nombre ?? tarea.nombreDeAccion;
        const fn = tarea.potestad?.animaciones?.[nombre]
          ?? tarea.potestad?.animaciones?.movimiento;
        return fn?.(ctx) ?? Promise.resolve();
      },
  };
}

/** Entrada para show: anim pasiva sobre una potestad. */
export function entradaAnimPasiva(potestad, clave) {
  if (!potestad || !clave) return null;
  const fn = potestad.animaciones?.[clave];
  if (typeof fn !== 'function') return null;
  return {
    tipo: 'pasiva',
    potestad,
    clave,
    reproducir: (ctx) => fn({ ...ctx, potestad }),
  };
}

/** Entrada para show: aura sobre quien protege un escudo. */
export function entradaAnimEscudo(protegido) {
  if (!protegido) return null;
  return {
    tipo: 'pasiva',
    potestad: protegido,
    clave: 'escudado',
    reproducir: (ctx) => animEscudoSobre(ctx, protegido),
  };
}

/** Proyectil bloqueado: el lanzador ataca igual y el escudo lo para. */
export function entradaAnimBloqueada(tarea) {
  if (!tarea?.anulada || !tarea.bloqueadaPor) return null;
  const ataque = entradaAnimActiva({ ...tarea, anulada: false });
  return {
    tipo: 'activa',
    tarea,
    potestad: tarea.potestad,
    reproducir: async (ctx) => {
      await ataque?.reproducir?.(ctx);
      await animBloqueoEscudo(ctx, tarea.bloqueadaPor);
    },
  };
}

/** Une activas + pasivas en una sola lista para Promise.all. */
export function fusionarAnimsParaShow(resultadoGrupo) {
  const activas = resultadoGrupo?.animacionesActivas ?? [];
  const pasivas = resultadoGrupo?.animacionesPasivas ?? [];
  return [...activas, ...pasivas].filter(Boolean);
}
