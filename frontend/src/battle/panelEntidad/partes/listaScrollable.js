/**
 * Helper genérico para una columna con scroll vertical recortada por máscara.
 *
 * Uso:
 *   const lista = crearListaScrollable(scene, {
 *     x, y, ancho, alto, padre,           // padre = container raíz del panel
 *     onScroll: (y) => {},                 // opcional
 *   });
 *   lista.agregar(child);                  // child con y relativo a la lista
 *   lista.fijarAltoContenido(altoTotal);   // calcula clamp del scroll
 *   lista.contieneCoordenadas(px, py);     // para enrutar el wheel
 *
 * El padre (container) ya está posicionado en pantalla, así que (x, y) de la
 * lista son coordenadas LOCALES al padre. Internamente se calcula la posición
 * absoluta para colocar el rectángulo de la máscara.
 */

import { DEPTHS } from '../panelEntidadConfig.js';

export function crearListaScrollable(scene, opciones) {
  const { x, y, ancho, alto, padre } = opciones;

  const contenedorViewport = scene.add.container(x, y);
  contenedorViewport.setDepth(DEPTHS.scroll);
  padre.add(contenedorViewport);

  const contenidoInterno = scene.add.container(0, 0);
  contenedorViewport.add(contenidoInterno);

  // Posición real en pantalla del viewport (soporta cualquier anidamiento de
  // containers). El panel usa scrollFactor 0, así que tx/ty equivalen a px de
  // pantalla.
  const matriz = contenedorViewport.getWorldTransformMatrix();
  const maskRectX = matriz.tx;
  const maskRectY = matriz.ty;

  const maskShape = scene.make.graphics({ x: 0, y: 0, add: false });
  maskShape.fillStyle(0xffffff, 1);
  maskShape.fillRect(maskRectX, maskRectY, ancho, alto);
  const mask = maskShape.createGeometryMask();
  contenidoInterno.setMask(mask);

  let altoContenido = 0;
  let desplazamiento = 0;

  const clampear = () => {
    const overflow = Math.max(0, altoContenido - alto);
    desplazamiento = Phaser.Math.Clamp(desplazamiento, -overflow, 0);
    contenidoInterno.y = desplazamiento;
    if (typeof opciones.onScroll === 'function') {
      opciones.onScroll(desplazamiento);
    }
  };

  const api = {
    contenedorViewport,
    contenidoInterno,
    ancho,
    alto,

    agregar(child) {
      contenidoInterno.add(child);
      return child;
    },

    fijarAltoContenido(nuevoAlto) {
      altoContenido = Math.max(0, nuevoAlto);
      clampear();
      return api;
    },

    desplazar(dy) {
      desplazamiento += dy;
      clampear();
      return api;
    },

    fijarDesplazamiento(y) {
      desplazamiento = y;
      clampear();
      return api;
    },

    contieneCoordenadas(px, py) {
      return (
        px >= maskRectX &&
        px <= maskRectX + ancho &&
        py >= maskRectY &&
        py <= maskRectY + alto
      );
    },

    obtenerOverflow() {
      return Math.max(0, altoContenido - alto);
    },

    obtenerDesplazamiento() {
      return desplazamiento;
    },

    destruir() {
      mask.destroy();
      maskShape.destroy();
      contenedorViewport.destroy();
    },
  };

  return api;
}
