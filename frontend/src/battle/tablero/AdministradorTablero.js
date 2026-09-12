/**
 * AdministradorTablero.js — Dueno de la data del tablero y de su dibujado.
 *
 * SPECT: docs/spects/spect003.md
 *
 * QUE ES: construye el array bidimensional a partir del molde, pinta las
 * casillas, gestiona zoom, paneo, hover y clics, y avisa por eventos de lo que pasa
 * encima. Es la fuente unica de verdad de que hay en cada casilla.
 *
 * REGLA 1 DEL CONTRATO: esto NO es una escena. Es una clase normal que recibe
 * la escena del mundo (PhaserMaster) por constructor y dibuja en ella. El
 * codigo viejo era la escena `tablero`, y por eso el resto del sistema tenia
 * que buscarla por nombre. Con la escena inyectada ese acoplamiento desaparece.
 *
 * Sustituye a: scenes/battles/tableroScene.js y a la generacion del array de
 * classes/battle/tablero.js (ambos borrados).
 *
 * El comportamiento visual vive aqui para que PhaserMaster solo coordine su
 * montaje. Los listeners tambien pertenecen a esta clase y se retiran juntos.
 */

const DOBLE_CLICK_MS = 320;
const DISTANCIA_MAXIMA_CLICK = 8;
const TAMANO_FRAME_CESPED = 46;
const ULTIMO_FRAME_CESPED = 8;

function validarConfigTablero(molde) {
  const config = molde?.configTablero;
  const tamano = config?.['tamaño'];
  if (!Number.isInteger(config?.filas) || config.filas < 1) {
    throw new Error('[AdministradorTablero] configTablero.filas debe ser un entero positivo.');
  }
  if (!Number.isInteger(config?.columnas) || config.columnas < 1) {
    throw new Error('[AdministradorTablero] configTablero.columnas debe ser un entero positivo.');
  }
  if (!Number.isFinite(tamano) || tamano <= 0) {
    throw new Error('[AdministradorTablero] configTablero.tamaño debe ser un numero positivo.');
  }
  return config;
}

function idDesdeArquetipo(arquetipo) {
  if (arquetipo === 'vacio') return 0;
  if (arquetipo === 'cesped') return 1;
  throw new Error(`[AdministradorTablero] Arquetipo de casilla desconocido: ${arquetipo}.`);
}

function indexarCasillasEspeciales(casillasEspeciales = []) {
  return new Map(
    casillasEspeciales.map(({ arquetipo, posicion }) => [
      `${posicion?.x},${posicion?.y}`,
      arquetipo,
    ]),
  );
}

export default class AdministradorTablero {
  /**
   * @param {Phaser.Scene} escena - la escena del mundo (PhaserMaster).
   * @param {Phaser.Events.EventEmitter} eventos - emisor de PhaserMaster.
   */
  constructor(escena, eventos) {
    this.escena = escena;
    this.eventos = eventos;

    this.tileSize = null;
    this.tableroData = [];
    this.celdas = [];
    this.overlayBrillo = null;
    this.tweenBrillo = null;
    this._listenersInput = [];
    this._casillaHover = null;
    this._teclaEspacio = null;
    this._ultimoClickEntidad = { entidad: null, t: 0 };
  }

  static precargar(escena) {
    escena.load.spritesheet('grass', 'assets/images/battle/tablero/grass.png', {
      frameWidth: TAMANO_FRAME_CESPED,
      frameHeight: TAMANO_FRAME_CESPED,
    });
  }

  construirDesdeMolde(molde) {
    const config = validarConfigTablero(molde);
    const especiales = indexarCasillasEspeciales(molde.casillasEspeciales);
    this.tileSize = config['tamaño'];

    return Array.from({ length: config.filas }, (_, fila) =>
      Array.from({ length: config.columnas }, (_, col) => {
        const clave = `${col + 1},${fila + 1}`;
        const arquetipo = especiales.get(clave) ?? config.casillaArquetipo;
        return { id: idDesdeArquetipo(arquetipo), entidad: false, casillaPhaser: null };
      }),
    );
  }

