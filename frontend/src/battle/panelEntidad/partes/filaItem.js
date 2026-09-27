/**
 * Fila individual para listas: [icono] NOMBRE  CANTIDAD.
 * Con `frame` (y `hoja` en efectos) sale del spritesheet. Si no, la vela tintada.
 */

import { crearTexto } from '../GenerarTexto/index.js';
import {
  COLORES,
  DEPTHS,
  LISTAS,
  ICONO_FALLBACK,
  CLAVE_ICONO_FALLBACK,
} from '../panelEntidadConfig.js';
import { resolverIcono } from '../../iconosAtlas.js';

function pintarVela(scene, container, item, x, y) {
  const clave = scene.textures.exists(CLAVE_ICONO_FALLBACK)
    ? CLAVE_ICONO_FALLBACK
    : null;
  if (!clave) {
    if (!scene.textures.exists(CLAVE_ICONO_FALLBACK)) {
      scene.load.image(CLAVE_ICONO_FALLBACK, ICONO_FALLBACK);
      scene.load.once('complete', () => pintarVela(scene, container, item, x, y));
      if (!scene.load.isLoading()) scene.load.start();
    }
    return;
  }
  if (!container.active) return;
  const iconoImg = scene.add.image(x, y, clave);
  iconoImg.setDisplaySize(LISTAS.iconoTam, LISTAS.iconoTam);
  iconoImg.setDepth(DEPTHS.contenido + 2);
  if (item?.tinte != null) iconoImg.setTint(item.tinte);
  container.add(iconoImg);
}

function colocarIcono(scene, container, item, x, y) {
  const icono = resolverIcono(item);
  if (icono && scene.textures.exists(icono.clave)) {
    const iconoImg = scene.add.image(x, y, icono.clave, icono.frame);
    iconoImg.setDisplaySize(LISTAS.iconoTam, LISTAS.iconoTam);
    iconoImg.setDepth(DEPTHS.contenido + 2);
    if (icono.tipo === 'efecto' && item?.tinte != null) iconoImg.setTint(item.tinte);
    container.add(iconoImg);
    return;
  }
  pintarVela(scene, container, item, x, y);
}

export function crearFilaItem(scene, opciones) {
  const { ancho, item, onHover, onLeave } = opciones;
  const altoFila = LISTAS.filaAlto;
  const paddingX = LISTAS.filaPaddingX;

  const container = scene.add.container(0, 0);
  container.setSize(ancho, altoFila);

  const hit = scene.add.rectangle(0, 0, ancho, altoFila, 0x000000, 0.0001);
  hit.setOrigin(0, 0);
  hit.setInteractive({ useHandCursor: false });
  container.add(hit);

  const hover = scene.add.rectangle(0, 0, ancho, altoFila, COLORES.botonHover, 0);
  hover.setOrigin(0, 0);
  container.add(hover);

  const separador = scene.add.rectangle(0, altoFila - 1, ancho, 1, COLORES.separador, LISTAS.separadorFilasAlpha);
  separador.setOrigin(0, 0);
  container.add(separador);

  const marcoTam = LISTAS.iconoMarcoTam;
  const marcoX = paddingX;
  const marcoY = (altoFila - marcoTam) / 2;

  const marco = scene.add.rectangle(marcoX, marcoY, marcoTam, marcoTam, COLORES.iconoMarcoVacio, 1);
  marco.setOrigin(0, 0);
  marco.setStrokeStyle(2, COLORES.borde, 0.7);
  container.add(marco);

  colocarIcono(scene, container, item, marcoX + marcoTam / 2, marcoY + marcoTam / 2);

  const textoX = marcoX + marcoTam + LISTAS.gapIconoTexto;
  const nombre = crearTexto(scene, String(item?.nombre ?? ''), {
    x: textoX,
    y: altoFila / 2,
    estilo: LISTAS.textoEstilo,
    escala: LISTAS.textoEscala,
    origen: { x: 0, y: 0.5 },
    depth: DEPTHS.contenido + 3,
  });
  container.add(nombre);

  const cantidad = crearTexto(scene, String(item?.cantidad ?? ''), {
    x: ancho - paddingX,
    y: altoFila / 2,
    estilo: LISTAS.textoEstilo,
    escala: LISTAS.textoEscala,
    origen: { x: 1, y: 0.5 },
    depth: DEPTHS.contenido + 3,
  });
  container.add(cantidad);

  hit.on('pointerover', () => {
    hover.setFillStyle(COLORES.botonHover, 0.35);
    if (typeof onHover === 'function') onHover(item);
  });
  hit.on('pointerout', () => {
    hover.setFillStyle(COLORES.botonHover, 0);
    if (typeof onLeave === 'function') onLeave(item);
  });

  return container;
}

export const FILA_ALTO = LISTAS.filaAlto;
