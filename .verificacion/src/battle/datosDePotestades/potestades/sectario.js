/**
 * potestades/sectario.js — Familia Sectarios.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Estadisticas, catalogo de acciones y color. Nada mas.
 *
 * La que mas pega y la mas fragil de mantener: `anticristo` sube con cada
 * ritual y, pasado de 6, su propio trigger le bloquea atacar y maldecir. El
 * trigger esta declarado como dato; quien lo aplica es el guion, no esta clase.
 */

import { ICONOS, Potestad } from './baseDePotestad.js';

export class Sectario extends Potestad {
  static arquetipo = 'Sectario';
  static color = 0xb03a2e;

  static tabla(nivel) {
    return {
      estadisticas: {
        hp: 7,
        anticristo: 0,
        velocidad: 2,
        dano: 3,
        rango: 3,
      },
      constantes: {
        hpMax: 5 + 2 * nivel,
        accionismo: 1,
        zombiosis: 0,
        // La condicion va como dato comparable y no como expresion: en el
        // borrador era `anticristo > 6`, que leia una variable inexistente en
        // ese ambito y reventaba al evaluarse. Asi el guion puede leerla sin
        // ejecutar nada.
        triggerArquetipo: {
          arquetipo: 'Bloquear acciones',
          accionesBloqueadas: ['atacar', 'maldicion'],
          condicion: { estadistica: 'anticristo', operador: '>', valor: 6 },
        },
      },
    };
  }

  static catalogo(stats, nivel) {
    return {
      habilidades: [
        { nombre: 'ritual', velocidad: 20, condicional: true, ruta: `${ICONOS}/S_Shadow05.png` },
        // En gris hasta que la mecanica del pacto exista. Ver acciones/directo.js.
        { nombre: 'pacto', velocidad: 25, condicional: false, ruta: `${ICONOS}/S_Shadow09.png` },
        { nombre: 'atacar', rango: stats.rango, velocidad: 15 + (nivel - 1), condicional: true, ruta: `${ICONOS}/S_Sword01.png` },
        { nombre: 'maldicion', rango: 3, velocidad: 18, condicional: stats.anticristo > 0, ruta: `${ICONOS}/S_Shadow13.png` },
      ],
      objetos: [],
      movimiento: [
        { nombre: 'moverse', rango: 1, velocidad: 10, condicional: true, ruta: `${ICONOS}/A_Shoes01.png` },
      ],
    };
  }
}

export const POTESTADES_SECTARIO = [Sectario];
