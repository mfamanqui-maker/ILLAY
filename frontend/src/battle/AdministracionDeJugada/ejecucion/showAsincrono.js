/**
 * ejecucion/showAsincrono.js — Reproduce las animaciones de un grupo.
 *
 * SPECT: docs/spects/spect007.md
 *
 * Activas (lanzador) y pasivas (receptor: recibirDano, serCurado, morir…).
 * Choques y pisadas de mina se secuencian; el resto va en paralelo.
 * Aqui no se resta vida a nadie. Los numeros ya estan calculados.
 */

import { esMovilidad } from '../../datosDePotestades/acciones/catalogo.js';
import { fusionarAnimsParaShow } from './contratoShow.js';
import {
  animExplosionMina,
  reproducirColisiones,
  reproducirMovimientoConMina,
  tweenSpriteA,
} from './secuenciasShow.js';
import { nombreDeTarea } from './tareasActivas.js';

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

async function lanzarEntrada(entrada, entorno) {
  if (!entrada?.reproducir) return;
  const r = entrada.reproducir(contextoDeShow(entrada, entorno));
  if (r?.then) await r;
  const intercambio = entrada.tarea?.intercambio;
  if (intercambio?.potestad?.sprite && intercambio.destino) {
    await tweenSpriteA(entorno.escena, intercambio.potestad.sprite, intercambio.destino, entorno.tamanoCasilla ?? 400, 280);
  }
}

function idDe(entrada) {
  return String(entrada?.potestad?.id ?? entrada?.tarea?.potestad?.id ?? '');
}

function esMovilidadActiva(entrada) {
  return entrada?.tipo === 'activa' && esMovilidad(nombreDeTarea(entrada.tarea));
}

function secuenciasDeMina(resto, tareas, entorno) {
  const pisadasPorId = new Map();
  tareas.forEach((t) => {
    if (t?.trampaPisada) pisadasPorId.set(String(t.potestad?.id), t.trampaPisada);
  });

  const movesMina = resto.filter((e) => esMovilidadActiva(e) && pisadasPorId.has(idDe(e)));
  const idsMina = new Set(movesMina.map(idDe));
  const danosMina = resto.filter(
    (e) => e.tipo === 'pasiva' && e.clave === 'recibirDano' && idsMina.has(idDe(e)),
  );

  const explosionesHechas = new Set();
  const secuencias = movesMina.map((move) => {
    const id = idDe(move);
    const pos = pisadasPorId.get(id);
    const clave = pos ? `${pos.x},${pos.y}` : null;
    const explosion = (clave && !explosionesHechas.has(clave)) ? pos : null;
    if (clave) explosionesHechas.add(clave);
    const danos = danosMina.filter((d) => idDe(d) === id);
    return reproducirMovimientoConMina(move, danos, explosion, entorno, lanzarEntrada);
  });

  // Explosiones de mina sin anim de movimiento.
  tareas.forEach((t) => {
    if (!t?.trampaPisada) return;
    const clave = `${t.trampaPisada.x},${t.trampaPisada.y}`;
    if (explosionesHechas.has(clave) || idsMina.has(String(t.potestad?.id))) return;
    explosionesHechas.add(clave);
    secuencias.push(animExplosionMina(entorno, t.trampaPisada));
  });

  const usadas = new Set([...movesMina, ...danosMina]);
  return { secuencias, restoLimpio: resto.filter((e) => !usadas.has(e)) };
}

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
  const { secuencias, restoLimpio } = secuenciasDeMina(resto, tareas, entorno);

  await Promise.all([
    reproducirColisiones(entradasColision, entorno),
    ...restoLimpio.map((e) => lanzarEntrada(e, entorno)),
    ...secuencias,
  ]);
}
