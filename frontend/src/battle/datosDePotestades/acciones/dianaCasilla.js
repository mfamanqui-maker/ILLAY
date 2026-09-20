/**
 * acciones/dianaCasilla.js — Acciones que senalan una casilla.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Firma viva: (objetivo, contexto) => void | { efectoPasivo }
 * `objetivo` son coordenadas base 1 `{ x, y }`.
 */

import { moverEnTablero } from '../../tablero/UtilsTablero.js';
import { lanzadorDe } from './diana.js';

export class AccionesDianaCasilla {
  static moverse() {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      if (!lanzador || !objetivo) return;
      if (!moverEnTablero(lanzador, objetivo, contexto?.tablero)) return;
      lanzador.datos = lanzador.datos ?? {};
      lanzador.datos.posicion = { x: Number(objetivo.x), y: Number(objetivo.y) };
    };
  }

  static ponerTrampa() {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const casilla = contexto?.tablero?.[objetivo?.y - 1]?.[objetivo?.x - 1];
      if (!casilla || !lanzador) return;
      const dano = Number(lanzador.estadisticas?.dano ?? 0);
      casilla.trampa = { idDueno: lanzador.id, dano };
      return {
        efectoPasivo: {
          momento: 'alMoverseACasilla',
          condicion: (ctx) => {
            const pos = ctx?.tarea?.potestad?.datos?.posicion;
            return Number(pos?.x) === Number(objetivo.x) && Number(pos?.y) === Number(objetivo.y)
              && ctx?.tarea?.potestad?.bando !== lanzador.bando;
          },
          aplicar: (ctx) => {
            const pisador = ctx?.tarea?.potestad;
            if (!pisador?.estadisticas) return;
            pisador.estadisticas.hp = Number(pisador.estadisticas.hp ?? 0) - dano;
            casilla.trampa = null;
          },
        },
      };
    };
  }
}
