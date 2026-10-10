/**
 * acciones/configtype1aliado.js — Escudo: activa el flag en el aliado protegido.
 */

import { AccionesDirecto } from './directo.js';
import { costeDeAccion, gastarFichas, lanzadorDe, resolverPotestad } from './diana.js';

export class AccionesConfigType1Aliado {
  static escudar() {
    return (objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      const protegido = resolverPotestad(objetivo, contexto?.registro);
      if (!lanzador?.estadisticas || !protegido) return;
      if (!protegido.activacionEscudo) {
        const coste = costeDeAccion(contexto?.tarea?.accion, 'escudar');
        if (!gastarFichas(lanzador, coste)) return;
        protegido.activacionEscudo = true;
        AccionesDirecto.descansar()(null, contexto);
      }
      return { efectoPasivo: { protegido } };
    };
  }
}
