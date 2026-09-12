/**
 * generarInterfaz.js — Escena del HUD.
 *
 * SPECT: docs/spects/spect002.md
 *
 * QUE SERA: la segunda y ultima escena de la batalla. Fija a camara, por
 * encima del mundo, sin zoom ni pan. Dibuja los botones de control:
 * confirmar, rendirse, pausa, historial e ignorar interfaz.
 *
 * Eventos que emite hacia el emisor de PhaserMaster:
 *   'confirmar' | 'rendirse' | 'pausa' | 'historial' | 'ignorarInterfaz'
 *
 * Fase 1: UI wireframe + atajos; PhaserMaster solo registra logs.
 */

import {
  abrirPanelEntidad,
  precargarAssetsPanelEntidad,
} from './panelEntidad/index.js';
import { precargarTodosLosTextos, registrarTodosLosFramesTexto } from './panelEntidad/GenerarTexto/index.js';

export const CLAVE_ESCENA_HUD = 'interfazBatalla';

const DEPTH_HUD = 9000;
const COLOR_BORDE = 0xc0392b;
const COLOR_RELLENO = 0x922b21;
const COLOR_BARRA = 0x1a1a1a;
const COLOR_RAYADO = 0xc0392b;

export default class GenerarInterfaz extends Phaser.Scene {
  constructor() {
    super({ key: CLAVE_ESCENA_HUD });
    this.eventos = null;
    this.botones = null;
    this.contenedorHud = null;
    this._limpiarAtajos = null;
    this._avisoEmisorFaltante = false;
  }

  init(datos) {
    this.eventos = datos?.eventos ?? this.sys?.settings?.data?.eventos ?? null;
  }

  preload() {
    precargarAssetsPanelEntidad(this);
    precargarTodosLosTextos(this);
  }

