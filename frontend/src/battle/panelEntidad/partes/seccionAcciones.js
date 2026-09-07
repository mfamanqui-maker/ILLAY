/**
 * Mitad derecha del lado derecho del panel.
 * Una sola lista con scroll que encadena las categorías a todo el ancho:
 *   HABILIDADES  ▶  MOVIMIENTOS  ▶  OBJETOS
 *
 * Cada hover sobre un item llama tooltip.mostrar(claveJson, item.nombre).
 */

import { crearListaCategorias } from './listaCategorias.js';

export function crearSeccionAcciones(scene, opciones) {
  const { x, y, ancho, alto, padre, datos, tooltip } = opciones;

  return crearListaCategorias(scene, {
    x,
    y,
    ancho,
    alto,
    padre,
    tooltip,
    grupos: [
      { titulo: 'HABILIDADES', clave: 'acciones', items: datos?.acciones ?? [] },
      { titulo: 'MOVIMIENTOS', clave: 'movimiento', items: datos?.movimiento ?? [] },
      { titulo: 'OBJETOS', clave: 'objetos', items: datos?.objetos ?? [] },
    ],
  });
}
