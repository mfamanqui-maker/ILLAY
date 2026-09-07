/**
 * AdministradorTablero.js — Dueno de la data del tablero y de su dibujado.
 *
 * SPECT: docs/spects/spect003.md
 *
 * QUE SERA: construye el array bidimensional a partir del molde, pinta las
 * casillas, gestiona zoom, pan y clics, y avisa por eventos de lo que pasa
 * encima. Es la fuente unica de verdad de que hay en cada casilla.
 *
 * REGLA 1 DEL CONTRATO: esto NO es una escena. Es una clase normal que recibe
 * la escena del mundo (PhaserMaster) por constructor y dibuja en ella. El
 * codigo viejo era la escena `tablero`, y por eso el resto del sistema tenia
 * que ir a buscarla con scene.get(): solo Aliados.js llamaba a
 * obtenerEscenaTablero() 18 veces. Con la escena inyectada eso desaparece.
 *
 * Sustituye a: scenes/battles/tableroScene.js y a la generacion del array de
 * classes/battle/tablero.js (ambos borrados).
 *
 * ESTADO: esqueleto con rescate adaptado. El rescate viene de una escena, asi
 * que los `this.add`, `this.input` y `this.cameras` originales se han
 * reescrito como `this.escena.*`. Revisar contra el spect 003.
 */

import {
  initAutotileConfig,
  precargarTexturasBorde,
  registrarActualizadorBordes,
  refrescarBordesTablero,
} from './autotile/renderBordesTablero.js';

const DOBLE_CLICK_MS = 320;

export const RUTA_BORDES_FRAMES = 'src/battle/administradorTablero/autotile/bordesFrames.json';

export default class AdministradorTablero {
  /**
   * @param {Phaser.Scene} escena - la escena del mundo (PhaserMaster).
   * @param {Phaser.Events.EventEmitter} eventos - emisor de PhaserMaster.
   */
  constructor(escena, eventos) {
    this.escena = escena;
    this.eventos = eventos;

    this.tileSize = 400;
    this.escalaCasilla = 8.7;
    this.tableroData = [];
    this.celdas = [];
    this.overlayBrillo = null;
    this.tweenBrillo = null;
    this.actualizadorBordes = null;
    this._ultimoClickEntidad = { entidad: null, t: 0 };
  }

  // ─── RESCATE: tableroScene.js lineas 27-30. Ruta actualizada al arbol nuevo. ─
  static precargar(escena) {
    escena.load.json('bordesFrames', RUTA_BORDES_FRAMES);
    escena.load.spritesheet('grass', 'assets/images/battle/tablero/grass.png', {
      frameWidth: 46,
      frameHeight: 46,
    });
  }

  // ─── A CONSTRUIR ─────────────────────────────────────────────────────────
  // El array bidimensional lo generaba `classes/battle/tablero.js` con un
  // getter. El spect 003 define donde vive ahora la construccion a partir del
  // molde (filas, columnas, casillaId, casillasEspeciales).
  construirDesdeMolde(molde) {}

  // ─── RESCATE: tableroScene.js lineas 50-88. Adaptado a this.escena. ─────────
  dibujar(arrayTablero) {
    this.tableroData = arrayTablero;
    this.celdas = [];
    const tileSize = this.tileSize;

    initAutotileConfig(this.escena.cache.json.get('bordesFrames'));
    precargarTexturasBorde(this.escena);

    for (let y = 0; y < arrayTablero.length; y++) {
      for (let x = 0; x < arrayTablero[y].length; x++) {
        if (arrayTablero[y][x].id === 0) {
          arrayTablero[y][x].casillaPhaser = null;
          arrayTablero[y][x].bordePhaser = null;
          continue;
        }
        // La variante de hierba es puramente cosmetica, por eso puede seguir
        // usando el azar local sin romper la regla 5 del contrato.
        const variante = Phaser.Math.Between(0, 8);
        const grass = this.escena.add
          .sprite(x * tileSize, y * tileSize, 'grass', variante)
          .setScale(this.escalaCasilla);
        grass.setSize(tileSize, tileSize);
        grass.setOrigin(0, 0);
        grass.setDepth(0);
        arrayTablero[y][x].casillaPhaser = grass;
        this.celdas.push(grass);
      }
    }

    this.actualizadorBordes = registrarActualizadorBordes(this.escena, this.tableroData, {
      tileSize,
      escala: this.escalaCasilla,
      depthBorde: 5,
      intervaloMs: 300,
    });
    this.actualizadorBordes.refrescarTodo();
  }

