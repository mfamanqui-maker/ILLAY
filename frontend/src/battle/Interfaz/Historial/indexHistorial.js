/**
 * API publica del historial (spect 001).
 */

export {
  abrirHistorial,
  cerrarHistorial,
  actualizarHistorial,
  alternarHistorial,
} from './panelHistorial.js';

export {
  crearRegistroVacio,
  registrarTurnoInicial,
  registrarNuevoTurno,
  anotarJugadaEnRegistro,
  jugadaDesdeTarea,
} from './registroJugadas.js';
