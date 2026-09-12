/**
 * sistemaDeOrbes/index.js — Puerta unica de la carpeta.
 *
 * SPECT: docs/spects/spect005.md
 *
 * Quien use las orbes importa de aqui y no de los archivos sueltos, para que
 * reorganizar la carpeta por dentro no obligue a tocar a los consumidores.
 */

export { default as SistemaDeOrbes, claveIconoAccion, rutaIconoNormalizada, precargarOrbes } from './orbes.js';
export {
  pausarAnimaciones,
  asegurarTexturaParticula,
  crearParpadeo,
  crearTooltip,
  resumirAmenazas,
} from './seleccionTipo1.js';
