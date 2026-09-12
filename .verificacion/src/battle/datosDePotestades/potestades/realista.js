/**
 * potestades/realista.js — Familia Realistas.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Estadisticas, catalogo de acciones y color. Nada mas.
 *
 * La mas dura y la mas lenta de las cinco: mas hp y mas escudos que nadie, sin
 * curas y sin nada que la saque del cuerpo a cuerpo salvo su rango 2.
 */

import { ICONOS, Potestad } from './baseDePotestad.js';

export class Realista extends Potestad {
  static arquetipo = 'Realista';
  static color = 0x4f7ac7;

  static tabla(nivel) {
    return {
      estadisticas: {
        hp: 5,
        escudos: 3,
        velocidad: 1,
        dano: 2,
        rango: 2,
      },
      constantes: {
        hpMax: 5 + 2 * nivel,
        accionismo: 1,
        zombiosis: 1,
      },
    };
  }

  static catalogo(stats, nivel) {
    return {
      habilidades: [
        { nombre: 'escudar', rango: 2, velocidad: 10 + 3 * (nivel - 1), condicional: stats.escudos > 0, ruta: `${ICONOS}/E_Wood03.png` },
        { nombre: 'atacar', rango: stats.rango, velocidad: 15 + (nivel - 1), condicional: true, ruta: `${ICONOS}/S_Sword01.png` },
      ],
      objetos: [],
      movimiento: [
        { nombre: 'moverse', rango: 1, velocidad: 10, condicional: true, ruta: `${ICONOS}/A_Shoes01.png` },
      ],
    };
  }
}

export const POTESTADES_REALISTA = [Realista];
