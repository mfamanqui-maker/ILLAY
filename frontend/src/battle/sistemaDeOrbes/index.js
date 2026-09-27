/**
 * sistemaDeOrbes/index.js — Puerta unica de la carpeta.
 *
 * SPECT: docs/spects/spect005.md
 *
 * Quien use las orbes importa de aqui y no de los archivos sueltos, para que
 * reorganizar la carpeta por dentro no obligue a tocar a los consumidores.
 */

export { default as SistemaDeOrbes, precargarOrbes } from './orbes.js';
export {
  pausarAnimaciones,
  asegurarTexturaParticula,
  crearParpadeo,
  crearTooltip,
  resumirAmenazas,
  abrirSesionTipo1,
  pintarPasoTipo1,
  cerrarSeleccionTipo1,
  mostrarSeleccionTipo1,
} from './seleccionTipo1.js';
