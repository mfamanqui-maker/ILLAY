/**
 * acciones/configtype1aliado.js — Escudar: espera al rival y senala un aliado.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Firma viva: (objetivo, contexto) => void | { efectoPasivo }
 */

import { lanzadorDe, recalcular, resolverPotestad } from './diana.js';

export class AccionesConfigType1Aliado {
  static escudar() {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const protegido = resolverPotestad(objetivo);
      if (!lanzador?.estadisticas) return;
      lanzador.estadisticas.escudos = Number(lanzador.estadisticas.escudos ?? 0) - 1;
      recalcular(lanzador);
      const idProtegido = protegido?.id ?? lanzador.id;
      return {
        efectoPasivo: {
          momento: 'alRecibirProyectil',
          condicion: (ctx) => ctx?.objetivo?.id === idProtegido,
          aplicar: (ctx) => {
            if (ctx?.anular) ctx.anular();
            if (ctx?.dano != null) ctx.dano = 0;
          },
        },
      };
    };
  }
}
