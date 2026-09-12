/**
 * Fila individual para listas: [icono] NOMBRE  CANTIDAD.
 * El icono es opcional. Si la imagen no está cargada se intenta cargar dinámicamente.
 * Toda la fila tiene un hitArea rectangular y dispara onHover/onLeave.
 *
 * Devuelve un container ya posicionado en (0, 0) relativo al padre que lo agregue.
 */

import { crearTexto } from '../GenerarTexto/index.js';
import { COLORES, DEPTHS, LISTAS, claveTexturaImagen } from '../panelEntidadConfig.js';

function cargarImagen(scene, ruta, onCargada) {
  if (!ruta) return;
  const clave = claveTexturaImagen(ruta);
  if (scene.textures.exists(clave)) {
    onCargada(clave);
    return;
  }
  scene.load.image(clave, ruta);
  scene.load.once('complete', () => {
    if (scene.textures.exists(clave)) onCargada(clave);
  });
  if (!scene.load.isLoading()) scene.load.start();
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

  const tieneIcono = Boolean(item?.imagen);
  const marcoTam = LISTAS.iconoMarcoTam;
  const marcoX = paddingX;
  const marcoY = (altoFila - marcoTam) / 2;

  if (tieneIcono) {
    const marco = scene.add.rectangle(marcoX, marcoY, marcoTam, marcoTam, COLORES.iconoMarcoVacio, 1);
    marco.setOrigin(0, 0);
    marco.setStrokeStyle(2, COLORES.borde, 0.7);
    container.add(marco);

    cargarImagen(scene, item.imagen, (clave) => {
      const iconoImg = scene.add.image(marcoX + marcoTam / 2, marcoY + marcoTam / 2, clave);
      iconoImg.setDisplaySize(LISTAS.iconoTam, LISTAS.iconoTam);
      iconoImg.setDepth(DEPTHS.contenido + 2);
      container.add(iconoImg);
    });
  }

  const textoX = tieneIcono ? marcoX + marcoTam + LISTAS.gapIconoTexto : paddingX;
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
