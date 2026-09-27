/**
 * seleccion/brillos.js — Parpadeo de sprites y overlays de casilla.
 *
 * SPECT: docs/spects/spect006.md
 *
 * REGLA 8 DEL CONTRATO: Phaser solo para marcas de seleccion.
 * Phaser llega como global (app.html), igual que el resto de battle/.
 */

const COLOR_ESPERA = 0xfff2b0;
const COLOR_ROJO = 0xff6b6b;
const COLOR_CASILLA = 0xffe066;

/** sprite|overlay → { tween, alphaPrevio, tintePrevio, escena, destruir } */
const brillos = new Map();
/** Overlays de casilla creados en una diana de suelo. */
const overlaysCasilla = [];

export function iniciarBrillo(objetivo, opciones = {}) {
  const escena = opciones.escena ?? objetivo?.scene;
  if (!objetivo || !escena) return;
  frenarBrillo(objetivo);

  const alphaPrevio = objetivo.alpha;
  const tintePrevio = objetivo.tintTopLeft;
  if (opciones.color === 'rojo' && objetivo.setTint) objetivo.setTint(COLOR_ROJO);
  else if (opciones.color !== 'casilla' && objetivo.setTint) objetivo.setTint(COLOR_ESPERA);

  const tween = escena.tweens.add({
    targets: objetivo,
    alpha: opciones.alphaDestino ?? 0.5,
    duration: opciones.duracion ?? 520,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
  brillos.set(objetivo, {
    tween,
    alphaPrevio,
    tintePrevio,
    escena,
    destruir: opciones.destruir === true,
  });
}

export function frenarBrillo(objetivo) {
  const estado = brillos.get(objetivo);
  if (!estado) return;
  estado.escena?.tweens?.killTweensOf(objetivo);
  brillos.delete(objetivo);
  if (estado.destruir) {
    objetivo.destroy?.();
    return;
  }
  if (objetivo.active === false) return;
  objetivo.setAlpha?.(estado.alphaPrevio ?? 1);
  // Siempre limpia el tinte de seleccion; no reaplicar tintePrevio (a veces
  // ya era el rojo de una marca anterior y el sprite quedaba rojo).
  objetivo.clearTint?.();
}

export function frenarTodosLosBrillos() {
  [...brillos.keys()].forEach((objetivo) => frenarBrillo(objetivo));
}

export function iniciarBrilloCasilla(casilla, escena) {
  const base = casilla?.casillaPhaser;
  if (!base?.active || !escena) return null;

  const ancho = base.displayWidth || (base.width * (base.scaleX ?? 1)) || 1;
  const alto = base.displayHeight || (base.height * (base.scaleY ?? 1)) || 1;
  const cx = base.x + ancho * (0.5 - (base.originX ?? 0));
  const cy = base.y + alto * (0.5 - (base.originY ?? 0));

  const overlay = escena.add.rectangle(cx, cy, ancho, alto, COLOR_CASILLA);
  overlay.setDepth((base.depth ?? 0) + 1);
  overlay.setAlpha(0.25);
  overlay.setInteractive({ useHandCursor: true });
  const blend = globalThis.Phaser?.BlendModes?.ADD;
  if (blend != null) overlay.setBlendMode(blend);

  iniciarBrillo(overlay, { escena, color: 'casilla', alphaDestino: 0.7, duracion: 620, destruir: true });
  overlaysCasilla.push(overlay);
  return overlay;
}

export function frenarBrillosCasilla() {
  const copia = overlaysCasilla.splice(0, overlaysCasilla.length);
  copia.forEach((overlay) => frenarBrillo(overlay));
}
