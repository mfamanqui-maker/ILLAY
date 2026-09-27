/**
 * acciones/dianaCasilla.js — Acciones que senalan una casilla.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Firma viva: (objetivo, contexto) => void | { efectoPasivo }
 * `objetivo` son coordenadas base 1 `{ x, y }`.
 */

import { calcularRayoHastaBorde, moverEnTablero } from '../../tablero/UtilsTablero.js';
import { AccionesDiana, costeDeAccion, gastarFichas, lanzadorDe } from './diana.js';

function casillaDe(tablero, objetivo) {
  if (!tablero || !objetivo) return null;
  return tablero[Number(objetivo.y) - 1]?.[Number(objetivo.x) - 1] ?? null;
}

function centroDeCasilla(casilla, objetivo, t) {
  const base = casilla?.casillaPhaser;
  if (base) {
    const ancho = base.displayWidth || t;
    const alto = base.displayHeight || t;
    return {
      x: base.x + ancho * (0.5 - (base.originX ?? 0)),
      y: base.y + alto * (0.5 - (base.originY ?? 0)),
    };
  }
  return {
    x: (Number(objetivo?.x) - 1) * t + t / 2,
    y: (Number(objetivo?.y) - 1) * t + t / 2,
  };
}

export function crearVisualTrampa(escena, x, y, tamanoCasilla) {
  if (!escena?.add) return null;
  const t = Number(tamanoCasilla) || 400;
  const radio = Math.max(18, t * 0.16);
  const marca = escena.add.container(x, y);
  const disco = escena.add.circle(0, 0, radio, 0x3d2410, 1);
  disco.setStrokeStyle?.(Math.max(4, t * 0.018), 0xffc94a);
  const nucleo = escena.add.circle(0, 0, radio * 0.38, 0x111111, 1);
  marca.add([disco, nucleo]);
  marca.setDepth(7);
  return marca;
}

export function colocarMarcaTrampa(casilla, contexto, objetivo) {
  if (!casilla) return null;
  casilla.trampa?.marca?.destroy?.();
  const escena = contexto?.escena;
  const t = contexto?.tamanoCasilla ?? 400;
  const centro = centroDeCasilla(casilla, objetivo, t);
  const marca = crearVisualTrampa(escena, centro.x, centro.y, t);
  casilla.trampa = {
    idDueno: casilla.trampa?.idDueno ?? null,
    dano: Number(casilla.trampa?.dano ?? 3),
    x: Number(objetivo?.x),
    y: Number(objetivo?.y),
    marca,
  };
  return casilla.trampa;
}

export function quitarMarcaTrampa(casilla) {
  casilla?.trampa?.marca?.destroy?.();
  if (casilla) casilla.trampa = null;
}

export class AccionesDianaCasilla {
  static moverse() {
    return (objetivo, contexto) => {
      // El guion aplica todos los movimientos del grupo a la vez
      // (aplicarMovimientosSimultaneos). Si ya corrio, no repetir.
      if (contexto?.tarea?._movimientoAplicado) return;

      const lanzador = lanzadorDe(contexto);
      if (!lanzador || !objetivo) return;
      if (!moverEnTablero(lanzador, objetivo, contexto?.tablero)) {
        const pos = lanzador.datos?.posicion;
        if (contexto?.tarea && pos) {
          contexto.tarea.objetivo = { x: Number(pos.x), y: Number(pos.y) };
        }
        return;
      }
      lanzador.datos = lanzador.datos ?? {};
      lanzador.datos.posicion = { x: Number(objetivo.x), y: Number(objetivo.y) };

      const casilla = casillaDe(contexto?.tablero, objetivo);
      if (!casilla?.trampa || !lanzador.estadisticas) return;
      const dano = Number(casilla.trampa.dano ?? 3);
      lanzador.estadisticas.hp = Number(lanzador.estadisticas.hp ?? 0) - dano;
      if (contexto?.tarea) {
        contexto.tarea.trampaPisada = {
          x: Number(objetivo.x),
          y: Number(objetivo.y),
        };
      }
      quitarMarcaTrampa(casilla);
    };
  }

  static ponerTrampa() {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const casilla = casillaDe(contexto?.tablero, objetivo);
      if (!casilla || !lanzador) return;
      casilla.trampa = { idDueno: lanzador.id, dano: 3 };
      colocarMarcaTrampa(casilla, contexto, objetivo);
    };
  }

  static rayoDeMagia(cantidad) {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const coste = costeDeAccion(contexto?.tarea?.accion, 'rayo de magia');
      if (!gastarFichas(lanzador, coste)) return;
      const origen = lanzador.datos?.posicion;
      const celdas = calcularRayoHastaBorde(origen, objetivo, contexto?.tablero);
      const dano = cantidad ?? Number(lanzador.estadisticas.dano ?? 0) + 3;
      if (contexto?.tarea) contexto.tarea.rayoCeldas = celdas;
      celdas.forEach((celda) => {
        const casilla = casillaDe(contexto?.tablero, celda);
        const entidad = casilla?.entidad;
        if (!entidad?.estadisticas || entidad === lanzador) return;
        const pos = entidad.datos?.posicion;
        if (
          !pos
          || Number(pos.x) !== Number(celda.x)
          || Number(pos.y) !== Number(celda.y)
        ) {
          if (casilla.entidad === entidad) casilla.entidad = false;
          return;
        }
        // Escudo: anula solo este hit, no toda la tarea del rayo.
        let anulado = false;
        const ctxHit = {
          objetivo: entidad,
          tarea: contexto?.tarea,
          anular: () => { anulado = true; },
          dano,
        };
        contexto?.pila?.verificar?.('alRecibirProyectil', ctxHit);
        if (anulado || Number(ctxHit.dano) <= 0) return;
        AccionesDiana.hacerDano(Number(ctxHit.dano) || dano)(entidad, contexto);
      });
    };
  }
}
