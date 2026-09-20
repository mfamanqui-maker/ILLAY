/**
 * finalidad.js — Carta de resultado de la batalla.
 *
 * SPECT: docs/spects/spect008.md
 *
 * PhaserMaster decide. Este archivo pinta. No cuenta vivos, no habla
 * con el servidor, no lee el estado vivo de la batalla.
 */

const DEPTH_FONDO = 9200;
const DEPTH_CARTA = 9201;

const ASSETS = {
  victoria: { clave: 'finalidad_victoria', archivo: 'assets/images/battle/personajes/Victoria.jpg' },
  derrota: { clave: 'finalidad_derrota', archivo: 'assets/images/battle/personajes/Derrota.png' },
  empate: { clave: 'finalidad_empate', archivo: 'assets/images/battle/personajes/Empate.jpg' },
};

const CARTAS = {
  victoria: {
    titulo: 'VICTORIA',
    subtitulo: 'Te gusto w?',
    colorBorde: 0x6fcf6a,
    colorTitulo: '#7dce6a',
    imagen: ASSETS.victoria.clave,
  },
  derrota: {
    titulo: 'Derrota...',
    subtitulo: 'kechuti? pgdr',
    colorBorde: 0xe67e22,
    colorTitulo: '#e67e22',
    imagen: ASSETS.derrota.clave,
  },
  empate: {
    titulo: 'Empate???',
    subtitulo: 'No me digas de que se bugeo como ruyos llegaste a este resultado???',
    colorBorde: 0xf5f5f5,
    colorTitulo: '#f0f0f0',
    imagen: ASSETS.empate.clave,
  },
};

export function precargarAssetsFinalidad(escena) {
  if (!escena?.load) return;
  Object.values(ASSETS).forEach((asset) => {
    if (!escena.textures.exists(asset.clave)) {
      escena.load.image(asset.clave, asset.archivo);
    }
  });
}

function fijarHud(obj) {
  obj.setScrollFactor(0);
  return obj;
}

function dibujarChevrons(escena, cx, cy, color, depth, alcance) {
  const g = escena.add.graphics();
  g.setDepth(depth);
  fijarHud(g);
  g.lineStyle(4, color, 1);
  const d = alcance;
  g.beginPath();
  g.moveTo(cx - d + 28, cy - 48);
  g.lineTo(cx - d, cy);
  g.lineTo(cx - d + 28, cy + 48);
  g.moveTo(cx + d - 28, cy - 48);
  g.lineTo(cx + d, cy);
  g.lineTo(cx + d - 28, cy + 48);
  g.strokePath();
  return g;
}

function colocarImagen(escena, x, y, clave, maxAncho, maxAlto, depth) {
  const img = escena.add.image(x, y, clave);
  img.setDepth(depth);
  fijarHud(img);
  const escala = Math.min(maxAncho / img.width, maxAlto / img.height);
  img.setScale(escala);
  return img;
}

function crearBoton(escena, x, y, ancho, alto, texto, colorBorde, depth, onClick) {
  const hit = escena.add.rectangle(x, y, ancho, alto, 0x111111, 1);
  hit.setStrokeStyle(3, colorBorde, 1);
  hit.setDepth(depth);
  hit.setInteractive({ useHandCursor: true });
  fijarHud(hit);

  const lbl = escena.add.text(x, y, texto, {
    fontFamily: 'Arial',
    fontSize: 22,
    color: '#e8c547',
  });
  lbl.setOrigin(0.5);
  lbl.setDepth(depth + 1);
  fijarHud(lbl);

  hit.on('pointerdown', (pointer) => {
    pointer.event?.stopPropagation?.();
    onClick?.();
  });

  return [hit, lbl];
}

export function mostrarFinalidad(escenaHud, opciones) {
  const { resultado, destino, alSalir, onHistorial } = opciones;
  const carta = CARTAS[resultado] ?? CARTAS.empate;
  const camara = escenaHud.cameras?.main;
  const ancho = camara?.width ?? escenaHud.scale.width;
  const alto = camara?.height ?? escenaHud.scale.height;
  const cx = ancho / 2;
  const cy = alto / 2;

  const piezas = [];
  const overlay = escenaHud.add.rectangle(cx, cy, ancho, alto, 0x000000, 1);
  overlay.setDepth(DEPTH_FONDO);
  overlay.setInteractive();
  fijarHud(overlay);
  piezas.push(overlay);

  const marcoAncho = Math.min(ancho * 0.9, 1500);
  const marcoAlto = Math.min(alto * 0.9, 820);
  const marco = escenaHud.add.rectangle(cx, cy, marcoAncho, marcoAlto, 0x0a0a0a, 1);
  marco.setStrokeStyle(4, carta.colorBorde, 1);
  marco.setDepth(DEPTH_CARTA);
  fijarHud(marco);
  piezas.push(marco);

  const titulo = escenaHud.add.text(cx, cy - marcoAlto * 0.42, carta.titulo, {
    fontFamily: 'Arial',
    fontSize: 64,
    color: carta.colorTitulo,
    align: 'center',
  });
  titulo.setOrigin(0.5);
  titulo.setDepth(DEPTH_CARTA + 1);
  fijarHud(titulo);
  piezas.push(titulo);

  const yImagen = cy - marcoAlto * 0.04;
  const maxImgAncho = marcoAncho * 0.42;
  const maxImgAlto = marcoAlto * 0.48;
  piezas.push(dibujarChevrons(
    escenaHud,
    cx,
    yImagen,
    carta.colorBorde,
    DEPTH_CARTA + 1,
    maxImgAncho * 0.62,
  ));
  if (escenaHud.textures.exists(carta.imagen)) {
    piezas.push(colocarImagen(
      escenaHud,
      cx,
      yImagen,
      carta.imagen,
      maxImgAncho,
      maxImgAlto,
      DEPTH_CARTA + 2,
    ));
  }

  const subtitulo = escenaHud.add.text(cx, cy + marcoAlto * 0.28, carta.subtitulo, {
    fontFamily: 'Arial',
    fontSize: 22,
    color: '#cfcfcf',
    align: 'center',
    wordWrap: { width: marcoAncho * 0.8, useAdvancedWrap: true },
  });
  subtitulo.setOrigin(0.5, 0);
  subtitulo.setDepth(DEPTH_CARTA + 1);
  fijarHud(subtitulo);
  piezas.push(subtitulo);

  const yBotones = cy + marcoAlto * 0.4;
  const hueco = 100;
  const anchoBtn = 240;
  piezas.push(...crearBoton(
    escenaHud,
    cx - hueco - anchoBtn / 2,
    yBotones,
    anchoBtn,
    58,
    'Ver historial',
    carta.colorBorde,
    DEPTH_CARTA + 1,
    () => onHistorial?.(),
  ));
  piezas.push(...crearBoton(
    escenaHud,
    cx + hueco + anchoBtn / 2,
    yBotones,
    anchoBtn,
    58,
    'Salir',
    carta.colorBorde,
    DEPTH_CARTA + 1,
    () => alSalir?.(destino),
  ));

  return {
    piezas,
    destruir() {
      piezas.forEach((p) => p?.destroy?.());
    },
  };
}
