/**
 * potestades/campesinos.js — Familia Campesinos.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE APORTA: estadisticas, lista de acciones como DATOS (nombres y numeros)
 * y el cuerpo de prueba: un circulo con latido. La funcion de cada accion
 * vive en acciones/ y todavia no se escribe.
 *
 * QUE YA NO APORTA: colocarse en el tablero. Eso es de PotestadesTablero.
 * Esta clase fabrica la textura y declara como se anima; no se pone sola.
 *
 * EL ARQUETIPO ES LA FAMILIA. characterSelectScene.js manda 'Campesino'.
 */

import { FRAME } from '../../iconosAtlas.js';
import { ponerEfecto, quitarEfecto } from '../efectosEstado.js';
import { COSTES_DE_ACCION, puedePagarCoste } from '../acciones/diana.js';
import { colocarMarcaTrampa } from '../acciones/dianaCasilla.js';

const LADO = 360;
const FOTOGRAMAS = 8;
const RADIO_BASE = 150;
const AMPLITUD = 27;
const GROSOR_ANILLO = 24;
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

export class Campesino {
  static arquetipo = 'Campesino';
  static color = 0xc47a2a;
  static spritesheet = { clave: 'circulo_campesino', archivo: null, ancho: LADO, alto: LADO };

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
      curas: 1,
      dano: 1,
      velocidad: 2,
      rango: 1,
      ...previas,
    };
    this.constantes = {
      hpMax: 5 + 2 * nivel,
      accionismo: 1,
      zombiosis: 1,
    };
    this.calcularAcciones();
    return this.estadisticas;
  }

  calcularAcciones() {
    const stats = this.estadisticas;
    const nivel = this.nivel;
    this.listaDeAcciones = {
      habilidades: [
        { nombre: 'curar', rango: Infinity, velocidad: 0, coste: COSTES_DE_ACCION.curar, condicional: puedePagarCoste(stats, COSTES_DE_ACCION.curar), frame: FRAME.curar, type: 'dianaAliado'},
        { nombre: 'escudar', rango: Infinity, velocidad: 100, coste: COSTES_DE_ACCION.escudar, condicional: puedePagarCoste(stats, COSTES_DE_ACCION.escudar), frame: FRAME.escudar, type: 'configtype1aliado'},
        { nombre: 'atacar', rango: 1, velocidad: 50, condicional: true, frame: FRAME.atacar, type: 'dianaEnemigo'},
      ],
      objetos: [],
      movimiento: [
        { nombre: 'movilidad rapida', rango: 2, velocidad: 100, condicional: true, frame: FRAME.moverseRápido, type: 'dianaCasilla'},
        { nombre: 'movilidad lenta', rango: 2, velocidad: 0, condicional: true, frame: FRAME.moverseNormal, type: 'dianaCasilla'},
        { nombre: 'poner trampa', rango: 2, velocidad: 100, condicional: true, frame: FRAME.trampa, type: 'dianaCasilla'},
        { nombre: 'descansar', rango: Infinity, velocidad: 50, condicional: true, frame: FRAME.descansar, type: 'directo'},
        
      ],
    };
    return this.listaDeAcciones;
  }

  // Circulo hueco: trazo y nombre del mismo color, sin relleno. El tablero
  // todavia no lo pinta; esta textura queda lista para cuando se coloque.

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
    // El sprite de Aliados se espeja en el tablero; dibujar al reves aqui
    // deja el nombre legible despues del flipX.
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
      trampaEstatica: (ctx) => this._animTrampaEstatica(ctx),
      curar: (ctx) => this._animCurar(ctx),
      serCurado: (ctx) => this._animSerCurado(ctx),
      escudar: (ctx) => this._animEscudar(ctx),
      atacar: (ctx) => this._animAtacar(ctx),
      descansar: (ctx) => this._animDescansar(ctx),
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

  _animTrampaEstatica(contexto) {
    const escena = contexto?.escena;
    const destino = contexto?.destino
      ?? (contexto?.objetivo?.x != null && !contexto.objetivo.estadisticas ? contexto.objetivo : null)
      ?? contexto?.tarea?.objetivo;
    const tablero = contexto?.tablero;
    const casilla = tablero?.[Number(destino?.y) - 1]?.[Number(destino?.x) - 1];
    // Si el resolve ya la consumio (pisada mismo tick), no recrear.
    if (!casilla?.trampa || !destino) return Promise.resolve();
    if (!casilla.trampa.marca) colocarMarcaTrampa(casilla, contexto, destino);
    const marca = casilla.trampa.marca;
    if (!marca || !escena?.tweens) return Promise.resolve();
    marca.setScale(0.2);
    return tweenPromise(escena, { targets: marca, scale: 1, duration: 220, ease: 'Back.easeOut' });
  }

  _animDescansar(contexto) {
    const escena = contexto?.escena;
    const origen = this.sprite ?? { x: 0, y: 0 };
    if (!escena?.add) return Promise.resolve();
    const emisor = escena.add.particles(origen.x, origen.y, PARTICULA, {
      speed: { min: 10, max: 36 },
      lifespan: 640,
      angle: { min: 250, max: 290 },
      gravityY: -40,
      tint: 0x9aa0a6,
      scale: { start: 0.4, end: 0 },
      emitting: false,
    });
    emisor.setDepth(12);
    emisor.explode(22);
    escena.time.delayedCall(700, () => emisor.destroy());
    return tweenPromise(escena, { targets: this.sprite, alpha: 0.75, yoyo: true, duration: 220 });
  }

  _animCurar(contexto) {
    const escena = contexto?.escena;
    const origen = this.sprite ?? { x: 0, y: 0 };
    explotar(escena, origen.x, origen.y, 0x7ac74f, 18, 500);
    return tweenPromise(escena, { targets: this.sprite, scale: 1.12, yoyo: true, duration: 180 });
  }

  _animSerCurado(contexto) {
    const escena = contexto?.escena;
    const punto = puntoDe(contexto, this);
    explotar(escena, punto.x, punto.y, 0x9be36b, 22, 520);
    const blanco = contexto?.objetivo?.sprite ?? this.sprite;
    return tweenPromise(escena, { targets: blanco, alpha: 0.7, yoyo: true, duration: 160 });
  }

  _animEscudar(contexto) {
    const escena = contexto?.escena;
    const origen = this.sprite ?? { x: 0, y: 0 };
    if (!escena?.add) return Promise.resolve();
    const anillo = escena.add.particles(origen.x, origen.y, PARTICULA, {
      speed: { min: 10, max: 40 },
      lifespan: 450,
      angle: { min: 0, max: 360 },
      tint: 0xf5d68a,
      scale: { start: 0.4, end: 0 },
      emitting: false,
    });
    anillo.setDepth(12);
    anillo.explode(28);
    escena.time.delayedCall(500, () => anillo.destroy());
    return tweenPromise(escena, { targets: this.sprite, scale: 1.08, yoyo: true, duration: 160 });
  }

  _animAtacar(contexto) {
    const escena = contexto?.escena;
    const origen = this.sprite ?? { x: 0, y: 0 };
    const destino = puntoDe(contexto, this);
    explotar(escena, origen.x, origen.y, this.constructor.color, 12, 280);
    explotar(escena, destino.x, destino.y, 0xfff1a8, 14, 320);
    return tweenPromise(escena, { targets: this.sprite, x: origen.x + (destino.x - origen.x) * 0.15, y: origen.y + (destino.y - origen.y) * 0.15, yoyo: true, duration: 120 });
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

export const POTESTADES_CAMPESINO = [Campesino];
