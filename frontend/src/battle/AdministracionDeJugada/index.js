/**
 * AdministracionDeJugada/index.js — Puerta de cola, negociacion y ejecucion.
 *
 * SPECT: docs/spects/spect004.md, 007 y 010.
 *
 *   cola/         lo elegido este turno (configDelTurno) y las permanentes
 *   negociacion/  config1 → configN → precombate, espejo y segunda capa tipo 1
 *   ejecucion/    tareas activas (velocidad + fase), pila de pasivas, guion y show
 *
 * sistemaDeOrbes importa cola/colaDeJugada.js directamente, no este barril
 * (negociacion/faseTipo1 importa sistemaDeOrbes).
 */

export {
  actualizarFantasmaMovilidad,
  filasDeCola,
  inyectarPermanentesEnFase,
  quitarDeCola,
  registrarEleccion,
} from './cola/colaDeJugada.js';
export { conmutarPermanente } from './cola/permanentes.js';
export { esConfigFinal, filasDeConfig, negociar } from './negociacion/negociadorDeRonda.js';
export {
  cerrarSesionTipo1,
  faseTipo1Cerrada,
  recolectarColaTipo1,
  recorrerColaTipo1,
} from './negociacion/faseTipo1.js';
export { correrTurno, ctxRonda, resolverFinDeBatalla } from './ejecucion/cicloDeTurno.js';
