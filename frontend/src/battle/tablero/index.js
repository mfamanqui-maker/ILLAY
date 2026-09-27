/**
 * tablero/index.js — Puerta del sistema de tablero.
 *
 * SPECT: docs/spects/spect003.md
 *
 * PhaserMaster acciona el mundo con una funcion y un parametro: la escena.
 * `montar` lee configuracion y eventos, dibuja, registra inputs de casilla
 * y coloca las potestades. No busca escenas por nombre.
 */

import AdministradorTablero from './AdministradorTablero.js';
import PotestadesTablero from './PotestadesTablero.js';
import {
  crearRegistro,
  descriptoresDeSpritesheet,
} from '../datosDePotestades/IndexDePotestades.js';
import { SistemaDeOrbes, precargarOrbes } from '../sistemaDeOrbes/index.js';

export { default as AdministradorTablero } from './AdministradorTablero.js';
export { default as PotestadesTablero } from './PotestadesTablero.js';
export * from './UtilsTablero.js';

export function precargar(escena) {
  AdministradorTablero.precargar(escena);
  descriptoresDeSpritesheet(escena.configuracion?.equipos).forEach((d) => {
    if (d.archivo) {
      escena.load.spritesheet(d.clave, d.archivo, { frameWidth: d.ancho, frameHeight: d.alto });
    }
  });
  precargarOrbes(escena);
}

export async function montar(escena) {
  const administrador = new AdministradorTablero(escena, escena.eventos);
  const tablero = administrador.construirDesdeMolde(escena.configuracion);
  administrador.dibujar(tablero);
  administrador.registrarZoom();
  administrador.registrarPaneo();
  administrador.registrarHoverCasilla();
  administrador.registrarClicCasilla();

  const registro = crearRegistro(escena.configuracion?.equipos, escena);
  const puente = new PotestadesTablero(escena, tablero, registro, administrador.tileSize);
  const cuerpos = await puente.colocar();
  const orbesSistema = new SistemaDeOrbes(escena, escena.eventos, registro, tablero);
  const montado = { administrador, tablero, registro, cuerpos, orbesSistema };
  Object.assign(escena, montado);
  return montado;
}
