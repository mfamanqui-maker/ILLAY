/**
 * potestades/intelectual.js — Familia Intelectuales.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Estadisticas, catalogo de acciones y color. Nada mas.
 *
 * `disparar` no estaba en la lista de acciones del borrador pero si tenia
 * animacion declarada, y sin ella `apuntar` no lleva a ningun sitio. Se incluye
 * encadenada: solo esta disponible con un objetivo ya apuntado.
 */

import { ICONOS, Potestad } from './baseDePotestad.js';

export class Intelectual extends Potestad {
  static arquetipo = 'Intelectual';
  static color = 0xd8a13a;

  static tabla(nivel) {
    return {
      estadisticas: {
        hp: 3,
        escudos: 2,
        conocimiento: 3,
        velocidad: 1,
        dano: 1,
        rango: 1,
        // Id de la potestad apuntada. Lo pone `apuntar` y lo gasta `disparar`.
        apuntando: null,
      },
      constantes: {
        hpMax: 5 + 2 * nivel,
        accionismo: 1,
        zombiosis: 1,
        // Dato declarado, sin efecto todavia: quien lo lee es el guion.
        triggerArquetipo: { arquetipo: 'Opcion de espera' },
      },
    };
  }

  static catalogo(stats, nivel) {
    return {
      habilidades: [
        { nombre: 'escudar', rango: 2, velocidad: 10 + 3 * (nivel - 1), condicional: stats.escudos > 0, ruta: `${ICONOS}/E_Wood03.png` },
        { nombre: 'estudiar', velocidad: 20, condicional: true, ruta: `${ICONOS}/I_Book.png` },
        { nombre: 'apuntar', rango: 4, velocidad: 5, condicional: true, ruta: `${ICONOS}/I_Eye.png` },
        { nombre: 'disparar', rango: 4, velocidad: 15, condicional: stats.apuntando != null, ruta: `${ICONOS}/S_Bow01.png` },
      ],
      objetos: [],
      movimiento: [
        { nombre: 'moverse', rango: 1, velocidad: 10, condicional: true, ruta: `${ICONOS}/A_Shoes01.png` },
      ],
    };
  }
}

export const POTESTADES_INTELECTUAL = [Intelectual];
