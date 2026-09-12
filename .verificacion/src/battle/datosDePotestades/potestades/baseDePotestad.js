/**
 * potestades/baseDePotestad.js — Lo que toda potestad tiene en comun.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE ES: la fontaneria que las cinco familias repiten. Cada familia solo
 * declara tres cosas —su arquetipo, su tabla de estadisticas y su catalogo de
 * acciones— y hereda de aqui como se recalculan y como se anima.
 *
 * POR QUE EXISTE ESTE ARCHIVO Y NO ESTA COPIADO CINCO VECES: el criterio de
 * cierre del spect pide que anadir una potestad cueste un solo archivo. Si el
 * ciclo de recalculo estuviera duplicado en cada familia, cambiar el contrato
 * costaria cinco ediciones y la quinta se olvidaria.
 *
 * "Plantilla" en el sentido de patron plantilla (template method): la clase
 * base fija el orden de los pasos y deja los huecos concretos —`tabla` y
 * `catalogo`— a la subclase.
 *
 * EL ARQUETIPO ES LA FAMILIA. `characterSelectScene.js` linea 301 ofrece
 * 'Campesino', 'Mago', 'Realista', 'Intelectual' y 'Sectario', y los manda tal
 * cual como `arquetipo` dentro del equipo. El registro se indexa por esa
 * palabra.
 */

import { asegurarCirculo, configEstaticaDeCirculo, definicionDeLatido } from './circuloDePrueba.js';

export const ICONOS = 'assets/images/battle/Iconos/accion';

export class Potestad {
  /** Clave con la que el registro la busca. La declara cada familia. */
  static arquetipo = null;

  /** Color del circulo de prueba mientras no haya spritesheet dibujado. */
  static color = 0x888888;

  constructor(datos, bando = 'Aliados') {
    this.datos = datos ?? {};
    this.id = this.datos.id;
    this.bando = bando;
    this.sprite = null;
    this.estadisticas = null;
    this.constantes = null;
    this.listaDeAcciones = null;
    this.calcularEstadisticas();
  }

  get arquetipo() {
    return this.constructor.arquetipo;
  }

  get nivel() {
    return Number(this.datos?.nivel ?? 1);
  }

  /** Inventario. La clave va escrita `invetario` en los moldes: se conserva. */
  get inventario() {
    return this.datos?.invetario ?? [];
  }

  // ─── Huecos que rellena cada familia ───────────────────────────────────────

  static tabla() {
    throw new Error('[Potestad] Cada familia declara su tabla de estadisticas.');
  }

  static catalogo() {
    throw new Error('[Potestad] Cada familia declara su catalogo de acciones.');
  }

  // ─── Ciclo de recalculo ────────────────────────────────────────────────────

  /**
   * Aplica la tabla de la familia y, con ella, recalcula las acciones.
   *
   * Las estadisticas ya presentes ganan a la tabla: hp, escudos, curas o magia
   * son estado de la partida y una llamada posterior no puede devolverlos a su
   * valor inicial. La tabla solo manda la primera vez y al aparecer una clave
   * nueva. Lo que si se recalcula siempre es `condicional`, que es un valor
   * derivado y no un dato (invariante del spect).
   */
  calcularEstadisticas() {
    const previas = this.estadisticas ?? {};
    const { estadisticas, constantes } = this.constructor.tabla(this.nivel);
    this.estadisticas = { ...estadisticas, ...previas };
    this.constantes = constantes;
    this.calcularAcciones();
    return this.estadisticas;
  }

  calcularAcciones() {
    this.listaDeAcciones = this.constructor.catalogo(this.estadisticas, this.nivel);
    return this.listaDeAcciones;
  }

  estaViva() {
    return Number(this.estadisticas?.hp) > 0;
  }

  // ─── Cuerpo en pantalla ────────────────────────────────────────────────────

  /**
   * Fabrica la textura del circulo y registra su latido. Se llama una vez por
   * potestad al crear el registro; es idempotente, asi que tres potestades de
   * la misma familia y bando comparten una sola textura.
   */
  prepararEnEscena(escena) {
    return asegurarCirculo(escena, {
      arquetipo: this.constructor.arquetipo,
      bando: this.bando,
      color: this.constructor.color,
    });
  }

  construirAnimaciones() {
    return [definicionDeLatido(this.constructor.arquetipo, this.bando)];
  }

  obtenerConfigAnimacionEstatica() {
    return configEstaticaDeCirculo(this.constructor.arquetipo, this.bando);
  }
}
