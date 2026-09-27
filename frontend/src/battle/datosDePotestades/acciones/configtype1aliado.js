/**
 * acciones/configtype1aliado.js — Escudar: espera al rival y senala un aliado.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Firma viva: (objetivo, contexto) => void | { efectoPasivo }
 */

import { costeDeAccion, ganarAccionismoExtra, gastarFichas, lanzadorDe, resolverPotestad } from './diana.js';

export class AccionesConfigType1Aliado {
  static escudar() {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const protegido = resolverPotestad(objetivo, contexto?.registro);
      // Sin amenazado elegido (0 rivales atacando): no hace nada.
      if (!lanzador?.estadisticas || !protegido) return;
      const coste = costeDeAccion(contexto?.tarea?.accion, 'escudar');
      if (!gastarFichas(lanzador, coste)) return;
      const idProtegido = String(protegido.id);
      return {
        efectoPasivo: {
          momento: 'alRecibirProyectil',
          protegido,
          condicion: (ctx) => String(ctx?.objetivo?.id) === idProtegido,
          aplicar: (ctx) => {
            if (ctx?.anular) ctx.anular();
            if (ctx?.dano != null) ctx.dano = 0;
            ganarAccionismoExtra(lanzador, 1);
          },
        },
      };
    };
  }
}
