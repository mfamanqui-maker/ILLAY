/**
 * potestades/mago.js — Familia Magos.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Estadisticas, catalogo de acciones y color. Nada mas.
 *
 * La unica familia con un recurso que se acumula durante la batalla: `magia`
 * empieza en 0 y solo `generarMagia` la sube, asi que `rayoDeMagia` no esta
 * disponible en el primer turno. Ese vaiven es lo que hace que su `condicional`
 * tenga que recalcularse cada vez que cambian las estadisticas.
 */

import { ICONOS, Potestad } from './baseDePotestad.js';

export class Mago extends Potestad {
  static arquetipo = 'Mago';
  static color = 0x9b5fd0;

  static tabla(nivel) {
    return {
      estadisticas: {
        hp: 3,
        curas: 2,
        magia: 0,
        velocidad: 1,
        dano: 1,
        rango: 1,
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
        { nombre: 'curar', rango: 3, velocidad: 15 + nivel * 2, condicional: stats.curas > 0, ruta: `${ICONOS}/S_Holy03.png` },
        { nombre: 'generarMagia', velocidad: 20, condicional: true, ruta: `${ICONOS}/S_Magic05.png` },
        { nombre: 'rayoDeMagia', rango: 3, velocidad: 15, condicional: stats.magia > 0, ruta: `${ICONOS}/S_Thunder03.png` },
        // En gris hasta que la mecanica de zombiosis exista. Ver acciones/directoEntidad.js.
        { nombre: 'zombiosis', rango: 2, velocidad: 25, condicional: false, ruta: `${ICONOS}/S_Poison03.png` },
      ],
      objetos: [],
      movimiento: [
        { nombre: 'moverse', rango: 1, velocidad: 10, condicional: true, ruta: `${ICONOS}/A_Shoes01.png` },
      ],
    };
  }
}

export const POTESTADES_MAGO = [Mago];