  create() {
    if (!this.eventos) this.eventos = this.sys?.settings?.data?.eventos ?? null;
    if (!this.eventos && !this._avisoEmisorFaltante) {
      this._avisoEmisorFaltante = true;
      console.warn('[generarInterfaz] Falta el emisor de PhaserMaster en init().');
    }

    const { width, height } = this.scale;
    const altoBarra = Math.round(height * 0.22);
    const yBarra = height - altoBarra;

    this.contenedorHud = this.add.container(0, 0);
    this.contenedorHud.setScrollFactor(0);
    this.contenedorHud.setDepth(DEPTH_HUD);

    this._dibujarBarraInferior(0, yBarra, width, altoBarra);

    const margenEsquina = 8;
    const separacionCentro = 16;
    const centroY = yBarra + altoBarra * 0.43;
    const diamGrande = Math.round(Math.min(altoBarra * 0.88, width * 0.18, 320));
    const radioGrande = diamGrande / 2;

    const xRendirse = margenEsquina + radioGrande;
    const xConfirmar = width - margenEsquina - radioGrande;

    const bordeIzqCentro = xRendirse + radioGrande + separacionCentro;
    const bordeDerCentro = xConfirmar - radioGrande - separacionCentro;
    const anchoCentro = bordeDerCentro - bordeIzqCentro;
    const pasoCentro = anchoCentro / 3;
    const xHistorial = bordeIzqCentro + pasoCentro * 0.5;
    const xPausa = bordeIzqCentro + pasoCentro * 1.5;
    const xOcultar = bordeIzqCentro + pasoCentro * 2.5;

    const altoRect = Math.round(altoBarra * 0.42);
    const anchoRect = Math.round(Math.min(pasoCentro * 0.72, 240));
    const diamOcultar = Math.round(Math.min(altoBarra * 0.38, pasoCentro * 0.55));

    this.botones = {
      rendirse: this._crearBotonRendirse(xRendirse, centroY, diamGrande),
      historial: this._crearBotonHistorial(xHistorial, centroY, anchoRect, altoRect),
      pausa: this._crearBotonPausa(xPausa, centroY, anchoRect, altoRect),
      ignorarInterfaz: this._crearBotonIgnorarInterfaz(xOcultar, centroY, diamOcultar),
      confirmar: this._crearBotonConfirmar(xConfirmar, centroY, diamGrande),
    };

    Object.values(this.botones).forEach((ctrl) => this.contenedorHud.add(ctrl));

    registrarTodosLosFramesTexto(this);
    this.eventos?.on('abrirPanel', this._alAbrirPanel, this);
    this._registrarAtajos();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  _alAbrirPanel(opciones) {
    abrirPanelEntidad(this, {
      ...opciones,
      onCerrar: () => {
        opciones?.onCerrar?.();
        this.eventos?.emit('panelCerrado');
      },
    });
  }

  _dibujarBarraInferior(x, y, ancho, alto) {
    const fondo = this.add.rectangle(x + ancho / 2, y + alto / 2, ancho, alto, COLOR_BARRA, 0.92);
    fondo.setStrokeStyle(3, COLOR_BORDE, 1);
    fondo.setScrollFactor(0);
    fondo.setDepth(DEPTH_HUD - 1);
    this.contenedorHud.add(fondo);

    const rayado = this.add.graphics();
    rayado.lineStyle(2, COLOR_RAYADO, 0.35);
    const paso = 18;
    for (let i = -alto; i < ancho + alto; i += paso) {
      rayado.lineBetween(x + i, y + alto, x + i + alto, y);
    }
    rayado.setScrollFactor(0);
    rayado.setDepth(DEPTH_HUD - 1);
    this.contenedorHud.add(rayado);
  }

  _emitirEvento(nombreEvento) {
    if (this.eventos) this.eventos.emit(nombreEvento);
  }

  _crearControlCircular(x, y, radio, texto, nombreEvento, atajo) {
    const container = this.add.container(x, y);
    container.setScrollFactor(0);

    const circulo = this.add.circle(0, 0, radio, COLOR_RELLENO, 0.85);
    circulo.setStrokeStyle(3, COLOR_BORDE, 1);
    container.add(circulo);

    const etiqueta = this.add.text(0, 0, texto, {
      fontFamily: 'Arial',
      fontSize: Math.max(10, Math.round(radio * 0.22)),
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: radio * 1.7 },
    });
    etiqueta.setOrigin(0.5, 0.5);
    container.add(etiqueta);

    if (atajo) {
      const leyendaAtajo = this.add.text(0, radio + 14, `atajo: "${atajo}"`, {
        fontFamily: 'Arial',
        fontSize: 13,
        color: '#e8b4b4',
        align: 'center',
      });
      leyendaAtajo.setOrigin(0.5, 0);
      container.add(leyendaAtajo);
    }

    circulo.setInteractive({ useHandCursor: true });
    circulo.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      this._emitirEvento(nombreEvento);
    });

    container.hit = circulo;
    container.nombreEvento = nombreEvento;
    return container;
  }

  _crearControlRectangular(x, y, ancho, alto, texto, nombreEvento, atajo) {
    const container = this.add.container(x, y);
    container.setScrollFactor(0);

    const rect = this.add.rectangle(0, 0, ancho, alto, COLOR_RELLENO, 0.85);
    rect.setStrokeStyle(3, COLOR_BORDE, 1);
    container.add(rect);

    const etiqueta = this.add.text(0, 0, texto, {
      fontFamily: 'Arial',
      fontSize: Math.max(11, Math.round(alto * 0.35)),
      color: '#ffffff',
      align: 'center',
    });
    etiqueta.setOrigin(0.5, 0.5);
    container.add(etiqueta);

    if (atajo) {
      const leyendaAtajo = this.add.text(0, alto / 2 + 16, `atajo: "${atajo}"`, {
        fontFamily: 'Arial',
        fontSize: 13,
        color: '#e8b4b4',
        align: 'center',
      });
      leyendaAtajo.setOrigin(0.5, 0);
      container.add(leyendaAtajo);
    }

    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      this._emitirEvento(nombreEvento);
    });

    container.hit = rect;
    container.nombreEvento = nombreEvento;
    return container;
  }

  _crearBotonConfirmar(x, y, diametro) {
    return this._crearControlCircular(
      x,
      y,
      diametro / 2,
      'Confirmar jugada',
      'confirmar',
      'Enter',
    );
  }

  _crearBotonRendirse(x, y, diametro) {
    return this._crearControlCircular(
      x,
      y,
      diametro / 2,
      'Estoy testeando w\n(rendirse)',
      'rendirse',
      null,
    );
  }

  _crearBotonPausa(x, y, ancho, alto) {
    return this._crearControlRectangular(x, y, ancho, alto, 'Pausa', 'pausa', 'Esc');
  }

  _crearBotonHistorial(x, y, ancho, alto) {
    return this._crearControlRectangular(x, y, ancho, alto, 'Historial', 'historial', 'h');
  }

  _crearBotonIgnorarInterfaz(x, y, diametro) {
    return this._crearControlCircular(x, y, diametro / 2, 'Ocultar', 'ignorarInterfaz', 'o');
  }

  _registrarAtajos() {
    const teclado = this.input.keyboard;
    if (!teclado) return;

    const onHistorial = () => this._emitirEvento('historial');
    const onPausa = () => {
      if (this.panelEntidadActivo) return;
      this._emitirEvento('pausa');
    };
    const onOcultar = () => this._emitirEvento('ignorarInterfaz');
    const onConfirmar = () => this._emitirEvento('confirmar');

    teclado.on('keydown-H', onHistorial);
    teclado.on('keydown-ESC', onPausa);
    teclado.on('keydown-O', onOcultar);
    teclado.on('keydown-ENTER', onConfirmar);

    this._limpiarAtajos = () => {
      teclado.off('keydown-H', onHistorial);
      teclado.off('keydown-ESC', onPausa);
      teclado.off('keydown-O', onOcultar);
      teclado.off('keydown-ENTER', onConfirmar);
    };
  }

  /** Fase 2: habilitar/deshabilitar botones segun estadoRonda. */
  actualizarPorFase(estadoRonda) {}

  shutdown() {
    this.eventos?.off('abrirPanel', this._alAbrirPanel, this);
    this.panelEntidadActivo?.cerrar?.();
    this._limpiarAtajos?.();
    this._limpiarAtajos = null;
  }
}
