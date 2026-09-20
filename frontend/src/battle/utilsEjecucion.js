/**
 * utilsEjecucion.js — Puente entre guionSincrono y showAsincrono.
 *
 * SPECT: docs/spects/spect007.md (fase 2)
 *
 * Forma del resultado de grupo que el guion entrega al show.
 * Ni guion ni show importan IndexDePotestades.
 */

/** Resultado vacio de un grupo. */
export function resultadoGrupoVacio() {
  return {
    tareas: [],
    animacionesActivas: [],
    animacionesPasivas: [],
    anuladas: [],
  };
}

/**
 * @param {object} parcial
 * @returns {{ tareas, animacionesActivas, animacionesPasivas, anuladas }}
 */
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

/** Contexto compartido para ejecutar activos y para reproducir anims. */
export function armarEntornoEjecucion({
  escena,
  tablero,
  eventos,
  registro,
  pila,
} = {}) {
  return { escena, tablero, eventos, registro, pila };
}

/**
 * Mapea un efecto resuelto a una clave de animacion pasiva del receptor.
 * @param {'dano'|'cura'|'muerte'|'otro'} tipo
 */
export function claveAnimPasiva(tipo) {
  if (tipo === 'cura') return 'serCurado';
  if (tipo === 'muerte') return 'morir';
  if (tipo === 'dano') return 'recibirDano';
  return null;
}

/**
 * Entrada para show: reproducir una anim del lanzador (activa).
 * @param {object} tarea
 */
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

/**
 * Entrada para show: anim pasiva sobre una potestad.
 * @param {object} potestad
 * @param {string} clave
 */
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

/** Une activas + pasivas en una sola lista para Promise.all. */
export function fusionarAnimsParaShow(resultadoGrupo) {
  const activas = resultadoGrupo?.animacionesActivas ?? [];
  const pasivas = resultadoGrupo?.animacionesPasivas ?? [];
  return [...activas, ...pasivas].filter(Boolean);
}