  dibujar(arrayTablero) {
    this.tableroData = arrayTablero;
    this.celdas = [];
    const tileSize = this.tileSize;

    for (let y = 0; y < arrayTablero.length; y++) {
      for (let x = 0; x < arrayTablero[y].length; x++) {
        if (arrayTablero[y][x].id === 0) {
          arrayTablero[y][x].casillaPhaser = null;
          continue;
        }
        // Este azar solo evita repetir el patron del suelo; no altera el estado.
        const variante = Phaser.Math.Between(0, ULTIMO_FRAME_CESPED);
        const grass = this.escena.add
          .sprite(x * tileSize, y * tileSize, 'grass', variante)
          .setOrigin(0, 0)
          .setDisplaySize(tileSize, tileSize)
          .setDepth(0);
        arrayTablero[y][x].casillaPhaser = grass;
        this.celdas.push(grass);
      }
    }
  }

  registrarZoom() {
    const zoomMin = 0.25;
    const zoomMax = 4;
    this._registrarInput('wheel', (pointer, _objetos, _deltaX, deltaY) => {
      const evento = pointer.event;
      if (!evento?.ctrlKey) return;
      evento.preventDefault?.();
      const cam = this.escena.cameras.main;
      const antes = pointer.positionToCamera(cam);
      cam.setZoom(Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, zoomMin, zoomMax));
      const despues = pointer.positionToCamera(cam);
      cam.scrollX += antes.x - despues.x;
      cam.scrollY += antes.y - despues.y;
    });
  }

  registrarPaneo() {
    this._teclaEspacio = this._capturarEspacio();
    this._registrarInput('pointermove', (pointer) => {
      if (!pointer.isDown || !this._teclaEspacio?.isDown) return;
      const cam = this.escena.cameras.main;
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });
  }

  _capturarEspacio() {
    const teclado = this.escena.input.keyboard;
    if (!teclado) return null;
    teclado.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
    return teclado.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  registrarHoverCasilla() {
    this._registrarInput('pointermove', (pointer) => this._actualizarHover(pointer));
    this._registrarInput('pointerup', (pointer) => this._actualizarHover(pointer));
    this._registrarInput('gameout', () => this._limpiarHover());
  }

  registrarClicCasilla() {
    this._registrarInput('pointerup', (pointer) => {
      const distancia = Phaser.Math.Distance.Between(
        pointer.downX,
        pointer.downY,
        pointer.upX,
        pointer.upY,
      );
      if (distancia > DISTANCIA_MAXIMA_CLICK) return;

      const seleccion = this._obtenerCasilla(pointer);
      if (!seleccion) return;
      const { col, fila, casilla } = seleccion;

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

  _registrarInput(evento, manejador) {
    this.escena.input.on(evento, manejador);
    this._listenersInput.push({ evento, manejador });
  }

  _obtenerCasilla(pointer) {
    const punto = pointer.positionToCamera(this.escena.cameras.main);
    const col = Math.floor(punto.x / this.tileSize) + 1;
    const fila = Math.floor(punto.y / this.tileSize) + 1;
    const casilla = this.tableroData?.[fila - 1]?.[col - 1];
    if (col < 1 || fila < 1 || !casilla || casilla.id === 0) return null;
    return { col, fila, casilla };
  }

  _actualizarHover(pointer) {
    if (pointer.isDown) {
      this._limpiarHover();
      return;
    }
    const seleccion = this._obtenerCasilla(pointer);
    const clave = seleccion ? `${seleccion.col},${seleccion.fila}` : null;
    if (clave === this._casillaHover) return;
    this._casillaHover = clave;
    if (!seleccion) {
      this.quitarBrillo();
      return;
    }
    this.resaltarCasilla(seleccion.col, seleccion.fila, 0);
  }

  _limpiarHover() {
    this._casillaHover = null;
    this.quitarBrillo();
  }

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
    const overlay = this.escena.add.rectangle(
      (col - 1) * tileSize + tileSize / 2,
      (fila - 1) * tileSize + tileSize / 2,
      tileSize,
      tileSize,
      0xffffff,
      0.35,
    );
    overlay.setDepth(sprite.depth + 2);
    overlay.setBlendMode(Phaser.BlendModes.ADD);
    this.overlayBrillo = overlay;

    if (duracionMs > 0) {
      this.tweenBrillo = this.escena.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: duracionMs,
        ease: 'Cubic.easeOut',
        onComplete: () => this.quitarBrillo(),
      });
    }
  }

  destruir() {
    this._listenersInput.forEach(({ evento, manejador }) => {
      this.escena.input.off(evento, manejador);
    });
    this._listenersInput = [];
    if (this._teclaEspacio) {
      this.escena.input.keyboard?.removeKey(this._teclaEspacio);
      this._teclaEspacio = null;
    }
    this.quitarBrillo();
    this.celdas.forEach((celda) => celda.destroy());
    this.celdas = [];
    this.tableroData = [];
  }
}
