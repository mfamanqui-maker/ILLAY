/**
 * acciones/dianaEnemigo.js — Acciones que senalan a un enemigo.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Firma viva: (objetivo, contexto) => void | { efectoPasivo }
 */

import { AccionesDiana, lanzadorDe, recalcular, resolverPotestad } from './diana.js';

export class AccionesDianaEnemigo {
  static atacar(cantidad) {
    return (objetivo, contexto) => {
      const dano = cantidad ?? lanzadorDe(contexto)?.estadisticas?.dano ?? 0;
      AccionesDiana.hacerDano(dano)(objetivo, contexto);
    };
  }

  static rayoDeMagia(cantidad, coste = 3) {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      if (!lanzador?.estadisticas) return;
      const dano = cantidad ?? Number(lanzador.estadisticas.dano ?? 0) + 1;
      lanzador.estadisticas.magia = Number(lanzador.estadisticas.magia ?? 0) - coste;
      AccionesDiana.hacerDano(dano)(objetivo, contexto);
      recalcular(lanzador);
    };
  }

  static apuntar() {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const blanco = resolverPotestad(objetivo);
      if (!lanzador?.estadisticas || !blanco) return;
      lanzador.estadisticas.conocimiento = Number(lanzador.estadisticas.conocimiento ?? 0) - 1;
      lanzador.estadisticas.apuntando = blanco.id;
      recalcular(lanzador);
      const idMarcado = blanco.id;
      const dano = Number(lanzador.estadisticas.dano ?? 0);
      return {
        efectoPasivo: {
          momento: 'alHacerAccion',
          condicion: (ctx) => ctx?.tarea?.potestad?.id === idMarcado,
          aplicar: (ctx) => {
            const marcado = ctx?.tarea?.potestad;
            if (marcado?.estadisticas) marcado.estadisticas.hp = Number(marcado.estadisticas.hp ?? 0) - dano;
          },
        },
      };
    };
  }

  static disparar(cantidad) {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const blanco = resolverPotestad(objetivo);
      if (!lanzador?.estadisticas || !blanco) return;
      const base = Number(cantidad ?? lanzador.estadisticas.dano ?? 0);
      const dano = lanzador.estadisticas.apuntando === blanco.id ? base * 2 : base;
      lanzador.estadisticas.conocimiento = Number(lanzador.estadisticas.conocimiento ?? 0) - 1;
      AccionesDiana.hacerDano(dano)(objetivo, contexto);
      lanzador.estadisticas.apuntando = null;
      recalcular(lanzador);
    };
  }

  static maldicion(cantidad) {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      if (!lanzador?.estadisticas) return;
      const dano = cantidad ?? Number(lanzador.estadisticas.dano ?? 0) + 1;
      lanzador.estadisticas.anticristo = Number(lanzador.estadisticas.anticristo ?? 0) - 1;
      AccionesDiana.hacerDano(dano)(objetivo, contexto);
      recalcular(lanzador);
    };
  }
}
