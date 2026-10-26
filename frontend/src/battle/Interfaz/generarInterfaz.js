/**
 * generarInterfaz.js — Escena del HUD (spect 002).
 */

import {
  abrirPanelEntidad,
  precargarAssetsPanelEntidad,
} from '../panelEntidad/index.js';
import { precargarTodosLosTextos, registrarTodosLosFramesTexto } from '../panelEntidad/GenerarTexto/index.js';
import { enlazarControlesInterfaz } from './enlazarControles.js';
import { mostrarConfirmacionVida } from './confirmacionVida.js';
import { mostrarEsperaRival, ocultarEsperaRival } from './indicadorEspera.js';
import { mostrarFinalidad, precargarAssetsFinalidad } from '../finalidad.js';

export const CLAVE_ESCENA_HUD = 'interfazBatalla';

const DEPTH_HUD = 9000;
const COLOR_BORDE = 0xc0392b;
const COLOR_RELLENO = 0x922b21;
const COLOR_BARRA = 0x1a1a1a;
const COLOR_RAYADO = 0xc0392b;
const ALPHA_BOTON_BLOQUEADO = 0.35;
const TIEMPO_HASTA_BOTON_VIDA = 120000;

export default class GenerarInterfaz extends Phaser.Scene {
  constructor() {
    super({ key: CLAVE_ESCENA_HUD });
    this.eventos = null;
    this.botones = null;
    this.contenedorHud = null;
    this.contenedorBarra = null;
    this.obtenerRegistro = () => ({ turnos: [] });
    this._limpiarAtajos = null;
    this._desenlazarControles = null;
    this._onFaseCambiada = null;
    this._onConfigModificable = null;
    this._onPreguntaRivalVivo = null;
    this._onRivalVivoConfirmado = null;
    this._onBatallaTerminada = null;
    this._avisoEmisorFaltante = false;
    this._bloqueadoPorEspera = false;
    this._configModificable = true;
    this._estadoRondaActual = 'seleccionando';
    this._puedeComprobarRival = false;
    this._consultaRivalPendiente = false;
    this._temporizadorRivalVivo = null;
    this._overlayRivalVivo = null;
  }

  init(datos) {
    this.eventos = datos?.eventos ?? this.sys?.settings?.data?.eventos ?? null;
    this.obtenerRegistro = datos?.obtenerRegistro ?? this.obtenerRegistro;
    this._puedeComprobarRival = datos?.puedeComprobarRival === true;
  }

