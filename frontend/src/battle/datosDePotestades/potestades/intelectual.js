/**
 * potestades/intelectual.js — Familia Intelectuales.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Estadisticas, lista de acciones como datos, y el circulo de prueba dentro
 * de esta clase. `disparar` solo aparece disponible con un objetivo apuntado.
 */

import { FRAME } from '../iconosAtlas.js';
import { ponerEfecto, quitarEfecto } from '../efectosEstado.js';
import { COSTES_DE_ACCION, puedePagarCoste } from '../acciones/diana.js';

const LADO = 360;
const FOTOGRAMAS = 8;
const RADIO_BASE = 150;
const AMPLITUD = 7;
const GROSOR_ANILLO = 12;
const ANILLO_POR_BANDO = { Aliados: 0x7ed4ff, Enemigos: 0xff6b6b };
const ANILLO_POR_DEFECTO = 0xf5d68a;

function aCss(entero) {
  return `#${(Number(entero) >>> 0).toString(16).padStart(6, '0')}`;
}

const PARTICULA = 'particula_punto';

function asegurarParticula(escena) {
  if (!escena?.textures || escena.textures.exists(PARTICULA)) return PARTICULA;
  const textura = escena.textures.createCanvas(PARTICULA, 8, 8);
  const ctx = textura.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(4, 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  textura.refresh();
  return PARTICULA;
}

function puntoDe(contexto, potestad) {
  const t = contexto?.tamanoCasilla ?? 400;
  const d = contexto?.destino
    ?? (contexto?.objetivo?.x != null && !contexto.objetivo.sprite ? contexto.objetivo : null)
    ?? contexto?.tarea?.objetivo;
  if (d?.x != null && d?.y != null && !d.sprite && !d.estadisticas) {
    return {
      x: (Number(d.x) - 1) * t + t / 2,
      y: (Number(d.y) - 1) * t + t / 2 - 40,
    };
  }
  if (contexto?.objetivo?.sprite) {
    return { x: contexto.objetivo.sprite.x, y: contexto.objetivo.sprite.y };
  }
  if (potestad?.sprite) return { x: potestad.sprite.x, y: potestad.sprite.y };
  return { x: 0, y: 0 };
}

function explotar(escena, x, y, tint, cantidad = 16, lifespan = 400) {
  if (!escena?.add) return;
  const emisor = escena.add.particles(x, y, PARTICULA, {
    speed: { min: 40, max: 140 },
    lifespan,
    scale: { start: 0.45, end: 0 },
    tint,
    emitting: false,
  });
  emisor.setDepth(12);
  emisor.explode(cantidad);
  escena.time.delayedCall(lifespan + 50, () => emisor.destroy());
}

function tweenPromise(escena, config) {
  return new Promise((resolve) => {
    if (!escena?.tweens) return resolve();
    escena.tweens.add({ ...config, onComplete: resolve });
  });
}

export class Intelectual {
  static arquetipo = 'Intelectual';
  static color = 0xffffff;
  static spritesheet = { clave: 'circulo_intelectual', archivo: null, ancho: LADO, alto: LADO };

  constructor(datos, bando = 'Aliados') {
    this.datos = datos ?? {};
    this.id = this.datos.id;
    this.bando = bando;
    this.sprite = null;
    this.estadisticas = null;
    this.constantes = null;
    this.listaDeAcciones = null;
    this.animaciones = null;
    this.calcularEstadisticas();
  }

  get arquetipo() {
    return this.constructor.arquetipo;
  }

  get nivel() {
    return Number(this.datos?.nivel ?? 1);
  }

  get inventario() {
    return this.datos?.invetario ?? [];
  }

  calcularEstadisticas() {
    const previas = this.estadisticas ?? {};
    const nivel = this.nivel;
    this.estadisticas = {
      hp: 3,
      escudos: 2,
      conocimiento: 1,
      velocidad: 1,
      dano: 1,
      rango: 1,
      apuntando: null,
      ...previas,
    };
    this.constantes = {
      hpMax: 5 + 2 * nivel,
      accionismo: 1,
      zombiosis: 1
    };
    this.calcularAcciones();
    return this.estadisticas;
  }

  calcularAcciones() {
    const stats = this.estadisticas;
    const nivel = this.nivel;
    this.listaDeAcciones = {
      habilidades: [
        { nombre: 'escudar', rango: Infinity, velocidad: 100, coste: COSTES_DE_ACCION.escudar, condicional: puedePagarCoste(stats, COSTES_DE_ACCION.escudar), frame: FRAME.escudar, type: 'configtype1aliado'},
        { nombre: 'estudiar', velocidad: 50, condicional: true, frame: FRAME.estudiar, type: 'directo'},
        { nombre: 'apuntar', velocidad: 150, coste: COSTES_DE_ACCION.apuntar, condicional: puedePagarCoste(stats, COSTES_DE_ACCION.apuntar), frame: FRAME.apuntar, type: 'dianaEnemigo'},
        { nombre: 'disparar', rango: Infinity, velocidad: 50, coste: COSTES_DE_ACCION.disparar, condicional: puedePagarCoste(stats, COSTES_DE_ACCION.disparar), frame: FRAME.disparar, type: 'dianaEnemigo'},
      ],
      objetos: [],
      movimiento: [
        { nombre: 'movilidad rapida', rango: 1, velocidad: 100, condicional: true, frame: FRAME.moverseRápido, type: 'dianaCasilla'},
        { nombre: 'movilidad lenta', rango: 1, velocidad: 0, condicional: true, frame: FRAME.moverseNormal, type: 'dianaCasilla'},
      ],
    };
    return this.listaDeAcciones;
  }

  _claveDeTextura() {
    return `circulo_${this.constructor.arquetipo.toLowerCase()}_${String(this.bando).toLowerCase()}`;
  }

  _claveDeTexturaMuerto() {
    return `${this._claveDeTextura()}_muerto`;
  }

  _texturaMuerto(escena) {
    if (!escena?.textures) return null;
    const clave = this._claveDeTexturaMuerto();
    if (escena.textures.exists(clave)) return clave;
    const textura = escena.textures.createCanvas(clave, LADO, LADO);
    if (!textura) return null;
    const ctx = textura.getContext();
    if (this.bando === 'Aliados') {
      ctx.translate(LADO, 0);
      ctx.scale(-1, 1);
    }
    const cx = LADO / 2;
    const cy = LADO / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, RADIO_BASE, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.constructor.arquetipo, cx, cy);
    textura.refresh();
    return clave;
  }

  aplicarCuerpoMuerto(escena) {
    this.muerta = true;
    ponerEfecto(this, 'muerto');
    const clave = this._texturaMuerto(escena);
    if (clave && this.sprite?.setTexture) this.sprite.setTexture(clave);
    this.sprite?.clearTint?.();
    this.sprite?.setVisible?.(true);
    this.sprite?.setAlpha?.(1);
    this.sprite?.setScale?.(1);
  }

  aplicarCuerpoVivo(escena) {
    this.muerta = false;
    this._muerteAnimada = false;
    quitarEfecto(this, 'muerto');
    const clave = this._claveDeTextura();
    if (escena?.textures?.exists(clave) && this.sprite?.setTexture) this.sprite.setTexture(clave);
    this.sprite?.clearTint?.();
    this.sprite?.setVisible?.(true);
    this.sprite?.setAlpha?.(1);
  }

  AnimacionEstatica(escena) {
    if (!escena?.textures) return null;
    const clave = this._claveDeTextura();
    if (escena.textures.exists(clave)) return clave;

    const textura = escena.textures.createCanvas(clave, LADO, LADO);
    if (!textura) return null;
    const ctx = textura.getContext();
    if (this.bando === 'Aliados') {
      ctx.translate(LADO, 0);
      ctx.scale(-1, 1);
    }
    const trazo = aCss(this.constructor.color);
    const cx = LADO / 2;
    const cy = LADO / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, RADIO_BASE, 0, Math.PI * 2);
    ctx.fillStyle = '#141414';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = trazo;
    ctx.stroke();
    ctx.fillStyle = trazo;
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.constructor.arquetipo, cx, cy);
    textura.refresh();
    return clave;
  }

  construirAnimaciones() {
    return [];
  }

  obtenerConfigAnimacionEstatica() {
    return {
      plantillaSprite: { textureKey: this._claveDeTextura(), frame: 0, escala: 1 },
      animKey: null,
    };
  }

  prepararAnimaciones(escena) {
    asegurarParticula(escena);
    this.animaciones = {
      movimiento: (ctx) => this._animMovimiento(ctx),
      apuntar: (ctx) => this._animApuntar(ctx),
      estudiar: (ctx) => this._animEstudiar(ctx),
      serCurado: (ctx) => this._animSerCurado(ctx),
      disparar: (ctx) => this._animDisparar(ctx),
      recibirDano: (ctx) => this._animRecibirDano(ctx),
      morir: (ctx) => this._animMorir(ctx),
    };
    return this.animaciones;
  }

  _animMovimiento(contexto) {
    const escena = contexto?.escena;
    const destino = puntoDe(contexto, this);
    if (!this.sprite || !escena) return Promise.resolve();
    return tweenPromise(escena, { targets: this.sprite, x: destino.x, y: destino.y, duration: 280, ease: 'Sine.easeInOut' });
  }

  _animApuntar(contexto) {
    const escena = contexto?.escena;
    const punto = puntoDe(contexto, this);
    if (!escena?.add) return Promise.resolve();
    const marca = escena.add.particles(punto.x, punto.y, PARTICULA, {
      speed: { min: 4, max: 18 },
      lifespan: 700,
      angle: { min: 0, max: 360 },
      tint: 0xd8a13a,
      scale: { start: 0.5, end: 0 },
      emitting: false,
    });
    marca.setDepth(12);
    marca.explode(18);
    escena.time.delayedCall(750, () => marca.destroy());
    return tweenPromise(escena, { targets: this.sprite, scale: 1.06, yoyo: true, duration: 140 });
  }

  _animEstudiar(contexto) {
    const escena = contexto?.escena;
    const origen = this.sprite ?? { x: 0, y: 0 };
    explotar(escena, origen.x, origen.y - 20, 0xf5d68a, 16, 500);
    return tweenPromise(escena, { targets: this.sprite, y: (this.sprite?.y ?? 0) - 10, yoyo: true, duration: 200 });
  }

  _animSerCurado(contexto) {
    const escena = contexto?.escena;
    const punto = puntoDe(contexto, this);
    explotar(escena, punto.x, punto.y, 0x9be36b, 22, 520);
    const blanco = contexto?.objetivo?.sprite ?? this.sprite;
    return tweenPromise(escena, { targets: blanco, alpha: 0.7, yoyo: true, duration: 160 });
  }

  _animDisparar(contexto) {
    const escena = contexto?.escena;
    if (!this.sprite || !escena?.add) return Promise.resolve();
    const origen = { x: this.sprite.x, y: this.sprite.y };
    const destino = puntoDe(contexto, this);
    const proyectil = escena.add.particles(origen.x, origen.y, PARTICULA, {
      speed: 0,
      lifespan: 160,
      frequency: 20,
      tint: 0xd8a13a,
      scale: { start: 0.5, end: 0.15 },
    });
    proyectil.setDepth(13);
    return tweenPromise(escena, { targets: proyectil, x: destino.x, y: destino.y, duration: 300, ease: 'Quad.easeIn' })
      .then(() => {
        explotar(escena, destino.x, destino.y, 0xfff1a8, 18, 360);
        proyectil.destroy();
      });
  }

  _animRecibirDano(contexto) {
    const escena = contexto?.escena;
    if (!this.sprite) return Promise.resolve();
    explotar(escena, this.sprite.x, this.sprite.y, 0xff4d4d, 14, 300);
    this.sprite.setTint(0xff4d4d);
    return tweenPromise(escena, { targets: this.sprite, x: this.sprite.x + 12, yoyo: true, duration: 70, repeat: 2 })
      .then(() => { this.sprite?.clearTint(); });
  }

  _animMorir(contexto) {
    const escena = contexto?.escena;
    if (!this.sprite) return Promise.resolve();
    explotar(escena, this.sprite.x, this.sprite.y, this.constructor.color, 28, 600);
    this.aplicarCuerpoMuerto(escena);
    return tweenPromise(escena, { targets: this.sprite, scale: 1.08, yoyo: true, duration: 220 });
  }
}

export const POTESTADES_INTELECTUAL = [Intelectual];
