/**
 * Columna única con scroll que encadena varias categorías, una debajo de otra.
 * Cada categoría ocupa todo el ancho disponible: primero su título (caja marrón)
 * y luego sus filas; al terminar una empieza la siguiente.
 *
 * Reemplaza el layout anterior de varias subcolumnas en paralelo.
 */

import { crearTexto } from '../GenerarTexto/index.js';
import { DEPTHS, LISTAS, LADO_DERECHO } from '../panelEntidadConfig.js';
import { crearListaScrollable } from './listaScrollable.js';
import { crearFilaItem, FILA_ALTO } from './filaItem.js';
import { crearCajaMarron } from './cajaMarron.js';

const GAP_CATEGORIA = 16;

function crearTituloCategoria(scene, ancho, texto) {
  const cont = scene.add.container(0, 0);
  const caja = crearCajaMarron(scene, { x: 0, y: 0, ancho, alto: LISTAS.tituloAlto, borde: 8 });
  caja.setTintCaja(0xc9a06a);
  cont.add(caja);

  const etiqueta = crearTexto(scene, texto, {
    x: ancho / 2,
    y: LISTAS.tituloAlto / 2,
    estilo: LISTAS.tituloEstilo,
    escala: LISTAS.tituloEscala,
    origen: { x: 0.5, y: 0.5 },
    depth: DEPTHS.contenido + 5,
  });
  cont.add(etiqueta);
  return cont;
}

export function crearListaCategorias(scene, opciones) {
  const { x, y, ancho, alto, padre, grupos, tooltip } = opciones;
  const padding = LADO_DERECHO.paddingInterno;

  const container = scene.add.container(x, y);
  container.setDepth(DEPTHS.contenido);
  padre.add(container);

  const banda = crearCajaMarron(scene, { x: 0, y: 0, ancho, alto, borde: 14 });
  container.add(banda);

  const listaAncho = ancho - padding * 2;
  const listaAlto = alto - padding * 2;

  const lista = crearListaScrollable(scene, {
    x: padding,
    y: padding,
    ancho: listaAncho,
    alto: listaAlto,
    padre: container,
  });

  let cursorY = 0;
  (grupos ?? []).forEach((grupo, idx) => {
    if (idx > 0) cursorY += GAP_CATEGORIA;

    const titulo = crearTituloCategoria(scene, listaAncho, grupo.titulo);
    titulo.y = cursorY;
    lista.agregar(titulo);
    cursorY += LISTAS.tituloAlto + 4;

    (grupo.items ?? []).forEach((item) => {
      const fila = crearFilaItem(scene, {
        ancho: listaAncho,
        item,
        onHover: () => tooltip.mostrar(grupo.clave, item.nombre),
        onLeave: () => tooltip.limpiar(),
      });
      fila.y = cursorY;
      lista.agregar(fila);
      cursorY += FILA_ALTO;
    });
  });

  lista.fijarAltoContenido(cursorY);

  return {
    container,
    lista,

    contieneCoordenadas(px, py) {
      return lista.contieneCoordenadas(px, py);
    },

    desplazar(px, py, dy) {
      if (lista.contieneCoordenadas(px, py)) lista.desplazar(dy);
    },

    /** Libera la máscara de scroll (no se destruye con container.destroy). */
    destruir() {
      lista.destruir();
      container.destroy();
    },
  };
}
