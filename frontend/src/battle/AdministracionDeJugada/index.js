/**
 * AdministracionDeJugada/index.js — Puerta de cola, negociacion y ejecucion.
 */

export {
  actualizarFantasmaMovilidad,
  filasDeCola,
  inyectarPermanentesEnFase,
  quitarDeCola,
  registrarEleccion,
} from './cola/colaDeJugada.js';
export { conmutarPermanente } from './cola/permanentes.js';
export { asegurarEscudarEnPropia, filasDeConfig } from './comun.js';
export { esConfigFinal, negociar, buscarInformacionDeRival, utilsType1 } from './negociacion/negociadorDeRonda.js';
export { correrTurno, ctxRonda, precombate, resolverFinDeBatalla } from './ejecucion/cicloDeTurno.js';
