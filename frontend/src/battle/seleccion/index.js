/**
 * seleccion/index.js — Puerta de la carpeta seleccion.
 *
 * SPECT: docs/spects/spect006.md
 *
 *   casos          reglas puras: tipo de seleccion, rango, candidatos
 *   selectores     seleccionarObjetivos y una funcion por type
 *   amenazas       aliados golpeados por la config del rival
 *   accionismo     cupo de acciones por potestad (estado del turno)
 *   brillos        parpadeo de sprites y overlays de casilla (Phaser)
 *   marcas         pintar / limpiar el resultado de una seleccion
 *   etiquetasRival texto de lo que eligio cada enemigo
 *   fantasmas      destino planificado de la movilidad
 */

export * from './casos.js';
export * from './selectores.js';
export * from './amenazas.js';
export * from './accionismo.js';
export * from './brillos.js';
export * from './marcas.js';
export * from './etiquetasRival.js';
export * from './fantasmas.js';