  // ─── RESCATE: tableroScene.js lineas 206-224. Adaptado a this.escena. ───────
  registrarZoom() {
    const zoomMin = 0.25;
    const zoomMax = 4;
    this.escena.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const cam = this.escena.cameras.main;
      cam.zoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, zoomMin, zoomMax);
    });
  }

  registrarPaneo() {
    this.escena.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      this.escena.cameras.main.scrollX -= pointer.x - pointer.prevPosition.x;
      this.escena.cameras.main.scrollY -= pointer.y - pointer.prevPosition.y;
    });
  }

  // ─── RESCATE PARCIAL: tableroScene.js lineas 226-257. ──────────────────────
  // Se conserva la deteccion de casilla y el doble clic. Lo que hacia despues
  // (abrir el panel, cambiar la entidad seleccionada) ya no es de aqui: ahora
  // se emite y escucha quien corresponda. Regla 2 del contrato.
  registrarClicCasilla() {
    this.escena.input.on('pointerdown', (pointer) => {
      const tileSize = this.tileSize;
      const punto = pointer.positionToCamera(this.escena.cameras.main);
      const col = Math.floor(punto.x / tileSize) + 1;
      const fila = Math.floor(punto.y / tileSize) + 1;

      if (col < 1 || fila < 1) return;
      if (fila > this.tableroData.length || col > this.tableroData[fila - 1].length) return;

      const casilla = this.tableroData[fila - 1][col - 1];
      if (!casilla || casilla.id === 0) return;

      this.resaltarCasilla(col, fila);

      if (casilla.entidad === false) {
        this.eventos?.emit('casillaPulsada', { col, fila, casilla });
        return;
      }

      const ahora = pointer.downTime ?? Date.now();
      const esDoble =
        this._ultimoClickEntidad.entidad === casilla.entidad &&
        ahora - this._ultimoClickEntidad.t <= DOBLE_CLICK_MS;
      this._ultimoClickEntidad = { entidad: casilla.entidad, t: ahora };

      this.eventos?.emit(esDoble ? 'potestadDoblePulsada' : 'potestadPulsada', {
        entidad: casilla.entidad,
        col,
        fila,
      });
    });
  }

  // ─── RESCATE: tableroScene.js lineas 260-327. Adaptado a this.escena. ───────
  quitarBrillo() {
    if (this.tweenBrillo) {
      this.tweenBrillo.stop();
      this.tweenBrillo.remove();
      this.tweenBrillo = null;
    }
    if (this.overlayBrillo) {
      this.overlayBrillo.destroy();
      this.overlayBrillo = null;
    }
  }

  resaltarCasilla(col, fila, duracionMs = 1800) {
    const celda = this.tableroData?.[fila - 1]?.[col - 1];
    if (!celda?.casillaPhaser) return;

    this.quitarBrillo();

    const sprite = celda.casillaPhaser;
    const tileSize = this.tileSize;
    const depthBase = Math.max(sprite.depth, celda.bordePhaser?.depth ?? 0);

    const overlay = this.escena.add.rectangle(
      (col - 1) * tileSize + tileSize / 2,
      (fila - 1) * tileSize + tileSize / 2,
      tileSize,
      tileSize,
      0xffffff,
      0.35,
    );
    overlay.setDepth(depthBase + 2);
    overlay.setBlendMode(Phaser.BlendModes.ADD);
    this.overlayBrillo = overlay;

    this.tweenBrillo = this.escena.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: duracionMs,
      ease: 'Cubic.easeOut',
      onComplete: () => this.quitarBrillo(),
    });
  }

  // ─── RESCATE: tableroScene.js lineas 273-289. Adaptado a this.escena. ───────
  notificarCambioCasilla(col, fila) {
    this.actualizadorBordes?.marcarRegion(col - 1, fila - 1);
  }

  actualizarBordesRegion(col, fila) {
    if (col == null || fila == null) {
      this.actualizadorBordes?.refrescarTodo();
      return;
    }
    refrescarBordesTablero(this.escena, this.tableroData, {
      tileSize: this.tileSize,
      escala: this.escalaCasilla,
      region: [{ x: col - 1, y: fila - 1 }],
    });
  }

  destruir() {
    this.actualizadorBordes?.detener();
    this.quitarBrillo();
  }
}
