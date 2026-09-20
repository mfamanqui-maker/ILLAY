/**
 * acciones/directo.js — Acciones que no necesitan objetivo.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Firma viva: (objetivo, contexto) => void | { efectoPasivo }
 * Aqui `objetivo` llega null.
 */

import { lanzadorDe, recalcular } from './diana.js';

export class AccionesDirecto {
  static generarMagia(cantidad = 1) {
    return (_objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      if (!lanzador?.estadisticas) return;
      lanzador.estadisticas.magia = Number(lanzador.estadisticas.magia ?? 0) + cantidad;
      recalcular(lanzador);
    };
  }

  static estudiar(cantidad = 1) {
    return (_objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      if (!lanzador?.estadisticas) return;
      lanzador.estadisticas.conocimiento = Number(lanzador.estadisticas.conocimiento ?? 0) + cantidad;
      recalcular(lanzador);
    };
  }

  static ritual(cantidad = 1) {
    return (_objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      if (!lanzador?.estadisticas) return;
      lanzador.estadisticas.anticristo = Number(lanzador.estadisticas.anticristo ?? 0) + cantidad;
      recalcular(lanzador);
    };
  }

  static pacto() {
    return (_objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      if (!lanzador?.estadisticas) return;
      lanzador.estadisticas.escudos = Number(lanzador.estadisticas.escudos ?? 0) + 1;
      lanzador.estadisticas.hp = Number(lanzador.estadisticas.hp ?? 0) - 1;
      lanzador.estadisticas.anticristo = Number(lanzador.estadisticas.anticristo ?? 0) - 1;
      recalcular(lanzador);
      return {
        efectoPasivo: {
          momento: 'alRecibirDano',
          condicion: (ctx) => ctx?.objetivo?.id === lanzador.id || ctx?.tarea?.potestad?.id === lanzador.id,
          aplicar: (ctx) => {
            if (ctx?.dano != null) ctx.dano = 0;
            if (ctx?.anular) ctx.anular();
          },
        },
      };
    };
  }
}
