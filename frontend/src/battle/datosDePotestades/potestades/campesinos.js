/**
 * potestades/campesino.js — Familia Campesinos.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE SERA: una clase por potestad de esta familia, todas en este archivo.
 * Cada clase aporta tres cosas y solo tres: sus estadisticas, su lista de
 * acciones y sus animaciones.
 *
 * QUE YA NO APORTA: colocarse en el tablero. En el codigo viejo eso venia
 * heredado de BaseGeneral, y arrastraba Phaser hasta la raiz de la jerarquia
 * de personajes. Ahora es de PotestadesTablero.
 *
 * LAS ACCIONES VIAJAN POR NOMBRE (regla 6 del contrato). Aqui se declara que
 * acciones tiene la potestad y con que numeros; la funcion vive en acciones/ y
 * la resuelve IndexDePotestades. Esto es lo que hace serializable la
 * configuracion del turno: un nombre cabe en un JSON, una closure no.
 *
 * Rescatado de: familias/campesinos/lumel.js y familias/campesinos/brunn.js
 * (ambos borrados), y de familias/bases/baseCampesinos.js, que era una clase
 * vacia cuyo unico metodo devolvia true y por eso no se conserva.
 *
 * ESTADO: esqueleto con rescate. Revisar contra el spect 006.
 */

const ICONOS = 'assets/images/battle/Iconos/accion';

/**
 * Comun a la familia. Lumel y Brunn tenian exactamente la misma tabla de
 * estadisticas y la misma lista de acciones en el codigo viejo; lo unico que
 * los distinguia era el spritesheet. Se factoriza aqui en vez de duplicarlo,
 * pero cada potestad puede sobreescribir lo que quiera.
 */
class Campesino {
  constructor(datos) {
    this.datos = datos;
    this.id = datos.id;
    this.sprite = null;
    this.estadisticas = null;
    this.listaDeAcciones = null;
  }

  // ─── RESCATE: lumel.js lineas 34-47 / brunn.js lineas 28-41. ──────────────
  calcularEstadisticas() {
    const n = this.datos.nivel;
    const previas = this.estadisticas ?? {};
    const hpMax = 100 + 50 * n;
    this.estadisticas = {
      hp: previas.hp ?? hpMax,
      hpMax,
      ataque: previas.ataque ?? (10 + 5 * n),
      velocidad: 1,
      escudos: previas.escudos ?? 3,
      curas: previas.curas ?? (1 + 2 * n),
      ulti: previas.ulti ?? true,
      accionismo: previas.accionismo ?? 1,
    };
    return this.estadisticas;
  }

  // ─── RESCATE: lumel.js lineas 49-143 / brunn.js lineas 43-136. ────────────
  // Mismo contenido, pero sin la funcion `ejecución` dentro: ahora solo el
  // nombre. El campo `condicional` se evalua al construir la lista, asi que
  // hay que recalcularla cuando cambian las estadisticas.
  calcularAcciones() {
    const n = this.datos.nivel;
    const stats = this.estadisticas ?? this.calcularEstadisticas();

    this.listaDeAcciones = {
      habilidades: [
        { nombre: 'curar', rango: 3, velocidad: 15 + n * 2, condicional: stats.curas > 0, ruta: `${ICONOS}/S_Holy03.png` },
        { nombre: 'escudar', rango: 2, velocidad: 10 + 3 * (n - 1), condicional: stats.escudos > 0, ruta: `${ICONOS}/E_Wood03.png` },
        { nombre: 'atacar', rango: 2, velocidad: 15 + (n - 1), condicional: true, ruta: `${ICONOS}/S_Sword01.png` },
        { nombre: 'descansar', velocidad: 20 + 2 * (n - 1), condicional: true, ruta: `${ICONOS}/S_Dagger06.png` },
        { nombre: 'dopar', velocidad: 25 + 2 * n, condicional: stats.ulti, ruta: `${ICONOS}/S_Buff01.png` },
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

// ─── RESCATE: lumel.js lineas 5-32. ──────────────────────────────────────────
export class Lumel extends Campesino {
  static arquetipo = 'lumel';
  static spritesheet = { clave: 'lumelStatic', archivo: 'assets/images/battle/personajes/lumelStatic.png', ancho: 64, alto: 64 };

  construirAnimaciones() {
    return [{ key: 'lumel_static', startFrame: 0, endFrame: 5, frameRate: 10, repeat: -1 }];
  }

  obtenerConfigAnimacionEstatica() {
    return {
      plantillaSprite: { textureKey: 'lumelStatic', frame: 0, escala: 9 },
      animKey: 'lumel_static',
    };
  }
}

// ─── RESCATE: brunn.js lineas 5-26. ──────────────────────────────────────────
export class Brunn extends Campesino {
  static arquetipo = 'brunn';
  static spritesheet = { clave: 'brunnStatic', archivo: 'assets/images/battle/personajes/brunnStatic.png', ancho: 64, alto: 64 };

  construirAnimaciones() {
    return [{ key: 'brunn_static', startFrame: 0, endFrame: 7, frameRate: 10, repeat: -1 }];
  }

  obtenerConfigAnimacionEstatica() {
    return {
      plantillaSprite: { textureKey: 'brunnStatic', frame: 0, escala: 9 },
      animKey: 'brunn_static',
    };
  }
}

export const POTESTADES_CAMPESINO = [Lumel, Brunn];
