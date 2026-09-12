/**
 * Encabezado del nuevo panel:
 *   - `crearNombre`: dibuja el nombre centrado sobre la banda de nombre que ya
 *     trae el fondo panel.png.
 *   - `crearVendasNavegacion`: zonas interactivas sobre las vendas rojas de las
 *     esquinas. Al pasar el cursor aparece la imagen Next (flecha); la izquierda
 *     navega al anterior y la derecha al siguiente. No hay botón de cerrar
 *     (se cierra con Esc o clic fuera del panel).
 */

import { crearTexto } from '../GenerarTexto/index.js';
import { ASSETS, DEPTHS, HEADER } from '../panelEntidadConfig.js';

export function crearNombre(scene, opciones) {
  const { rect, padre, nombreInicial = '' } = opciones;
  const container = scene.add.container(rect.x, rect.y);
  container.setDepth(DEPTHS.header);
  padre.add(container);

  let nombreNodo = null;
  const fijarNombre = (nombre) => {
    if (nombreNodo) {
      nombreNodo.destroy();
      nombreNodo = null;
    }
    nombreNodo = crearTexto(scene, nombre ?? '', {
      x: rect.ancho / 2,
      y: rect.alto / 2,
      estilo: HEADER.nombreEstilo,
      escala: HEADER.nombreEscala,
      origen: { x: 0.5, y: 0.5 },
      depth: DEPTHS.header + 1,
    });
    container.add(nombreNodo);
  };

  fijarNombre(nombreInicial);
  return { container, fijarNombre };
}

function crearVenda(scene, opciones) {
  const { rect, hacia, onClick, padre } = opciones;
  const container = scene.add.container(rect.x, rect.y);
  container.setDepth(DEPTHS.botones);
  padre.add(container);

  let flecha = null;
  if (scene.textures.exists(ASSETS.venda.clave)) {
    flecha = scene.add.image(rect.ancho / 2, rect.alto / 2, ASSETS.venda.clave);
    flecha.setOrigin(0.5);
    flecha.setDisplaySize(rect.ancho * 0.65, rect.alto * 0.4);
    if (hacia === 'izquierda') flecha.setFlipX(true);
    flecha.setVisible(false);
    container.add(flecha);
  }

  const hit = scene.add.rectangle(0, 0, rect.ancho, rect.alto, 0x000000, 0.0001);
  hit.setOrigin(0, 0);
  hit.setInteractive({ useHandCursor: true });
  container.add(hit);

  const restaurar = () => {
    if (!flecha) return;
    flecha.setVisible(false);
    if (scene.textures.exists(ASSETS.venda.clave)) flecha.setTexture(ASSETS.venda.clave);
  };

  hit.on('pointerover', () => flecha?.setVisible(true));
  hit.on('pointerout', restaurar);
  hit.on('pointerdown', (pointer) => {
    pointer.event?.stopPropagation?.();
    if (flecha && scene.textures.exists(ASSETS.vendaSel.clave)) {
      flecha.setVisible(true);
      flecha.setTexture(ASSETS.vendaSel.clave);
    }
    if (typeof onClick === 'function') onClick();
  });

  return { container, restaurar };
}

export function crearVendasNavegacion(scene, opciones) {
  const { rectIzq, rectDer, padre, onIzq, onDer } = opciones;
  const izq = crearVenda(scene, { rect: rectIzq, hacia: 'derecha', onClick: onIzq, padre });
  const der = crearVenda(scene, { rect: rectDer, hacia: 'izquierda', onClick: onDer, padre });
  return { izq, der };
}
