/**
 * potestades/realista.js — Familia Realistas.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE SERA: una clase por potestad de esta familia, todas en este archivo.
 * Estadisticas, lista de acciones y animaciones. Nada mas.
 *
 * Rescatado de: familias/realistas/soldado1.js (borrado) y de
 * familias/bases/baseRealistas.js, que era una clase vacia y no se conserva.
 *
 * ESTADO: esqueleto con rescate. Revisar contra el spect 006.
 */

const ICONOS = 'assets/images/battle/Iconos/accion';

class Realista {
  constructor(datos) {
    this.datos = datos;
    this.id = datos.id;
    this.sprite = null;
    this.estadisticas = null;
    this.listaDeAcciones = null;
  }

  // ─── RESCATE: soldado1.js lineas 28-40. ───────────────────────────────────
  calcularEstadisticas() {
    const n = this.datos.nivel;
    const previas = this.estadisticas ?? {};
    const hpMax = 200 * n;
    this.estadisticas = {
      hp: previas.hp ?? hpMax,
      hpMax,
      ataque: previas.ataque ?? (15 * n),
      velocidad: 10,
      escudos: previas.escudos ?? (5 * n),
      curas: 0,
      balas: previas.balas ?? 0,
    };
    return this.estadisticas;
  }

  // ─── RESCATE: soldado1.js lineas 41-131. ──────────────────────────────────
  // Nota heredada del codigo viejo que hay que arreglar en el spect 006: la
  // accion `dopar` tenia `condicional: aliadoEspecifico.estadisticas.ulti`,
  // pero esta familia nunca define `ulti`, asi que la condicion era siempre
  // undefined. Y `curar` exige `curas > 0` con `curas` fijado a 0: nunca se
  // podia usar. Se rescatan tal cual para no perder los numeros, marcadas.
  calcularAcciones() {
    const n = this.datos.nivel;
    const stats = this.estadisticas ?? this.calcularEstadisticas();

    this.listaDeAcciones = {
      habilidades: [
        // BUG HEREDADO: curas siempre vale 0 en esta familia.
        { nombre: 'curar', rango: 3, velocidad: 15 + n * 2, condicional: stats.curas > 0, ruta: `${ICONOS}/S_Holy03.png` },
        { nombre: 'escudar', rango: 2, velocidad: 10 + 3 * (n - 1), condicional: stats.escudos > 0, ruta: `${ICONOS}/E_Wood03.png` },
        { nombre: 'atacar', rango: 2, velocidad: 15 + (n - 1), condicional: true, ruta: `${ICONOS}/S_Sword01.png` },
        { nombre: 'descansar', velocidad: 20 + 2 * (n - 1), condicional: true, ruta: `${ICONOS}/S_Dagger06.png` },
        // BUG HEREDADO: esta familia no define `ulti`, la condicion era undefined.
        { nombre: 'dopar', velocidad: 25 + 2 * n, condicional: Boolean(stats.ulti), ruta: `${ICONOS}/S_Buff01.png` },
      ],
      objetos: [
        { nombre: 'tomarBebida', velocidad: 10, condicional: true, ruta: `${ICONOS}/I_Water.png` },
        { nombre: 'ponerTrampa', velocidad: 10, condicional: n > 3, ruta: `${ICONOS}/S_Earth03.png` },
      ],
      movimiento: [
        { nombre: 'moverse', rango: 1, velocidad: 10, condicional: true, ruta: `${ICONOS}/A_Shoes01.png` },
        { nombre: 'retirada', rango: 2, velocidad: 10, condicional: true, ruta: `${ICONOS}/S_Buff11.png` },
      ],
    };
    return this.listaDeAcciones;
  }
}

// ─── RESCATE: soldado1.js lineas 5-26. ───────────────────────────────────────
export class Soldado1 extends Realista {
  static arquetipo = 'soldado1';
  static spritesheet = { clave: 'soldado1Static', archivo: 'assets/images/battle/personajes/c1Static.png', ancho: 64, alto: 64 };

  construirAnimaciones() {
    return [{ key: 'soldado1_static', startFrame: 0, endFrame: 5, frameRate: 10, repeat: -1 }];
  }

  obtenerConfigAnimacionEstatica() {
    return {
      plantillaSprite: { textureKey: 'soldado1Static', frame: 0, escala: 9 },
      animKey: 'soldado1_static',
    };
  }
}

export const POTESTADES_REALISTA = [Soldado1];
