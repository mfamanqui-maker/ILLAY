/**
 * PotestadesTablero.js — Crea y administra las potestades sobre el tablero.
 *
 * SPECT: docs/spects/spect003.md
 *
 * QUE SERA: el puente entre una potestad (que solo sabe de estadisticas,
 * acciones y animaciones) y su cuerpo en pantalla. Instancia sprites, los
 * coloca en casillas, los orienta segun el bando y los mueve.
 *
 * POR QUE ESTA AQUI Y NO EN datosDePotestades/: colocar en casilla es
 * aritmetica de tablero, no conocimiento de la potestad. En el codigo viejo
 * vivia en BaseGeneral, la raiz de la jerarquia de personajes, y por eso cada
 * clase de personaje arrastraba dependencias de Phaser que no le tocaban.
 *
 * Rescatado de: classes/battle/familias/bases/baseGeneral.js y
 * classes/battle/familias/bases/phaserMoldFactory.js (ambos borrados).
 *
 * El rescate son funciones sueltas; la clase las usa para colocar el registro
 * ya creado. No clona acciones ni cuelga el tablero de la potestad.
 */

// ─── RESCATE: phaserMoldFactory.js lineas 20-22 y 39-59. Sirve tal cual. ─────
// Nota de vocabulario: aqui "molde" significaba la plantilla de un sprite.
// Ese sentido queda RETIRADO: en el arbol nuevo "molde" es una plantilla de
// nivel (crearNiveles/Molde001.json). Lo de aqui se llama plantillaSprite.

export function precargarSpritesheet(escena, clave, ruta, anchoFrame, altoFrame) {
  escena.load.spritesheet(clave, ruta, { frameWidth: anchoFrame, frameHeight: altoFrame });
}

export function registrarAnimaciones(escena, claveSpritesheet, definiciones) {
  if (!escena?.anims || !Array.isArray(definiciones)) return;
  definiciones.forEach((def) => {
    if (!def || def.key == null) return;
    if (escena.anims.get?.(def.key)) return;
    const inicio = def.startFrame ?? 0;
    escena.anims.create({
      key: def.key,
      frames: escena.anims.generateFrameNumbers(claveSpritesheet, {
        start: inicio,
        end: def.endFrame ?? inicio,
      }),
      frameRate: def.frameRate ?? 12,
      repeat: def.repeat ?? -1,
    });
  });
}

// ─── RESCATE: phaserMoldFactory.js lineas 88-107. Sirve tal cual. ────────────

export function crearSprite(escena, x, y, plantillaSprite, orientacion) {
  const sprite = escena.add
    .sprite(x, y, plantillaSprite.textureKey, plantillaSprite.frame ?? 0)
    .setOrigin(0.5)
    .setFlipX(orientacion !== 'izquierda');
  if (plantillaSprite.escala != null) sprite.setScale(plantillaSprite.escala);
  sprite.setScrollFactor(1, 1);
  sprite.setDepth(plantillaSprite.depth ?? 8);
  return sprite;
}

// ─── RESCATE: baseGeneral.js lineas 75-79. Sirve tal cual. ───────────────────
// Convierte casilla base 1 al centro de la casilla en coordenadas de mundo.
// El -80 es el ajuste para que el personaje se apoye en el suelo del tile.

export function casillaAMundoCentro(col, fila, tamanoCasilla) {
  return {
    x: (col - 1) * tamanoCasilla + tamanoCasilla / 2,
    y: (fila - 1) * tamanoCasilla + tamanoCasilla / 2 - 40,
  };
}

// ─── RESCATE: baseGeneral.js lineas 55-66 y 91-126. Adaptado. ────────────────
// La ubicacion es asincrona porque la animacion no puede arrancar hasta el
// tick siguiente a la creacion del sprite. `cancelarUbicacion` existe para que
// una ubicacion nueva corte limpiamente a la anterior en vez de solaparse.

export function cancelarUbicacion(potestad) {
  if (potestad._ubicarControl) {
    potestad._ubicarControl.cancelado = true;
    potestad._ubicarControl.timerEvents.forEach((ev) => ev.remove(false));
    potestad._ubicarControl = null;
  }
  if (potestad.sprite?.anims?.isPlaying) potestad.sprite.anims.stop();
}

export function ubicarEnCasilla(escena, potestad, opciones) {
  const { col, fila, tamanoCasilla = 400, orientacion } = opciones;
  cancelarUbicacion(potestad);
  potestad.datos.posicion = { x: col, y: fila };

  const config = potestad.obtenerConfigAnimacionEstatica?.();
  if (!config || !escena) return Promise.resolve(potestad);

  const { x, y } = casillaAMundoCentro(col, fila, tamanoCasilla);
  const control = { cancelado: false, timerEvents: [] };
  potestad._ubicarControl = control;

  if (!potestad.sprite) potestad.sprite = crearSprite(escena, x, y, config.plantillaSprite ?? config.molde, orientacion);
  else potestad.sprite.setPosition(x, y);

  return new Promise((resolve) => {
    const ev = escena.time.delayedCall(0, () => {
      if (control.cancelado) return resolve(potestad);
      if (config.animKey && potestad.sprite) potestad.sprite.play(config.animKey);
      resolve(potestad);
    });
    control.timerEvents.push(ev);
  });
}

/**
 * Puente: el registro ya existe; aqui solo se crea el cuerpo y se marca la casilla.
 * La casilla apunta a la potestad. La potestad no apunta de vuelta al tablero.
 */
export default class PotestadesTablero {
  constructor(escena, tablero, registro, tamanoCasilla) {
    this.escena = escena;
    this.tablero = tablero;
    this.registro = registro;
    this.tamanoCasilla = tamanoCasilla;
    this.cuerpos = new Map();
  }

  cuerpoDe(id) {
    return this.cuerpos.get(id) ?? null;
  }

  async colocar() {
    for (const { bando, potestad } of this.registro.todos()) {
      await this._colocarUna(bando, potestad);
    }
    return this.cuerpos;
  }

  async _colocarUna(bando, potestad) {
    potestad.AnimacionEstatica?.(this.escena);
    const config = potestad.obtenerConfigAnimacionEstatica?.();
    const clave = config?.plantillaSprite?.textureKey;
    if (clave) registrarAnimaciones(this.escena, clave, potestad.construirAnimaciones?.() ?? []);

    const pos = potestad.datos?.posicion ?? { x: 1, y: 1 };
    await ubicarEnCasilla(this.escena, potestad, {
      col: pos.x,
      fila: pos.y,
      tamanoCasilla: this.tamanoCasilla,
      orientacion: bando === 'Enemigos' ? 'izquierda' : 'derecha',
    });

    const casilla = this.tablero?.[pos.y - 1]?.[pos.x - 1];
    if (casilla && casilla.id !== 0) casilla.entidad = potestad;
    this.cuerpos.set(potestad.id, potestad.sprite);
  }
}