  preload() {
    precargarAssetsPanelEntidad(this);
    precargarTodosLosTextos(this);
    precargarAssetsFinalidad(this);
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

    this.contenedorBarra = this.add.container(0, 0);
    this.contenedorBarra.setScrollFactor(0);
    this.contenedorHud.add(this.contenedorBarra);

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
    const xOcultar = bordeIzqCentro + pasoCentro * 1.5;
    const xRivalVivo = bordeIzqCentro + pasoCentro * 2.5;

    const altoRect = Math.round(altoBarra * 0.42);
    const anchoRect = Math.round(Math.min(pasoCentro * 0.72, 280));
    const diamOcultar = Math.round(Math.min(altoBarra * 0.42, pasoCentro * 0.55));

    this.botones = {
      rendirse: this._crearBotonRendirse(xRendirse, centroY, diamGrande),
      historial: this._crearBotonHistorial(xHistorial, centroY, anchoRect, altoRect),
      ignorarInterfaz: this._crearBotonIgnorarInterfaz(xOcultar, centroY, diamOcultar),
      rivalVivo: this._crearBotonRivalVivo(xRivalVivo, centroY, anchoRect, altoRect),
      confirmar: this._crearBotonConfirmar(xConfirmar, centroY, diamGrande),
    };

    Object.values(this.botones).forEach((ctrl) => this.contenedorBarra.add(ctrl));
    this.botones.rivalVivo.setVisible(false);

    this._desenlazarControles = enlazarControlesInterfaz(this, {
      eventos: this.eventos,
      contenedorBarra: this.contenedorBarra,
      obtenerRegistro: () => this.obtenerRegistro(),
    });

    this._onFaseCambiada = (estadoRonda) => {
      this._estadoRondaActual = estadoRonda;
      if (estadoRonda === 'esperandoRival') {
        mostrarEsperaRival(this, this._configModificable);
      }
      else ocultarEsperaRival();
      this.actualizarPorFase(estadoRonda);
      this._actualizarTemporizadorRivalVivo();
    };
    this.eventos?.on('faseCambiada', this._onFaseCambiada);

    this._onConfigModificable = (valor) => {
      this._configModificable = valor === true;
      if (this._estadoRondaActual === 'esperandoRival') {
        mostrarEsperaRival(this, this._configModificable);
        this.actualizarPorFase(this._estadoRondaActual);
      }
    };
    this.eventos?.on('configModificableCambiada', this._onConfigModificable);

    this._onPreguntaRivalVivo = (datos) => this._mostrarPreguntaRivalVivo(datos);
    this._onRivalVivoConfirmado = () => {
      this._consultaRivalPendiente = false;
      this._actualizarTemporizadorRivalVivo();
    };
    this.eventos?.on('preguntaRivalVivo', this._onPreguntaRivalVivo);
    this.eventos?.on('rivalVivoConfirmado', this._onRivalVivoConfirmado);

    this._onBatallaTerminada = (payload) => {
      ocultarEsperaRival();
      this._limpiarComprobacionRival();
      this._bloqueadoPorEspera = false;
      mostrarFinalidad(this, {
        ...payload,
        onHistorial: () => this._emitirEvento('historial'),
      });
    };
    this.eventos?.on('batallaTerminada', this._onBatallaTerminada);

    registrarTodosLosFramesTexto(this);
    this.eventos?.on('abrirPanel', this._alAbrirPanel, this);
    this._registrarAtajos();
    this._actualizarTemporizadorRivalVivo();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  _alAbrirPanel(opciones) {
    abrirPanelEntidad(this, {
      ...opciones,
      onHistorial: () => this._emitirEvento('historial'),
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
    this.contenedorBarra.add(fondo);

    const rayado = this.add.graphics();
    rayado.lineStyle(2, COLOR_RAYADO, 0.35);
    const paso = 18;
    for (let i = -alto; i < ancho + alto; i += paso) {
      rayado.lineBetween(x + i, y + alto, x + i + alto, y);
    }
    rayado.setScrollFactor(0);
    rayado.setDepth(DEPTH_HUD - 1);
    this.contenedorBarra.add(rayado);
  }

  _emitirEvento(nombreEvento, payload) {
    if (this._overlayRivalVivo && nombreEvento !== 'responderRivalVivo') return;
    if (this._bloqueadoPorEspera && (nombreEvento === 'rendirse' || nombreEvento === 'historial')) {
      return;
    }
    if (
      this._bloqueadoPorEspera
      && nombreEvento === 'confirmar'
      && !this._configModificable
    ) return;
    if (nombreEvento === 'preguntarRivalVivo') {
      if (
        this._estadoRondaActual !== 'seleccionando'
        || this._consultaRivalPendiente
        || !this.botones?.rivalVivo?.visible
      ) return;
      this._consultaRivalPendiente = true;
      this.botones.rivalVivo.setVisible(false);
      this._cancelarTemporizadorRivalVivo();
    }
    if (this.eventos) this.eventos.emit(nombreEvento, payload);
  }

  _cancelarTemporizadorRivalVivo() {
    this._temporizadorRivalVivo?.remove?.(false);
    this._temporizadorRivalVivo = null;
  }

  _actualizarTemporizadorRivalVivo() {
    this._cancelarTemporizadorRivalVivo();
    this.botones?.rivalVivo?.setVisible(false);
    if (
      !this._puedeComprobarRival
      || this._consultaRivalPendiente
      || this._estadoRondaActual !== 'seleccionando'
    ) return;
    this._temporizadorRivalVivo = this.time.delayedCall(TIEMPO_HASTA_BOTON_VIDA, () => {
      this._temporizadorRivalVivo = null;
      if (this._estadoRondaActual === 'seleccionando' && !this._consultaRivalPendiente) {
        this.botones?.rivalVivo?.setVisible(true);
      }
    });
  }

  _mostrarPreguntaRivalVivo(datos) {
    this._cancelarTemporizadorRivalVivo();
    this.botones?.rivalVivo?.setVisible(false);
    this._overlayRivalVivo?.cerrar?.();
    this._overlayRivalVivo = mostrarConfirmacionVida(this, {
      ...datos,
      onResponder: (id) => {
        this._overlayRivalVivo = null;
        this._emitirEvento('responderRivalVivo', { id });
        this._actualizarTemporizadorRivalVivo();
      },
    });
  }

  _limpiarComprobacionRival() {
    this._cancelarTemporizadorRivalVivo();
    this._overlayRivalVivo?.cerrar?.();
    this._overlayRivalVivo = null;
    this.botones?.rivalVivo?.setVisible(false);
  }

  _setBotonHabilitado(container, habilitado) {
    const hit = container?.hit;
    if (!hit) return;
    if (habilitado) {
      hit.setInteractive({ useHandCursor: true });
      hit.setAlpha(1);
    } else {
      hit.disableInteractive();
      hit.setAlpha(ALPHA_BOTON_BLOQUEADO);
    }
  }

  actualizarPorFase(estadoRonda) {
    const esperando = estadoRonda === 'esperandoRival';
    const escudo = estadoRonda === 'escudo';
    this._bloqueadoPorEspera = esperando;
    this._setBotonHabilitado(
      this.botones?.confirmar,
      !escudo && (!esperando || this._configModificable),
    );
    this._setBotonHabilitado(this.botones?.rendirse, !esperando);
    this._setBotonHabilitado(this.botones?.historial, !esperando);
    this._setBotonHabilitado(this.botones?.ignorarInterfaz, true);
    this._setBotonHabilitado(this.botones?.rivalVivo, !esperando && !escudo);
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
    return this._crearControlCircular(x, y, diametro / 2, 'Confirmar jugada', 'confirmar', 'Enter');
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

  _crearBotonHistorial(x, y, ancho, alto) {
    return this._crearControlRectangular(x, y, ancho, alto, 'Historial', 'historial', 'h');
  }

  _crearBotonIgnorarInterfaz(x, y, diametro) {
    return this._crearControlCircular(x, y, diametro / 2, 'Ocultar', 'ignorarInterfaz', 'o');
  }

  _crearBotonRivalVivo(x, y, ancho, alto) {
    return this._crearControlRectangular(
      x,
      y,
      ancho,
      alto,
      '¿Rival vivo?',
      'preguntarRivalVivo',
      null,
    );
  }

  _registrarAtajos() {
    const teclado = this.input.keyboard;
    if (!teclado) return;

    const onHistorial = () => this._emitirEvento('historial');
    const onOcultar = () => this._emitirEvento('ignorarInterfaz');
    const onConfirmar = () => this._emitirEvento('confirmar');

    teclado.on('keydown-H', onHistorial);
    teclado.on('keydown-O', onOcultar);
    teclado.on('keydown-ENTER', onConfirmar);

    this._limpiarAtajos = () => {
      teclado.off('keydown-H', onHistorial);
      teclado.off('keydown-O', onOcultar);
      teclado.off('keydown-ENTER', onConfirmar);
    };
  }

  shutdown() {
    this.eventos?.off('abrirPanel', this._alAbrirPanel, this);
    this.eventos?.off('faseCambiada', this._onFaseCambiada);
    this.eventos?.off('configModificableCambiada', this._onConfigModificable);
    this.eventos?.off('preguntaRivalVivo', this._onPreguntaRivalVivo);
    this.eventos?.off('rivalVivoConfirmado', this._onRivalVivoConfirmado);
    this.eventos?.off('batallaTerminada', this._onBatallaTerminada);
    ocultarEsperaRival();
    this._limpiarComprobacionRival();
    this.panelEntidadActivo?.cerrar?.();
    this._desenlazarControles?.();
    this._desenlazarControles = null;
    this._limpiarAtajos?.();
    this._limpiarAtajos = null;
  }
}
