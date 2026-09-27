/**
 * showAsincrono.js — Reproduce las animaciones de un grupo de acciones.
 *
 * SPECT: docs/spects/spect007.md
 *
 * Parte A: animaciones activas (lanzador).
 * Parte B: animaciones pasivas (receptor: recibirDano, serCurado, morir…).
 * Ambas van en el mismo Promise.all del grupo.
 *
 * Aqui no se resta vida a nadie. Los numeros ya estan calculados.
 */

import { fusionarAnimsParaShow } from './utilsEjecucion.js';

// ─── RESCATE: controladorJugada.js lineas 260-280. Adaptado. ─────────────────

export function crearContextoEjecucion(tarea, entorno) {
  return {
    tarea,
    tablero: entorno.tablero,
    escena: entorno.escena,
    eventos: entorno.eventos,
  };
}

export function resolverParametroAccion(tarea) {
  return tarea?.casillaObjetivo ?? tarea?.objetivo ?? null;
}

/** Ejecuta la funcion de la accion y espera si devuelve promesa. */
export async function ejecutarAccion(tarea, entorno) {
  const resultado = tarea?.accion?.ejecucion?.(
    resolverParametroAccion(tarea),
    crearContextoEjecucion(tarea, entorno),
  );
  if (resultado?.then) await resultado;
}

function contextoDeShow(entrada, entorno) {
  const objetivo = entrada.tarea?.objetivo ?? null;
  const destino = (objetivo && objetivo.x != null && !objetivo.estadisticas) ? objetivo : null;
  return {
    escena: entorno.escena,
    tablero: entorno.tablero,
    eventos: entorno.eventos,
    tarea: entrada.tarea ?? null,
    potestad: entrada.potestad ?? entrada.tarea?.potestad ?? null,
    objetivo,
    destino,
    tamanoCasilla: entorno.tamanoCasilla ?? 400,
  };
}

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

function tweenSpriteA(escena, sprite, pos, t, duration = 280) {
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

function animExplosionMina(entorno, pos) {
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

function tweenIntercambio(entorno, intercambio) {
  const escena = entorno?.escena;
  const sprite = intercambio?.potestad?.sprite;
  const dest = intercambio?.destino;
  if (!escena?.tweens || !sprite || !dest) return Promise.resolve();
  const t = entorno.tamanoCasilla ?? 400;
  return tweenSpriteA(escena, sprite, dest, t, 280);
}

function temblorCamara(entorno, duracion = 220) {
  const cam = entorno?.escena?.cameras?.main;
  if (!cam?.shake) return Promise.resolve();
  cam.shake(duracion, 0.012);
  return new Promise((resolve) => {
    entorno.escena.time.delayedCall(duracion, resolve);
  });
}

async function lanzarEntrada(entrada, entorno) {
  if (!entrada?.reproducir) return;
  const r = entrada.reproducir(contextoDeShow(entrada, entorno));
  if (r?.then) await r;
  if (entrada.tarea?.intercambio) await tweenIntercambio(entorno, entrada.tarea.intercambio);
}

function idDe(entrada) {
  return String(entrada?.potestad?.id ?? entrada?.tarea?.potestad?.id ?? '');
}

function esMovilidadActiva(entrada) {
  if (entrada?.tipo !== 'activa') return false;
  const n = String(entrada?.tarea?.accion?.nombre ?? entrada?.tarea?.nombreDeAccion ?? '')
    .trim()
    .toLowerCase();
  return n === 'moverse' || n === 'movilidad rapida' || n === 'movilidad lenta';
}

/**
 * Choque: ambos van al destino pretendido, temblor, luego a la casilla final.
 */
async function reproducirColisiones(entradas, entorno) {
  if (entradas.length === 0) return;
  const t = entorno.tamanoCasilla ?? 400;
  const escena = entorno.escena;
  await Promise.all(entradas.map((entrada) => {
    const sprite = entrada.potestad?.sprite ?? entrada.tarea?.potestad?.sprite;
    const pretendido = entrada.tarea?.destinoPretendido;
    return tweenSpriteA(escena, sprite, pretendido, t, 240);
  }));
  await temblorCamara(entorno, 240);
  await Promise.all(entradas.map((entrada) => {
    const sprite = entrada.potestad?.sprite ?? entrada.tarea?.potestad?.sprite;
    const final = entrada.tarea?.objetivo;
    return tweenSpriteA(escena, sprite, final, t, 260);
  }));
}

/**
 * Mover a la mina y luego dano/explosion (no en paralelo: evita el "rebote").
 */
async function reproducirMovimientoConMina(entradaMove, entradasDano, explosion, entorno) {
  await lanzarEntrada(entradaMove, entorno);
  await Promise.all([
    ...entradasDano.map((e) => lanzarEntrada(e, entorno)),
    explosion ? animExplosionMina(entorno, explosion) : Promise.resolve(),
  ]);
}

/**
 * Reproduce activas + pasivas del grupo.
 * Colisiones y pisadas de mina se secuencian; el resto va en paralelo.
 */
export async function reproducirGrupo(resultadoGrupo, entorno) {
  const entradas = fusionarAnimsParaShow(resultadoGrupo);
  const tareas = resultadoGrupo?.tareas ?? [];

  const colisionIds = new Set(
    tareas.filter((t) => t?.colisionMovimiento && t?.destinoPretendido)
      .map((t) => String(t.potestad?.id)),
  );
  const entradasColision = entradas.filter(
    (e) => esMovilidadActiva(e) && colisionIds.has(idDe(e)),
  );
  const resto = entradas.filter((e) => !entradasColision.includes(e));

  const pisadasPorId = new Map();
  tareas.forEach((t) => {
    if (!t?.trampaPisada) return;
    pisadasPorId.set(String(t.potestad?.id), t.trampaPisada);
  });

  const movesMina = resto.filter((e) => esMovilidadActiva(e) && pisadasPorId.has(idDe(e)));
  const idsMina = new Set(movesMina.map(idDe));
  const danosMina = resto.filter(
    (e) => e.tipo === 'pasiva' && e.clave === 'recibirDano' && idsMina.has(idDe(e)),
  );
  const restoLimpio = resto.filter((e) => !movesMina.includes(e) && !danosMina.includes(e));

  const explosionesHechas = new Set();
  const secuenciasMina = movesMina.map((move) => {
    const id = idDe(move);
    const pos = pisadasPorId.get(id);
    const clave = pos ? `${pos.x},${pos.y}` : null;
    const explosion = (clave && !explosionesHechas.has(clave)) ? pos : null;
    if (clave) explosionesHechas.add(clave);
    const danos = danosMina.filter((d) => idDe(d) === id);
    return reproducirMovimientoConMina(move, danos, explosion, entorno);
  });

  // Explosiones de mina sin move anim (por si acaso)
  tareas.forEach((t) => {
    if (!t?.trampaPisada) return;
    const clave = `${t.trampaPisada.x},${t.trampaPisada.y}`;
    if (explosionesHechas.has(clave)) return;
    if (idsMina.has(String(t.potestad?.id))) return;
    explosionesHechas.add(clave);
    secuenciasMina.push(animExplosionMina(entorno, t.trampaPisada));
  });

  await Promise.all([
    reproducirColisiones(entradasColision, entorno),
    ...restoLimpio.map((e) => lanzarEntrada(e, entorno)),
    ...secuenciasMina,
  ]);
}
