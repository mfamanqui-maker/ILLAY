/**
 * ejecucion/secuenciasShow.js — Animaciones que no van en paralelo.
 *
 * SPECT: docs/spects/spect007.md
 *
 * Choque: ambos al destino pretendido, temblor, cada uno a su casilla final.
 * Mina: mover primero, luego dano + explosion (en paralelo "rebota").
 * Aqui no se resta vida a nadie.
 */

const PARTICULA_SHOW = 'particula_punto';

function asegurarParticulaShow(escena) {
  if (!escena?.textures || escena.textures.exists(PARTICULA_SHOW)) return PARTICULA_SHOW;
  const textura = escena.textures.createCanvas(PARTICULA_SHOW, 8, 8);
  const ctx = textura.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(4, 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  textura.refresh();
  return PARTICULA_SHOW;
}

function centroCasilla(pos, t) {
  return {
    x: (Number(pos.x) - 1) * t + t / 2,
    y: (Number(pos.y) - 1) * t + t / 2 - 40,
  };
}

export function tweenSpriteA(escena, sprite, pos, t, duration = 280) {
  if (!escena?.tweens || !sprite || !pos) return Promise.resolve();
  const dest = centroCasilla(pos, t);
  return new Promise((resolve) => {
    escena.tweens.add({
      targets: sprite,
      x: dest.x,
      y: dest.y,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: resolve,
    });
  });
}

export function animExplosionMina(entorno, pos) {
  const escena = entorno?.escena;
  if (!escena?.add || !pos) return Promise.resolve();
  asegurarParticulaShow(escena);
  const t = entorno.tamanoCasilla ?? 400;
  const x = (Number(pos.x) - 1) * t + t / 2;
  const y = (Number(pos.y) - 1) * t + t / 2;
  const emisor = escena.add.particles(x, y, PARTICULA_SHOW, {
    speed: { min: 50, max: 180 },
    lifespan: 420,
    scale: { start: 0.55, end: 0 },
    tint: [0xff6b1a, 0xffd166, 0x6b4f2a],
    emitting: false,
  });
  emisor.setDepth(14);
  emisor.explode(28);
  escena.time.delayedCall(480, () => emisor.destroy());
  return new Promise((resolve) => {
    escena.time.delayedCall(360, resolve);
  });
}

function temblorCamara(entorno, duracion = 220) {
  const cam = entorno?.escena?.cameras?.main;
  if (!cam?.shake) return Promise.resolve();
  cam.shake(duracion, 0.012);
  return new Promise((resolve) => {
    entorno.escena.time.delayedCall(duracion, resolve);
  });
}

function spriteDe(entrada) {
  return entrada.potestad?.sprite ?? entrada.tarea?.potestad?.sprite;
}

export async function reproducirColisiones(entradas, entorno) {
  if (entradas.length === 0) return;
  const t = entorno.tamanoCasilla ?? 400;
  const escena = entorno.escena;
  await Promise.all(entradas.map((entrada) => (
    tweenSpriteA(escena, spriteDe(entrada), entrada.tarea?.destinoPretendido, t, 240)
  )));
  await temblorCamara(entorno, 240);
  await Promise.all(entradas.map((entrada) => (
    tweenSpriteA(escena, spriteDe(entrada), entrada.tarea?.objetivo, t, 260)
  )));
}

const AZUL_ESCUDO = 0x7ed4ff;

function tweenShow(escena, config) {
  if (!escena?.tweens) return Promise.resolve();
  return new Promise((resolve) => {
    escena.tweens.add({ ...config, onComplete: resolve });
  });
}

/** El aura dura todo el turno: la pasiva del escudo tambien. */
export function quitarAuraEscudo(potestad) {
  const aura = potestad?._auraEscudo;
  if (!aura) return;
  aura.escena?.events?.off?.('update', aura.seguir);
  aura.circulo?.destroy?.();
  potestad._auraEscudo = null;
}

export function animEscudoSobre(entorno, potestad) {
  const escena = entorno?.escena;
  const sprite = potestad?.sprite;
  if (!escena?.add?.circle || !sprite) return Promise.resolve();
  quitarAuraEscudo(potestad);
  const t = entorno.tamanoCasilla ?? 400;
  const circulo = escena.add.circle(sprite.x, sprite.y, t * 0.36, AZUL_ESCUDO, 0.18)
    .setStrokeStyle(t * 0.025, AZUL_ESCUDO, 0.9)
    .setDepth((sprite.depth ?? 0) + 1)
    .setScale(0.2);
  const seguir = () => {
    if (circulo.active) circulo.setPosition(sprite.x, sprite.y);
  };
  escena.events?.on?.('update', seguir);
  potestad._auraEscudo = { circulo, seguir, escena };
  return tweenShow(escena, { targets: circulo, scale: 1, duration: 280, ease: 'Back.easeOut' });
}

export async function animBloqueoEscudo(entorno, potestad) {
  const escena = entorno?.escena;
  const sprite = potestad?.sprite;
  if (!escena?.add || !sprite) return;
  asegurarParticulaShow(escena);
  const emisor = escena.add.particles(sprite.x, sprite.y, PARTICULA_SHOW, {
    speed: { min: 80, max: 220 },
    lifespan: 380,
    scale: { start: 0.6, end: 0 },
    tint: [AZUL_ESCUDO, 0xffffff],
    emitting: false,
  });
  emisor.setDepth(14);
  emisor.explode(30);
  escena.time.delayedCall(440, () => emisor.destroy());
  const circulo = potestad._auraEscudo?.circulo;
  if (circulo) await tweenShow(escena, { targets: circulo, scale: 1.3, yoyo: true, duration: 150 });
}

export async function reproducirMovimientoConMina(entradaMove, entradasDano, explosion, entorno, lanzar) {
  await lanzar(entradaMove, entorno);
  await Promise.all([
    ...entradasDano.map((e) => lanzar(e, entorno)),
    explosion ? animExplosionMina(entorno, explosion) : Promise.resolve(),
  ]);
}
