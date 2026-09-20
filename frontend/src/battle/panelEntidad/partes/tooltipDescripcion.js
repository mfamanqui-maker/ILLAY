/**
 * Cartel del lado izquierdo del panel que muestra la descripción
 * del ítem sobre el que está pasando el mouse.
 *
 * Lee del cache de JSON cargado en preload (DESCRIPCIONES en config).
 * Si no hay descripción registrada para el nombre, fallback es:
 *   "(SIN DESCRIPCION)"
 */

import { crearTexto } from '../GenerarTexto/index.js';
import { DEPTHS, LADO_IZQUIERDO, obtenerDescripcion } from '../panelEntidadConfig.js';
import { crearCajaMarron } from './cajaMarron.js';

const TEXTO_INICIAL = LADO_IZQUIERDO.tooltipTitulo;
const TEXTO_FALLBACK = '(SIN DESCRIPCION)';

function partirTextoPorAncho(textoOriginal, anchoMax, opciones) {
  const palabras = String(textoOriginal ?? '').toUpperCase().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '';

  const { medirTexto, estilo, escala } = opciones;
  const lineas = [];
  let actual = '';

  for (const palabra of palabras) {
    const candidata = actual.length === 0 ? palabra : `${actual} ${palabra}`;
    const ancho = medirTexto(candidata, { estilo, escala }).ancho;
    if (ancho <= anchoMax) {
      actual = candidata;
      continue;
    }
    if (actual.length > 0) lineas.push(actual);
    actual = palabra;
  }

  if (actual.length > 0) lineas.push(actual);
  return lineas.join('\n');
}

export function crearTooltipDescripcion(scene, opciones) {
  const { x, y, ancho, alto, padre, medirTexto } = opciones;
  const padding = LADO_IZQUIERDO.tooltipPadding;

  const container = scene.add.container(Math.round(x), Math.round(y));
  container.setDepth(DEPTHS.tooltip);
  padre.add(container);

  const fondo = crearCajaMarron(scene, { x: 0, y: 0, ancho, alto, borde: 14 });
  container.add(fondo);

  let textoActual = null;

  const dibujar = (texto) => {
    if (textoActual) {
      textoActual.destroy();
      textoActual = null;
    }
    const contenido = partirTextoPorAncho(texto, ancho - padding * 2, {
      medirTexto,
      estilo: LADO_IZQUIERDO.tooltipTextoEstilo,
      escala: LADO_IZQUIERDO.tooltipTextoEscala,
    });
    textoActual = crearTexto(scene, contenido, {
      x: padding,
      y: padding,
      estilo: LADO_IZQUIERDO.tooltipTextoEstilo,
      escala: LADO_IZQUIERDO.tooltipTextoEscala,
      origen: { x: 0, y: 0 },
      depth: DEPTHS.tooltip + 1,
    });
    container.add(textoActual);
  };

  dibujar(TEXTO_INICIAL);

  return {
    container,

    mostrar(clave, nombreItem) {
      if (!clave || !nombreItem) {
        dibujar(TEXTO_INICIAL);
        return;
      }
      const desc = obtenerDescripcion(scene, clave, nombreItem);
      if (desc) {
        dibujar(`${nombreItem}: ${desc}`);
      } else {
        dibujar(`${nombreItem}\n${TEXTO_FALLBACK}`);
      }
    },

    limpiar() {
      dibujar(TEXTO_INICIAL);
    },

    destruir() {
      container.destroy();
    },
  };
}
