/**
 * ejecucion/guion.js — Bucle del turno sobre los grupos de tareas activas.
 *
 * SPECT: docs/spects/spect007.md
 *
 * REGLA 10: por grupo de velocidad, cancelaciones → resolucion contra la
 * foto → muertes → animacion. No se pasa al grupo siguiente hasta que el
 * show termina el actual. Las pasivas viven en la pila del turno.
 */

import { ponerEfecto } from '../../datosDePotestades/efectosEstado.js';
import { aplicarCancelaciones } from './cancelaciones.js';
import { claveAnimPasiva, entradaAnimPasiva } from './contratoShow.js';
import { tomarFoto } from './foto.js';
import { crearPilaPasivas } from './pilaPasivas.js';
import { resolverGrupo } from './resolverGrupo.js';

export function detectarMuertes(potestades) {
  return (potestades ?? []).filter((potestad) => {
    const muertaAhora = Number(potestad?.estadisticas?.hp) <= 0;
    if (!muertaAhora) return false;
    if (potestad._muerteAnimada) return false;
    potestad.muerta = true;
    potestad._muerteAnimada = true;
    ponerEfecto(potestad, 'muerto');
    return true;
  });
}

export function evaluarFinBatalla(aliadosVivos, enemigosVivos) {
  if (aliadosVivos === 0 && enemigosVivos === 0) return 'empate';
  if (enemigosVivos === 0) return 'victoria';
  if (aliadosVivos === 0) return 'derrota';
  return null;
}

function contarVivos(registro, bando) {
  return (registro?.porBando?.(bando) ?? [])
    .filter(({ potestad }) => Number(potestad?.estadisticas?.hp ?? 0) > 0)
    .length;
}

function anotarGrupo(grupo, contexto, entorno) {
  (grupo.tareas ?? []).forEach((tarea) => {
    contexto.onJugada?.({ ...tarea, grupoVelocidad: grupo.velocidad });
    entorno.eventos?.emit?.('jugadaEjecutada', tarea);
  });
}

/**
 * @param grupos salida de construirTareasActivas
 * @param contexto { escena, tablero, eventos, registro, pila?, tamanoCasilla, reproducirGrupo, onJugada }
 */
export async function ejecutarTurno(grupos, contexto = {}) {
  const pila = contexto.pila ?? crearPilaPasivas();
  const entorno = {
    escena: contexto.escena,
    tablero: contexto.tablero,
    eventos: contexto.eventos,
    registro: contexto.registro,
    pila,
    tamanoCasilla: contexto.tamanoCasilla ?? 400,
  };
  const reproducir = contexto.reproducirGrupo ?? (async () => {});
  let fin = null;

  for (const grupo of grupos ?? []) {
    aplicarCancelaciones(grupo.tareas, pila);
    const potestades = contexto.registro?.todos?.().map((e) => e.potestad) ?? [];
    const resultado = resolverGrupo(grupo, tomarFoto(potestades), entorno);

    detectarMuertes(potestades).forEach((p) => {
      const anim = entradaAnimPasiva(p, claveAnimPasiva('muerte'));
      if (anim) resultado.animacionesPasivas.push(anim);
    });

    anotarGrupo(grupo, contexto, entorno);
    await reproducir(resultado, entorno);

    fin = evaluarFinBatalla(
      contarVivos(contexto.registro, 'Aliados'),
      contarVivos(contexto.registro, 'Enemigos'),
    );
    if (fin) break;
  }

  pila.limpiar();
  (contexto.registro?.todos?.() ?? []).forEach(({ potestad }) => {
    if (potestad) potestad.pactoActivo = false;
  });
  return { fin, pila };
}
