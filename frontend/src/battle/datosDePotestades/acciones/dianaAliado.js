/**
 * acciones/dianaAliado.js — Acciones que senalan a un aliado.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Firma viva: (objetivo, contexto) => void | { efectoPasivo }
 */

import { AccionesDiana, costeDeAccion, gastarFichas, lanzadorDe, recalcular, resolverPotestad } from './diana.js';

export class AccionesDianaAliado {
  static curar(cantidad = 1) {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const coste = costeDeAccion(contexto?.tarea?.accion, 'curar');
      if (!gastarFichas(lanzador, coste)) return;
      const blanco = resolverPotestad(objetivo, contexto?.registro);
      const hpAntes = Number(blanco?.estadisticas?.hp ?? 0);
      AccionesDiana.curarHp(cantidad)(objetivo, contexto);
      if (blanco && hpAntes <= 0 && Number(blanco.estadisticas?.hp ?? 0) > 0) {
        blanco.muerta = false;
        blanco._muerteAnimada = false;
        blanco.aplicarCuerpoVivo?.(contexto?.escena);
        recalcular(blanco);
      }
    };
  }

  static zombiosis(cantidad = 2) {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const coste = costeDeAccion(contexto?.tarea?.accion, 'zombiosis');
      const blanco = resolverPotestad(objetivo, contexto?.registro);
      if (!blanco?.estadisticas) return;
      if (!gastarFichas(lanzador, coste)) return;
      blanco.estadisticas.hp = Math.max(Number(blanco.estadisticas.hp ?? 0), 0) + cantidad;
      const techo = Number(blanco.constantes?.hpMax ?? Infinity);
      if (Number.isFinite(techo)) {
        blanco.estadisticas.hp = Math.min(blanco.estadisticas.hp, techo);
      }
      blanco.muerta = false;
      blanco._muerteAnimada = false;
      blanco.aplicarCuerpoVivo?.(contexto?.escena);
      recalcular(blanco);
    };
  }
}
