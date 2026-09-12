/**
 * potestades/campesinos.js — Familia Campesinos.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE APORTA: sus estadisticas, su catalogo de acciones y su color. El resto
 * —recalculo, animaciones, inventario— lo hereda de baseDePotestad.js.
 *
 * QUE YA NO APORTA: colocarse en el tablero. En el codigo viejo eso venia
 * heredado de BaseGeneral, y arrastraba Phaser hasta la raiz de la jerarquia
 * de personajes. Ahora es de PotestadesTablero.
 *
 * LAS ACCIONES VIAJAN POR NOMBRE (regla 6 del contrato). Aqui se declara que
 * acciones tiene la potestad y con que numeros; la funcion vive en acciones/ y
 * la resuelve IndexDePotestades. Esto es lo que hace serializable la
 * configuracion del turno: un nombre cabe en un JSON, una closure no.
 */

import { ICONOS, Potestad } from './baseDePotestad.js';

export class Campesino extends Potestad {
  static arquetipo = 'Campesino';
  static color = 0x7ac74f;

  static tabla(nivel) {
    return {
      estadisticas: {
        hp: 3,
        escudos: 2,
        curas: 1,
        dano: 1,
        velocidad: 2,
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
        { nombre: 'escudar', rango: 2, velocidad: 10 + 3 * (nivel - 1), condicional: stats.escudos > 0, ruta: `${ICONOS}/E_Wood03.png` },
        { nombre: 'atacar', rango: stats.rango, velocidad: 15 + (nivel - 1), condicional: true, ruta: `${ICONOS}/S_Sword01.png` },
      ],
      objetos: [
        { nombre: 'ponerTrampa', rango: 1, velocidad: 10, condicional: true, ruta: `${ICONOS}/S_Earth03.png` },
      ],
      movimiento: [
        { nombre: 'moverse', rango: 1, velocidad: 10, condicional: true, ruta: `${ICONOS}/A_Shoes01.png` },
      ],
    };
  }
}

export const POTESTADES_CAMPESINO = [Campesino];
