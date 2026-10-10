/**
 * potestades/mago.js — Familia Magos.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Estadisticas, lista de acciones como datos, y el circulo de prueba dentro
 * de esta clase. `magia` empieza en 0: `rayoDeMagia` no esta disponible al
 * primer turno. Las funciones de efecto todavia no se escriben.
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

function bordeLejano(sprite, tablero, tamano) {
  const filas = tablero?.length ?? 5;
  const columnas = tablero?.[0]?.length ?? 5;
  const w = columnas * tamano;
  const h = filas * tamano;
  const bordes = [
    { x: sprite.x, y: 0 },
    { x: sprite.x, y: h },
    { x: 0, y: sprite.y },
    { x: w, y: sprite.y },
  ];
  return bordes.reduce((mejor, borde) => {
    const dMejor = Math.hypot(sprite.x - mejor.x, sprite.y - mejor.y);
    const dBorde = Math.hypot(sprite.x - borde.x, sprite.y - borde.y);
    return dBorde > dMejor ? borde : mejor;
  });
}

export class Mago {
  static arquetipo = 'Mago';
  static color = 0x713d9b;
  static spritesheet = { clave: 'circulo_mago', archivo: null, ancho: LADO, alto: LADO };

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
      curas: 2,
      magia: 1,
      velocidad: 1,
      dano: 1,
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
    this.listaDeAcciones = {
      habilidades: [
        { nombre: 'curar', rango: Infinity, velocidad: 0, coste: COSTES_DE_ACCION.curar, condicional: puedePagarCoste(stats, COSTES_DE_ACCION.curar), frame: FRAME.curar, type: 'dianaAliado'},
        { nombre: 'generar magia', velocidad: 50, condicional: true, frame: FRAME.generarMagia, type: 'directo'},
        { nombre: 'rayo de magia', velocidad: 0, coste: COSTES_DE_ACCION['rayo de magia'], condicional: puedePagarCoste(stats, COSTES_DE_ACCION['rayo de magia']), frame: FRAME.rayoDeMagia, type: 'dianaCasilla', permiteCasillaOcupada: true},
        { nombre: 'zombiosis', rango: Infinity, velocidad: 100, coste: COSTES_DE_ACCION.zombiosis, condicional: puedePagarCoste(stats, COSTES_DE_ACCION.zombiosis), frame: FRAME.zombiosis, type: 'dianaAliado'},
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
      rayo: (ctx) => this._animRayo(ctx),
      generarMagia: (ctx) => this._animGenerarMagia(ctx),
      serCurado: (ctx) => this._animSerCurado(ctx),
      revivir: (ctx) => this._animRevivir(ctx),
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

  _animRayo(contexto) {
    const escena = contexto?.escena;
    if (!this.sprite || !escena?.add) return Promise.resolve();
    const t = contexto?.tamanoCasilla ?? 400;
    const celdas = contexto?.tarea?.rayoCeldas ?? [];
    const ultima = celdas[celdas.length - 1];
    const origen = { x: this.sprite.x, y: this.sprite.y };
    const destino = ultima
      ? { x: (Number(ultima.x) - 1) * t + t / 2, y: (Number(ultima.y) - 1) * t + t / 2 }
      : contexto?.destino
        ? puntoDe(contexto, this)
        : bordeLejano(this.sprite, contexto?.tablero, t);
    escena.cameras?.main?.shake?.(320, 0.014);
    const haz = escena.add.graphics();
    haz.setDepth(13);
    haz.lineStyle(Math.max(14, t * 0.045), 0xff1a1a, 1);
    haz.lineBetween(origen.x, origen.y, destino.x, destino.y);
    haz.lineStyle(Math.max(6, t * 0.018), 0xfff1a8, 0.95);
    haz.lineBetween(origen.x, origen.y, destino.x, destino.y);
    explotar(escena, origen.x, origen.y, 0xff4d4d, 16, 280);
    explotar(escena, destino.x, destino.y, 0xfff1a8, 22, 360);
    (celdas ?? []).forEach((celda) => {
      explotar(
        escena,
        (Number(celda.x) - 1) * t + t / 2,
        (Number(celda.y) - 1) * t + t / 2,
        0xff1a1a,
        8,
        220,
      );
    });
    return tweenPromise(escena, { targets: haz, alpha: 0, duration: 420, ease: 'Cubic.easeOut' })
      .then(() => { haz.destroy(); });
  }

  _animGenerarMagia(contexto) {
    const escena = contexto?.escena;
    const origen = this.sprite ?? { x: 0, y: 0 };
    if (!escena?.add) return Promise.resolve();
    const orbita = escena.add.particles(origen.x, origen.y, PARTICULA, {
      speed: { min: 20, max: 60 },
      lifespan: 600,
      angle: { min: 0, max: 360 },
      tint: 0x9b5fd0,
      scale: { start: 0.2, end: 0.5 },
      emitting: false,
    });
    orbita.setDepth(12);
    orbita.explode(24);
    escena.time.delayedCall(650, () => orbita.destroy());
    return tweenPromise(escena, { targets: this.sprite, scale: 1.18, yoyo: true, duration: 220 });
  }

  _animSerCurado(contexto) {
    const escena = contexto?.escena;
    const punto = puntoDe(contexto, this);
    explotar(escena, punto.x, punto.y, 0x9be36b, 22, 520);
    const blanco = contexto?.objetivo?.sprite ?? this.sprite;
    return tweenPromise(escena, { targets: blanco, alpha: 0.7, yoyo: true, duration: 160 });
  }

  _animRevivir(contexto) {
    const escena = contexto?.escena;
    const punto = puntoDe(contexto, this);
    explotar(escena, punto.x, punto.y, 0xe8d4ff, 26, 700);
    const blanco = contexto?.objetivo ?? this;
    blanco.aplicarCuerpoVivo?.(escena);
    const sprite = blanco?.sprite ?? this.sprite;
    if (sprite) {
      sprite.setVisible(true);
      sprite.setAlpha(0);
    }
    return tweenPromise(escena, { targets: sprite, alpha: 1, scale: 1.15, yoyo: true, duration: 280 });
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

export const POTESTADES_MAGO = [Mago];
