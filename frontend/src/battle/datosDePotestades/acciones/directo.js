/**
 * acciones/directo.js — Acciones que no necesitan objetivo.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Firma viva: (objetivo, contexto) => void | { efectoPasivo }
 * Aqui `objetivo` llega null.
 */

import { costeDeAccion, ganarAccionismoExtra, gastarFichas, lanzadorDe, recalcular } from './diana.js';
import { ponerEfecto, quitarEfecto } from '../efectosEstado.js';

export class AccionesDirecto {
  static generarMagia(cantidad = 1) {
    return (_objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      if (!lanzador?.estadisticas) return;
      lanzador.estadisticas.magia = Number(lanzador.estadisticas.magia ?? 0) + cantidad;
      recalcular(lanzador);
    };
  }

  static descansar() {
    return (_objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      if (!lanzador) return;
      ganarAccionismoExtra(lanzador, 1);
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
      if (Number(lanzador.estadisticas.anticristo) >= 7 && !lanzador.transformado) {
        lanzador.transformado = true;
        lanzador._transformarEsteShow = true;
        quitarEfecto(lanzador, 'cristianismo');
        ponerEfecto(lanzador, 'dominio');
      }
      recalcular(lanzador);
    };
  }

  static pacto() {
    return (_objetivo, contexto) => {
      const lanzador = lanzadorDe(contexto);
      if (!lanzador?.estadisticas) return;
      const coste = costeDeAccion(contexto?.tarea?.accion, 'pacto');
      if (!gastarFichas(lanzador, coste)) return;
      lanzador.estadisticas.hp = Math.max(0, Number(lanzador.estadisticas.hp ?? 0) - 1);
      lanzador.pactoActivo = true;
      recalcular(lanzador);
    };
  }
}
