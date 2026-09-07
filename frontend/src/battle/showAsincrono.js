/**
 * showAsincrono.js — Reproduce las animaciones de un grupo de acciones.
 *
 * SPECT: docs/spects/spect007.md
 *
 * QUE SERA: recibe de guionSincrono el array de acciones ya resueltas de un
 * grupo y reproduce sus animaciones y efectos en paralelo. Devuelve una
 * promesa que se cumple cuando la ultima animacion del grupo ha terminado.
 *
 * La division con guionSincrono es de responsabilidad, no de tiempo: el guion
 * decide que pasa, el show cuenta como se ve. Los numeros ya estan calculados
 * cuando este archivo empieza a trabajar; aqui no se resta vida a nadie.
 *
 * Por que en paralelo dentro del grupo y en serie entre grupos: las acciones
 * de la misma velocidad ocurren a la vez, asi que se ven a la vez. Pero el
 * jugador tiene que entender por que el grupo siguiente se ejecuta o no, y
 * para eso necesita haber visto terminar el anterior.
 *
 * Rescatado de: classes/battle/controladorJugada.js (borrado).
 *
 * ESTADO: esqueleto con rescate. Revisar contra el spect 007.
 */

// ─── RESCATE: controladorJugada.js lineas 260-280. Adaptado. ─────────────────
// El contexto es lo que recibe la funcion de una accion como segundo argumento
// (`ejecución(objetivo, contexto)`). El codigo viejo metia aqui la escena que
// habia rastreado a mano; ahora se le pasa.

export function crearContextoEjecucion(tarea, entorno) {
  return {
    tarea,
    tablero: entorno.tablero,
    escena: entorno.escena,
    eventos: entorno.eventos,
  };
}

export function resolverParametroAccion(tarea) {
  return tarea?.casillaObjetivo ?? tarea?.objetivo ?? null;
}

/** Ejecuta la funcion de la accion y espera si devuelve promesa. */
export async function ejecutarAccion(tarea, entorno) {
  const resultado = tarea?.accion?.ejecucion?.(
    resolverParametroAccion(tarea),
    crearContextoEjecucion(tarea, entorno),
  );
  if (resultado?.then) await resultado;
}

// ─── A CONSTRUIR ─────────────────────────────────────────────────────────────
//
// reproducirGrupo(acciones, entorno) -> Promise
//   Lanza todas las animaciones del grupo a la vez y resuelve cuando la ultima
//   termina. Promise.all sobre las animaciones, no un for con await: eso las
//   pondria en fila y romperia la simultaneidad que pide la regla 10.
//
// El spect 007 define el contrato de una animacion y como se cancela si la
// batalla termina a mitad de grupo.
