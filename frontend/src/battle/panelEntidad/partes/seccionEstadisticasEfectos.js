/**
 * Mitad izquierda del lado derecho del panel.
 * Una sola lista con scroll que encadena las categorías a todo el ancho:
 *   ESTADÍSTICAS  ▶  EFECTOS
 *
 * Cada hover sobre un item llama tooltip.mostrar(claveJson, item.nombre).
 */

import { crearListaCategorias } from './listaCategorias.js';

export function crearSeccionEstadisticasEfectos(scene, opciones) {
  const { x, y, ancho, alto, padre, datos, tooltip } = opciones;

  return crearListaCategorias(scene, {
    x,
    y,
    ancho,
    alto,
    padre,
    tooltip,
    grupos: [
      { titulo: 'ESTADÍSTICAS', clave: 'estadisticas', items: datos?.estadisticas ?? [] },
      { titulo: 'EFECTOS', clave: 'efectos', items: datos?.efectos ?? [] },
    ],
  });
}
