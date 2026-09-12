/**
 * Caja y botón con marco marrón nine-patch (frames 396–458 de Base.png).
 *
 * `crearCajaMarron` arma una caja bordeada de cualquier tamaño componiendo
 * 9 trozos (4 esquinas fijas, 4 bordes estirados, 1 centro estirado).
 * Si la textura no está cargada, cae a un rectángulo plano para no romper.
 */

import { NINE_PATCH_MARRON, COLORES, DEPTHS } from '../panelEntidadConfig.js';
import { crearTexto } from '../GenerarTexto/index.js';

export function crearCajaMarron(scene, opciones) {
  const { x = 0, y = 0, ancho, alto } = opciones;
  const np = opciones.ninePatch ?? NINE_PATCH_MARRON;
  const borde = opciones.borde ?? 14;

  const container = scene.add.container(x, y);
  if (opciones.depth != null) container.setDepth(opciones.depth);

  if (!scene.textures.exists(np.textura)) {
    const rect = scene.add.rectangle(0, 0, ancho, alto, 0x8a6a3f, 1);
    rect.setOrigin(0, 0);
    rect.setStrokeStyle(2, 0x3a2a14, 1);
    container.add(rect);
    container.piezas = [rect];
    container.fondo = rect;
    container.setTintCaja = () => {};
    return container;
  }

  const [TL, T, TR, L, C, R, BL, B, BR] = np.frames;
  const b = Math.min(borde, Math.floor(ancho / 2), Math.floor(alto / 2));
  const innerW = Math.max(0, ancho - 2 * b);
  const innerH = Math.max(0, alto - 2 * b);

  const mk = (frame, px, py, w, h) => {
    const img = scene.add.image(0, 0, np.textura, frame);
    img.setOrigin(0, 0);
    img.setPosition(px, py);
    img.setDisplaySize(w, h);
    return img;
  };

  const centro = mk(C, b, b, innerW, innerH);
  const arriba = mk(T, b, 0, innerW, b);
  const abajo = mk(B, b, alto - b, innerW, b);
  const izq = mk(L, 0, b, b, innerH);
  const der = mk(R, ancho - b, b, b, innerH);
  const esqTL = mk(TL, 0, 0, b, b);
  const esqTR = mk(TR, ancho - b, 0, b, b);
  const esqBL = mk(BL, 0, alto - b, b, b);
  const esqBR = mk(BR, ancho - b, alto - b, b, b);

  const piezas = [centro, arriba, abajo, izq, der, esqTL, esqTR, esqBL, esqBR];
  container.add(piezas);
  container.piezas = piezas;
  container.setTintCaja = (tint) => {
    piezas.forEach((p) => (tint == null ? p.clearTint() : p.setTint(tint)));
  };
  return container;
}

export function crearBotonMarron(scene, opciones) {
  const { x = 0, y = 0, ancho, alto, texto, onClick } = opciones;
  const container = scene.add.container(x, y);
  container.setDepth(opciones.depth ?? DEPTHS.botones);

  const caja = crearCajaMarron(scene, { x: 0, y: 0, ancho, alto, borde: opciones.borde ?? 10 });
  container.add(caja);

  const etiqueta = crearTexto(scene, texto ?? '', {
    x: ancho / 2,
    y: alto / 2,
    estilo: opciones.estilo ?? 'panel',
    escala: opciones.escala ?? 1.5,
    origen: { x: 0.5, y: 0.5 },
    depth: (opciones.depth ?? DEPTHS.botones) + 1,
  });
  container.add(etiqueta);

  const hit = scene.add.rectangle(0, 0, ancho, alto, 0x000000, 0.0001);
  hit.setOrigin(0, 0);
  hit.setInteractive({ useHandCursor: true });
  container.add(hit);

  hit.on('pointerover', () => caja.setTintCaja(COLORES.botonHover));
  hit.on('pointerout', () => caja.setTintCaja(null));
  hit.on('pointerdown', (pointer) => {
    pointer.event?.stopPropagation?.();
    if (typeof onClick === 'function') onClick();
  });

  container.caja = caja;
  return container;
}
