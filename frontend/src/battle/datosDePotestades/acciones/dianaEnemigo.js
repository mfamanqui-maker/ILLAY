/**
 * acciones/dianaEnemigo.js — Acciones que senalan a un enemigo.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Firma viva: (objetivo, contexto) => void | { efectoPasivo }
 */

import { AccionesDiana, costeDeAccion, gastarFichas, lanzadorDe, resolverPotestad } from './diana.js';
import { quitarEfecto } from '../efectosEstado.js';

export class AccionesDianaEnemigo {
  static atacar(cantidad) {
    return (objetivo, contexto) => {
      const dano = cantidad ?? lanzadorDe(contexto)?.estadisticas?.dano ?? 0;
      AccionesDiana.hacerDano(dano)(objetivo, contexto);
    };
  }

  static apuntar() {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const coste = costeDeAccion(contexto?.tarea?.accion, 'apuntar');
      if (!gastarFichas(lanzador, coste)) return;
      const blanco = resolverPotestad(objetivo, contexto?.registro);
      if (!blanco) return;
      lanzador.cazaPendiente = { idBlanco: blanco.id, dano: 3 };
    };
  }

  static disparar(cantidad) {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const coste = costeDeAccion(contexto?.tarea?.accion, 'disparar');
      if (!gastarFichas(lanzador, coste)) return;
      const blanco = resolverPotestad(objetivo, contexto?.registro);
      if (!blanco) return;
      const base = Number(cantidad ?? lanzador.estadisticas.dano ?? 0);
      const dano = lanzador.estadisticas.apuntando === blanco.id ? base * 2 : base;
      AccionesDiana.hacerDano(dano)(objetivo, contexto);
      lanzador.estadisticas.apuntando = null;
      quitarEfecto(lanzador, 'caza');
    };
  }

  static maldicion(cantidad) {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const coste = costeDeAccion(contexto?.tarea?.accion, 'maldicion');
      if (!gastarFichas(lanzador, coste)) return;
      const dano = cantidad ?? Number(lanzador.estadisticas.dano ?? 0) - 1;
      AccionesDiana.hacerDano(dano)(objetivo, contexto);
    };
  }
}
