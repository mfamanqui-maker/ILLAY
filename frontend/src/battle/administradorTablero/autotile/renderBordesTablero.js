import {
  claveBordeEn,
  getTexturasBorde,
  initAutotileConfig,
  iterarCeldasARefrescar,
} from './autotileBordes.js';

export { initAutotileConfig };

export function aplicarBordesEnTablero(scene, tablero, opciones = {}) {
  const { tileSize, escala = 8.7, depthBorde = 5, region = null } = opciones;
  const celdas = iterarCeldasARefrescar(tablero, region);

  for (const { x, y } of celdas) {
    const celda = tablero[y][x];
    const clave = claveBordeEn(tablero, x, y);

    if (!clave) {
      if (celda.bordePhaser) {
        celda.bordePhaser.destroy();
        celda.bordePhaser = null;
      }
      continue;
    }

    const px = x * tileSize;
    const py = y * tileSize;

    if (!celda.bordePhaser) {
      celda.bordePhaser = scene.add.sprite(px, py, clave).setOrigin(0, 0);
      celda.bordePhaser.setDepth(depthBorde);
    } else {
      celda.bordePhaser.setPosition(px, py);
      if (celda.bordePhaser.texture.key !== clave) {
        celda.bordePhaser.setTexture(clave);
      }
      celda.bordePhaser.setVisible(true);
    }

    celda.bordePhaser.setScale(escala);
    celda.bordePhaser.setDisplaySize(tileSize, tileSize);
  }
}

export function refrescarBordesTablero(scene, tablero, opciones = {}) {
  aplicarBordesEnTablero(scene, tablero, opciones);
}

export function precargarTexturasBorde(scene) {
  const texturas = getTexturasBorde();
  for (const [clave, ruta] of Object.entries(texturas)) {
    if (!scene.textures.exists(clave)) {
      scene.load.image(clave, ruta);
    }
  }
}

export function registrarActualizadorBordes(scene, tablero, opciones = {}) {
  const intervaloMs = opciones.intervaloMs ?? 300;
  const optsRender = {
    tileSize: opciones.tileSize,
    escala: opciones.escala,
    depthBorde: opciones.depthBorde,
  };

  const regionPendiente = new Set();

  const refrescar = () => {
    let region = null;

    if (regionPendiente.size > 0) {
      region = [...regionPendiente].map((key) => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      });
      regionPendiente.clear();
    }

    refrescarBordesTablero(scene, tablero, {
      ...optsRender,
      region,
    });
  };

  const timer = scene.time.addEvent({
    delay: intervaloMs,
    loop: true,
    callback: refrescar,
  });

  const marcar = (x, y) => regionPendiente.add(`${x},${y}`);

  return {
    refrescarTodo() {
      regionPendiente.clear();
      refrescarBordesTablero(scene, tablero, optsRender);
    },
    marcarRegion(x, y) {
      marcar(x, y);
    },
    marcarCeldas(celdas) {
      if (!celdas?.length) return;
      celdas.forEach(({ x, y }) => marcar(x, y));
    },
    detener() {
      timer.remove();
    },
  };
}
