/**
 * acciones/dianaAliado.js — Acciones que senalan a un aliado.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Firma viva: (objetivo, contexto) => void | { efectoPasivo }
 */

import { AccionesDiana, lanzadorDe, recalcular, resolverPotestad } from './diana.js';

export class AccionesDianaAliado {
  static curar(cantidad = 1) {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      AccionesDiana.curarHp(cantidad)(objetivo, contexto);
      if (lanzador?.estadisticas) {
        lanzador.estadisticas.curas = Number(lanzador.estadisticas.curas ?? 0) - 1;
        recalcular(lanzador);
      }
    };
  }

  static zombiosis(cantidad = 2) {
    return (objetivo) => {
      const blanco = resolverPotestad(objetivo);
      if (!blanco?.estadisticas) return;
      blanco.estadisticas.hp = Math.max(Number(blanco.estadisticas.hp ?? 0), 0) + cantidad;
      const techo = Number(blanco.constantes?.hpMax ?? Infinity);
      if (Number.isFinite(techo)) {
        blanco.estadisticas.hp = Math.min(blanco.estadisticas.hp, techo);
      }
      recalcular(blanco);
    };
  }
}
