/**
 * orbes.js — Menu radial de acciones de una potestad.
 *
 * SPECT: docs/spects/spect005.md
 *
 * La escena, el registro y el tablero se inyectan. Elegir una accion emite
 * 'accionElegida'; no escribe en estructuras ajenas.
 */

import {
  ASSETS,
  ORBE_BASE_FRAME,
  CLAVE_ICONO_FALLBACK,
  ICONO_FALLBACK,
} from '../panelEntidad/panelEntidadConfig.js';
import { adaptarParaOrbes } from '../datosDePotestades/IndexDePotestades.js';
import {
  normalizarCasoSeleccion,
  candidatosPorBando,
  obtenerRangoAccion,
  candidatosCasilla,
} from '../datosDePotestades/utilidadesDeSeleccion.js';

/** Normaliza la `ruta` de un icono de acción a una URL cargable desde la raíz. */
export function rutaIconoNormalizada(ruta) {
  if (!ruta) return null;
  let p = String(ruta).replace(/^(\.\.\/)+/, '');
  const idx = p.indexOf('assets/');
  if (idx >= 0) p = p.slice(idx);
  return p.replace('/iconos/', '/Iconos/');
}

/** Clave de textura estable para el icono de una acción. */
export function claveIconoAccion(ruta) {
  const base = String(ruta ?? '').split('/').pop() ?? '';
  return `iconoAccion_${base.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

/** Vela y Base.png: las orbes dibujan en el mundo, no en el HUD. */
export function precargarOrbes(escena) {
  if (!escena?.load) return;
  if (!escena.textures.exists(CLAVE_ICONO_FALLBACK)) {
    escena.load.image(CLAVE_ICONO_FALLBACK, ICONO_FALLBACK);
  }
  const base = ASSETS.base;
  if (!escena.textures.exists(base.clave)) {
    escena.load.spritesheet(base.clave, base.archivo, {
      frameWidth: base.frameWidth,
      frameHeight: base.frameHeight,
      margin: base.margin ?? 0,
      spacing: base.spacing ?? 0,
    });
  }
}

export default class SistemaDeOrbes {
  /**
   * @param {Phaser.Scene} escena
   * @param {Phaser.Events.EventEmitter} eventos
   * @param {object} registro registro de IndexDePotestades
   * @param {Array} tablero array bidimensional del administrador
   */
  constructor(escena, eventos, registro, tablero) {
    this.escena = escena;
    this.eventos = eventos;
    this.registro = registro;
    this.tablero = tablero;
    this.potestad = null;
    this.acciones = { habilidades: [], objetos: [], movimiento: [] };
    this.objetivoSeleccionado = null;
    this.tareaPendienteObjetivo = null;
    this.orbesSeleccion = [];
    this.flechasNavegacion = [];
    this.marcasObjetivo = [];
    this._handlersObjetivo = [];
    this._handlersCasillaObjetivo = [];
    this._restauradoresBrilloObjetivo = [];
    this._updateOrbesHandler = null;
    this._keydownOrbesHandler = null;
    this._keydownObjetivoHandler = null;
    this._estaSeleccionado = false;
    this._cadenaActual = 'principal';
    this._offsetCadena = 0;
    this._transicionandoOrbes = false;
    this._bloquearClicHasta = 0;
  }

  get tieneObjetivoPendiente() {
    return this.tareaPendienteObjetivo != null;
  }

  /** El pointerup del tablero llega despues del pointerdown del orbe; hay que ignorarlo. */
  get bloqueandoClic() {
    return this.tieneObjetivoPendiente
      || (this.escena?.time?.now ?? 0) < this._bloquearClicHasta;
  }

  _consumirClicTablero() {
    this._bloquearClicHasta = (this.escena?.time?.now ?? 0) + 250;
  }

  _detenerSeguimientoOrbes() {
    if (this._updateOrbesHandler && this.escena?.events) {
      this.escena.events.off('update', this._updateOrbesHandler);
    }
    this._updateOrbesHandler = null;
  }

  _calcularObjetivosOrbes() {
    const sprite = this.potestad?.sprite;
    if (!sprite?.active) return null;

    const radio = 30;
    const semieje = Math.max(sprite.displayWidth, sprite.displayHeight) * 0.5;
    const distancia = semieje;
    const xOrbes = sprite.x - distancia;

    return {
      centro: { x: sprite.x, y: sprite.y },
      radio,
      posiciones: [
        { x: xOrbes, y: sprite.y + distancia },
        { x: xOrbes, y: sprite.y },
        { x: xOrbes, y: sprite.y - distancia },
      ],
      flechaArriba: { x: xOrbes, y: sprite.y - distancia - radio * 5 },
      flechaAbajo: { x: xOrbes, y: sprite.y + distancia + radio * 5 },
    };
  }

  _obtenerCategoriasPrincipales() {
    return [
      { tipo: 'principal', clave: 'movimiento', nombre: 'MOVIMIENTO', color: 0x8be66f },
      { tipo: 'principal', clave: 'habilidades', nombre: 'HABILIDAD', color: 0x7ed4ff },
      { tipo: 'principal', clave: 'objetos', nombre: 'OBJETO', color: 0xf5d36a },
    ];
  }

  _obtenerCategoriaActual() {
    return this._obtenerCategoriasPrincipales().find((categoria) => categoria.clave === this._cadenaActual) ?? null;
  }

  _obtenerElementosCadenaActual() {
    if (this._cadenaActual === 'principal') {
      return this._obtenerCategoriasPrincipales();
    }

    const color = this._obtenerCategoriaActual()?.color ?? 0x7ed4ff;
    const acciones = this.acciones?.[this._cadenaActual] ?? [];
    return acciones.map((accion, indiceAccion) => ({
      tipo: 'accion',
      nombre: accion.nombre ?? `ACCION ${indiceAccion + 1}`,
      accion,
      indiceAccion,
      color: accion.condicional === false ? 0x7a7a7a : color,
    }));
  }

  _obtenerElementosVisibles() {
    return this._obtenerElementosCadenaActual().slice(this._offsetCadena, this._offsetCadena + 3);
  }

  _limpiarReferenciasOrbesAcciones() {
    Object.values(this.acciones ?? {}).flat().forEach((accion) => {
      if (accion) accion.orbePhaser = null;
    });
  }

  _colocarIcono(cont, clave, radio, tinte) {
    if (!cont.active || !this.escena.textures.exists(clave)) return;
    const icono = this.escena.add.image(0, 0, clave);
    icono.setOrigin(0.5);
    icono.setDisplaySize(radio * 1.3, radio * 1.3);
    if (tinte != null) icono.setTint(tinte);
    cont.add(icono);
    cont.iconoSprite = icono;
  }

  /**
   * Orbe marrón + icono. Habilidades usan `ruta`; el resto, la vela tintada.
   */
  _crearOrbeConIcono(meta, centro, radio) {
    const cont = this.escena.add.container(centro.x, centro.y);

    const base = this.escena.add.image(0, 0, ASSETS.base.clave, ORBE_BASE_FRAME);
    base.setOrigin(0.5);
    base.setDisplaySize(radio * 2.4, radio * 2.4);
    cont.add(base);

    const esHabilidad = this._cadenaActual === 'habilidades' && meta.tipo === 'accion';
    const ruta = esHabilidad ? meta?.accion?.ruta : null;
    if (ruta) {
      const clave = claveIconoAccion(ruta);
      const colocar = () => this._colocarIcono(cont, clave, radio, null);
      if (this.escena.textures.exists(clave)) {
        colocar();
      } else {
        this.escena.load.image(clave, rutaIconoNormalizada(ruta));
        this.escena.load.once('complete', colocar);
        if (!this.escena.load.isLoading()) this.escena.load.start();
      }
    } else {
      const clave = this.escena.textures.exists(CLAVE_ICONO_FALLBACK)
        ? CLAVE_ICONO_FALLBACK
        : null;
      if (clave) this._colocarIcono(cont, clave, radio, meta.color);
      else {
        this.escena.load.image(CLAVE_ICONO_FALLBACK, ICONO_FALLBACK);
        this.escena.load.once('complete', () => {
          this._colocarIcono(cont, CLAVE_ICONO_FALLBACK, radio, meta.color);
        });
        if (!this.escena.load.isLoading()) this.escena.load.start();
      }
    }

    const hit = this.escena.add.circle(0, 0, radio * 1.05, 0xffffff, 0.001);
    hit.setInteractive({ useHandCursor: true });
    cont.add(hit);

    cont.hitTarget = hit;
    cont.baseSprite = base;
    return cont;
  }

  /** Resalta el orbe al pasar el cursor. Sin tweens: no interrumpe animaciones. */
  _brilloOrbe(orbe, activar) {
    if (!orbe || !orbe.active) return;

    const escalaReposo = orbe._escalaReposo ?? 3;
    orbe.setScale(activar ? escalaReposo * 1.06 : escalaReposo);

    if (orbe.baseSprite?.setTint) {
      orbe.baseSprite.setTint(activar ? 0xffffcc : 0xffffff);
    }
  }

  _fijarEscalaReposoOrbe(orbe, escala) {
    if (!orbe) return;
    orbe._escalaReposo = escala;
    orbe.setScale(escala);
  }

  _crearOrbe(meta, indice, objetivos) {
    if (!this.escena || !objetivos) return;

    const orbe = this._crearOrbeConIcono(meta, objetivos.centro, objetivos.radio);
    orbe.setDepth(20);
    orbe.setScale(0.2);
    orbe.setAlpha(0);
    orbe._escalaReposo = 3;

    const input = orbe.hitTarget ?? orbe;
    input.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this._manejarClickOrbe(meta);
    });
    input.on('pointerover', () => this._brilloOrbe(orbe, true));
    input.on('pointerout', () => this._brilloOrbe(orbe, false));

    if (meta.accion) meta.accion.orbePhaser = orbe;

    const entrada = { orbe, etiqueta: null, meta, indice };
    this.orbesSeleccion.push(entrada);
    return entrada;
  }

  _crearOrbesSeleccion() {
    if (this.orbesSeleccion.length > 0) return;
    const objetivos = this._calcularObjetivosOrbes();
    if (!objetivos) return;

    this._limpiarReferenciasOrbesAcciones();
    this._obtenerElementosVisibles().forEach((meta, indice) => this._crearOrbe(meta, indice, objetivos));
  }

  _animarEntradaOrbes(direccion = 0) {
    const objetivos = this._calcularObjetivosOrbes();
    if (!this.escena || !objetivos || this.orbesSeleccion.length === 0) return;

    this.orbesSeleccion.forEach((entrada, indice) => {
      const { orbe } = entrada;
      const destino = objetivos.posiciones[indice];
      const origen = direccion === 0
        ? objetivos.centro
        : { x: destino.x, y: destino.y + direccion * 70 };

      orbe.setPosition(origen.x, origen.y);
      this.escena.tweens.killTweensOf(orbe);
      this.escena.tweens.add({
        targets: orbe,
        x: destino.x,
        y: destino.y,
        alpha: 1,
        scale: 3,
        duration: 180 + indice * 30,
        ease: 'Sine.easeOut',
        onComplete: () => this._fijarEscalaReposoOrbe(orbe, 3),
      });
    });
  }

  _seguirOrbes() {
    if (!this.escena || this.orbesSeleccion.length === 0) return;

    this._detenerSeguimientoOrbes();
    this._updateOrbesHandler = () => {
      const objetivos = this._calcularObjetivosOrbes();
      if (!objetivos) return;

      this.orbesSeleccion.forEach(({ orbe, etiqueta }, indice) => {
        if (!orbe?.active) return;
        const posicion = objetivos.posiciones[indice];
        orbe.x = posicion.x;
        orbe.y = posicion.y;
        if (etiqueta?.active) {
          etiqueta.x = posicion.x;
          etiqueta.y = posicion.y;
        }
      });
      this._actualizarPosicionFlechas(objetivos);
    };
    this.escena.events.on('update', this._updateOrbesHandler);
  }

  _animarSalidaOrbes(onComplete = null) {
    const objetivos = this._calcularObjetivosOrbes();
    if (!this.escena || !objetivos || this.orbesSeleccion.length === 0) {
      this._destruirOrbes();
      onComplete?.();
      return;
    }

    this._detenerSeguimientoOrbes();
    this._destruirFlechasNavegacion();
    let restantes = this.orbesSeleccion.length;

    this.orbesSeleccion.forEach(({ orbe }) => {
      if (!orbe?.active) {
        restantes -= 1;
        if (restantes <= 0) {
          this.orbesSeleccion = [];
          this._limpiarReferenciasOrbesAcciones();
          onComplete?.();
        }
        return;
      }

      this.escena.tweens.killTweensOf(orbe);
      this.escena.tweens.add({
        targets: orbe,
        x: objetivos.centro.x,
        y: objetivos.centro.y,
        alpha: 0,
        scale: 0.2,
        duration: 160,
        ease: 'Sine.easeIn',
        onComplete: () => {
          orbe?.destroy?.();
          restantes -= 1;
          if (restantes <= 0) {
            this.orbesSeleccion = [];
            this._limpiarReferenciasOrbesAcciones();
            onComplete?.();
          }
        },
      });
    });
  }

  _destruirOrbes() {
    this._detenerSeguimientoOrbes();

    this.orbesSeleccion.forEach(({ orbe, etiqueta }) => {
      if (orbe?.active) {
        this.escena?.tweens?.killTweensOf(orbe);
        orbe.destroy();
      }
      etiqueta?.destroy();
    });
    this.orbesSeleccion = [];

    Object.values(this.acciones ?? {}).flat().forEach((accion) => {
      const orbe = accion?.orbePhaser;
      if (orbe?.active) {
        this.escena?.tweens?.killTweensOf(orbe);
        orbe.destroy();
      }
      if (accion) accion.orbePhaser = null;
    });

    this._transicionandoOrbes = false;
  }

  _mostrarCadena(cadena, offset = 0, direccion = 0, conSalida = true) {
    if (this._transicionandoOrbes) return;
    this._transicionandoOrbes = true;

    const crearEntrada = () => {
      if (!this._estaSeleccionado) {
        this._transicionandoOrbes = false;
        return;
      }

      this._cadenaActual = cadena;
      this._offsetCadena = Math.max(0, offset);
      this._crearOrbesSeleccion();
      this._animarEntradaOrbes(direccion);
      this._crearFlechasNavegacion();
      this._seguirOrbes();
      this._transicionandoOrbes = false;
    };

    if (conSalida && this.orbesSeleccion.length > 0) {
      this._animarSalidaOrbes(crearEntrada);
      return;
    }

    this._destruirOrbes();
    this._destruirFlechasNavegacion();
    crearEntrada();
  }

  _claveMeta(meta) {
    return meta.tipo === 'accion'
      ? `accion:${meta.indiceAccion}`
      : `principal:${meta.clave}`;
  }

  _animarNavegacionCadena(direccion) {
    const objetivos = this._calcularObjetivosOrbes();
    if (!this.escena || !objetivos || this._transicionandoOrbes) return;

    const nuevoOffset = this._offsetCadena + direccion;
    const maxOffset = Math.max(0, this._obtenerElementosCadenaActual().length - 3);
    if (nuevoOffset < 0 || nuevoOffset > maxOffset) return;

    this._transicionandoOrbes = true;
    this._detenerSeguimientoOrbes();
    this._destruirFlechasNavegacion();

    const entradasActuales = [...this.orbesSeleccion];
    const entradasPorClave = new Map(
      entradasActuales.map((entrada) => [this._claveMeta(entrada.meta), entrada])
    );

    this._offsetCadena = nuevoOffset;
    const nuevasEntradas = [];
    const nuevasMetas = this._obtenerElementosVisibles();
    const origenNuevo = direccion > 0
      ? { x: objetivos.posiciones[2].x, y: objetivos.posiciones[2].y - 70 }
      : { x: objetivos.posiciones[0].x, y: objetivos.posiciones[0].y + 70 };

    nuevasMetas.forEach((meta, indice) => {
      const clave = this._claveMeta(meta);
      const entradaExistente = entradasPorClave.get(clave);

      if (entradaExistente) {
        entradaExistente.meta = meta;
        entradaExistente.indice = indice;
        if (meta.accion) meta.accion.orbePhaser = entradaExistente.orbe;
        entradasPorClave.delete(clave);
        nuevasEntradas.push(entradaExistente);
        return;
      }

      const nuevaEntrada = this._crearOrbe(meta, indice, objetivos);
      if (!nuevaEntrada) return;
      nuevaEntrada.orbe.setPosition(origenNuevo.x, origenNuevo.y);
      nuevaEntrada.orbe.setScale(3);
      nuevaEntrada.orbe.setAlpha(0);
      nuevasEntradas.push(nuevaEntrada);
    });

    const salientes = [...entradasPorClave.values()];
    const destinoSalida = direccion > 0
      ? { x: objetivos.posiciones[0].x, y: objetivos.posiciones[0].y + 70 }
      : { x: objetivos.posiciones[2].x, y: objetivos.posiciones[2].y - 70 };
    let pendientes = nuevasEntradas.length + salientes.length;

    const finalizarTween = () => {
      pendientes -= 1;
      if (pendientes > 0) return;
      this.orbesSeleccion = nuevasEntradas;
      this._crearFlechasNavegacion();
      this._seguirOrbes();
      this._transicionandoOrbes = false;
    };

    nuevasEntradas.forEach((entrada, indice) => {
      const destino = objetivos.posiciones[indice];
      this.escena.tweens.killTweensOf(entrada.orbe);
      this.escena.tweens.add({
        targets: entrada.orbe,
        x: destino.x,
        y: destino.y,
        alpha: 1,
        scale: 3,
        duration: 180,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this._fijarEscalaReposoOrbe(entrada.orbe, 3);
          finalizarTween();
        },
      });
    });

    salientes.forEach((entrada) => {
      if (entrada.meta?.accion) entrada.meta.accion.orbePhaser = null;
      this.escena.tweens.killTweensOf(entrada.orbe);
      this.escena.tweens.add({
        targets: entrada.orbe,
        x: destinoSalida.x,
        y: destinoSalida.y,
        alpha: 0,
        duration: 160,
        ease: 'Sine.easeIn',
        onComplete: () => {
          entrada.orbe?.destroy();
          finalizarTween();
        },
      });
    });

    if (pendientes === 0) {
      this.orbesSeleccion = nuevasEntradas;
      this._crearFlechasNavegacion();
      this._seguirOrbes();
      this._transicionandoOrbes = false;
    }
  }

  _manejarClickOrbe(meta) {
    this._consumirClicTablero();
    if (this._transicionandoOrbes) return;

    if (meta.tipo === 'principal') {
      this._mostrarCadena(meta.clave, 0, 0);
      return;
    }

    if (meta.accion?.condicional === false) {
      this._animacionRechazoEntidad();
      return;
    }

    this._iniciarSeleccionObjetivo({
      accion: meta.accion,
      potestad: this.potestad,
      objetivo: null,
    });
  }

  /** Tiñe de rojo y hace tiritar al personaje para indicar que la accion no es posible. */
  _animacionRechazoEntidad() {
    const sprite = this.potestad?.sprite;
    if (!sprite?.active || !this.escena) return;

    this.escena.tweens?.killTweensOf(sprite);
    const xPrev = sprite.x;
    const tintePrevio = sprite.tintTopLeft;
    sprite.setTint(0xff0000);

    this.escena.tweens.add({
      targets: sprite,
      x: { from: xPrev - 12, to: xPrev + 12 },
      duration: 45,
      yoyo: true,
      repeat: 7,
      onComplete: () => {
        sprite.x = xPrev;
        if (tintePrevio != null && tintePrevio !== 0xffffff) sprite.setTint(tintePrevio);
        else sprite.clearTint();
      },
    });
  }

  _obtenerPosicionPotestad(potestad = this.potestad) {
    return potestad?.datos?.posicion ?? null;
  }

  _obtenerCandidatosObjetivo(bandos, rango = Infinity) {
    const origen = this._obtenerPosicionPotestad();
    return candidatosPorBando(this.registro?.todos?.() ?? [], bandos, origen, rango)
      .filter((entrada) => entrada.potestad?.sprite?.active)
      .map((entrada) => ({
        bando: entrada.bando,
        entidad: entrada.potestad,
        especifico: entrada.potestad,
        sprite: entrada.potestad.sprite,
      }));
  }

  _obtenerCandidatosCasilla(rango = Infinity, accion = null) {
    const origen = this._obtenerPosicionPotestad();
    return candidatosCasilla(this.tablero, origen, rango, accion?.permiteCasillaOcupada === true)
      .map(({ casilla, x, y }) => ({ casilla, col: x, fila: y }));
  }

  _emitirAccionElegida(nuevaTarea, objetivo) {
    this._consumirClicTablero();
    this.eventos?.emit('accionElegida', {
      id: this.potestad?.id ?? nuevaTarea?.potestad?.id,
      nombreDeAccion: nuevaTarea?.accion?.nombre,
      objetivo,
      azar: null,
    });
    if (this._estaSeleccionado) {
      this._mostrarCadena(this._cadenaActual, this._offsetCadena, 0, false);
    }
  }

  _iniciarSeleccionObjetivo(nuevaTarea) {
    const casoDeEleccion = nuevaTarea.accion?.casoDeEleccion;
    const casoSeleccion = normalizarCasoSeleccion(casoDeEleccion);
    const rango = obtenerRangoAccion(nuevaTarea.accion);

    if (casoSeleccion.tipo === 'automatico') {
      this.objetivoSeleccionado = null;
      this._limpiarSeleccionObjetivo();
      this._emitirAccionElegida(nuevaTarea, null);
      return;
    }

    if (casoSeleccion.tipo === 'posterior') {
      this._limpiarSeleccionObjetivo();
      this._emitirAccionElegida(nuevaTarea, null);
      return;
    }

    if (casoSeleccion.tipo === 'casilla') {
      const casillas = this._obtenerCandidatosCasilla(rango, nuevaTarea.accion);
      if (casillas.length === 0) {
        this._animacionRechazoEntidad();
        return;
      }

      this._limpiarSeleccionObjetivo();
      this.tareaPendienteObjetivo = nuevaTarea;
      this.objetivoSeleccionado = null;
      this._destruirOrbes();
      this._destruirFlechasNavegacion();
      this._registrarCancelacionObjetivo();
      this._marcarCasillasObjetivo(casillas);
      return;
    }

    const candidatos = this._obtenerCandidatosObjetivo(casoSeleccion.bandos, rango);
    if (candidatos.length === 0) {
      this._animacionRechazoEntidad();
      return;
    }

    this._limpiarSeleccionObjetivo();
    this.tareaPendienteObjetivo = nuevaTarea;
    this.objetivoSeleccionado = null;
    this._destruirOrbes();
    this._destruirFlechasNavegacion();
    this._registrarCancelacionObjetivo();
    this._marcarObjetivos(candidatos);
  }

  _marcarObjetivos(candidatos) {
    if (!this.escena) return;

    candidatos.forEach((candidato) => {
      const tintePrevio = candidato.sprite.tintTopLeft;
      const alphaPrevio = candidato.sprite.alpha;
      candidato.sprite.setTint(candidato.bando === 'Aliados' ? 0x8be66f : 0xff6b6b);
      this.escena.tweens.add({
        targets: candidato.sprite,
        alpha: 0.45,
        duration: 520,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
      this._restauradoresBrilloObjetivo.push(() => {
        this.escena.tweens?.killTweensOf(candidato.sprite);
        candidato.sprite.setAlpha(alphaPrevio ?? 1);
        if (tintePrevio != null && tintePrevio !== 0xffffff) {
          candidato.sprite.setTint(tintePrevio);
        } else {
          candidato.sprite.clearTint();
        }
      });

      const handler = (pointer, localX, localY, event) => {
        event?.stopPropagation?.();
        this._finalizarSeleccionObjetivo(this.tareaPendienteObjetivo, candidato);
      };
      candidato.sprite.setInteractive({ useHandCursor: true });
      candidato.sprite.on('pointerdown', handler);
      this._handlersObjetivo.push({ sprite: candidato.sprite, handler });
    });
  }

  _marcarCasillasObjetivo(casillas) {
    if (!this.escena) return;

    casillas.forEach(({ casilla, col, fila }) => {
      const base = casilla.casillaPhaser;
      if (!base?.active) return;

      const ancho = base.displayWidth || (base.width * (base.scaleX ?? 1)) || 1;
      const alto = base.displayHeight || (base.height * (base.scaleY ?? 1)) || 1;
      const cx = base.x + ancho * (0.5 - (base.originX ?? 0));
      const cy = base.y + alto * (0.5 - (base.originY ?? 0));

      const brillo = this.escena.add.rectangle(cx, cy, ancho, alto, 0xffe066);
      brillo.setDepth((base.depth ?? 0) + 1);
      brillo.setAlpha(0.25);
      brillo.setInteractive({ useHandCursor: true });

      this.escena.tweens.add({
        targets: brillo,
        alpha: 0.7,
        duration: 620,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      const handler = (pointer, localX, localY, event) => {
        event?.stopPropagation?.();
        this._finalizarSeleccionCasilla(this.tareaPendienteObjetivo, { col, fila, casilla });
      };
      brillo.on('pointerdown', handler);
      this._handlersCasillaObjetivo.push({ marca: brillo, handler });
      this.marcasObjetivo.push(brillo);
    });
  }

  _registrarCancelacionObjetivo() {
    if (!this.escena?.input?.keyboard || this._keydownObjetivoHandler) return;

    this._keydownObjetivoHandler = (event) => {
      if (event.code !== 'Escape' && event.code !== 'ArrowLeft' && event.code !== 'KeyA') return;
      event.preventDefault?.();
      this._limpiarSeleccionObjetivo();
      this._mostrarCadena(this._cadenaActual, this._offsetCadena, 0, false);
    };
    this.escena.input.keyboard.on('keydown', this._keydownObjetivoHandler);
  }

  _limpiarSeleccionObjetivo(limpiarTarea = true) {
    this._handlersObjetivo.forEach(({ sprite, handler }) => {
      sprite?.off?.('pointerdown', handler);
    });
    this._handlersObjetivo = [];

    this._handlersCasillaObjetivo.forEach(({ marca, handler }) => {
      marca?.off?.('pointerdown', handler);
    });
    this._handlersCasillaObjetivo = [];

    this._restauradoresBrilloObjetivo.forEach((restaurar) => restaurar?.());
    this._restauradoresBrilloObjetivo = [];

    this.marcasObjetivo.forEach((marca) => {
      this.escena?.tweens?.killTweensOf(marca);
      marca?.destroy();
    });
    this.marcasObjetivo = [];

    if (this._keydownObjetivoHandler && this.escena?.input?.keyboard) {
      this.escena.input.keyboard.off('keydown', this._keydownObjetivoHandler);
    }
    this._keydownObjetivoHandler = null;

    if (limpiarTarea) this.tareaPendienteObjetivo = null;
  }

  _finalizarSeleccionCasilla(nuevaTarea, candidato) {
    if (!nuevaTarea) return;
    const coordenadas = candidato ? { x: candidato.col, y: candidato.fila } : null;
    this._limpiarSeleccionObjetivo();
    this._emitirAccionElegida(nuevaTarea, coordenadas);
  }

  _finalizarSeleccionObjetivo(nuevaTarea, candidato) {
    if (!nuevaTarea) return;
    this.objetivoSeleccionado = candidato?.especifico ?? null;
    this._limpiarSeleccionObjetivo();
    this._emitirAccionElegida(nuevaTarea, candidato?.especifico?.id ?? null);
  }

  _puedeNavegarArriba() {
    return this._cadenaActual !== 'principal' && this._offsetCadena > 0;
  }

  _puedeNavegarAbajo() {
    if (this._cadenaActual === 'principal') return false;
    return this._offsetCadena + 3 < this._obtenerElementosCadenaActual().length;
  }

  _navegarOrbes(direccion) {
    if (direccion < 0 && !this._puedeNavegarArriba()) return;
    if (direccion > 0 && !this._puedeNavegarAbajo()) return;
    this._animarNavegacionCadena(direccion);
  }

  _volverCadenaPrincipal() {
    if (this._cadenaActual === 'principal') return;
    this._mostrarCadena('principal', 0, 0);
  }

  _registrarInputsNavegacion() {
    if (!this.escena?.input?.keyboard || this._keydownOrbesHandler) return;

    this._keydownOrbesHandler = (event) => {
      if (!this._estaSeleccionado) return;

      if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault?.();
        this._navegarOrbes(-1);
        return;
      }
      if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        event.preventDefault?.();
        this._navegarOrbes(1);
        return;
      }
      if (event.code === 'ArrowLeft' || event.code === 'KeyA' || event.code === 'Escape') {
        event.preventDefault?.();
        this._volverCadenaPrincipal();
      }
    };

    this.escena.input.keyboard.on('keydown', this._keydownOrbesHandler);
  }

  _detenerInputsNavegacion() {
    if (this._keydownOrbesHandler && this.escena?.input?.keyboard) {
      this.escena.input.keyboard.off('keydown', this._keydownOrbesHandler);
    }
    this._keydownOrbesHandler = null;
  }

  _crearFlechaNavegacion(tipo, posicion, activa = true) {
    if (!this.escena) return null;

    const puntos = tipo === 'arriba'
      ? [0, 28, 22, 0, 44, 28]
      : [0, 0, 44, 0, 22, 28];
    const flecha = this.escena.add.triangle(posicion.x, posicion.y, ...puntos, 0xffffff, activa ? 0.9 : 0.25);
    flecha.tipoNavegacion = tipo;
    flecha.setDepth(22);
    flecha.setOrigin(0.5);
    flecha.setInteractive({ useHandCursor: activa });
    flecha.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this._consumirClicTablero();
      this._navegarOrbes(tipo === 'arriba' ? -1 : 1);
    });
    return flecha;
  }

  _crearFlechasNavegacion() {
    this._destruirFlechasNavegacion();
    if (this._cadenaActual === 'principal') return;
    if (this._obtenerElementosCadenaActual().length <= 3) return;

    const objetivos = this._calcularObjetivosOrbes();
    if (!objetivos) return;

    const flechas = [];
    if (this._puedeNavegarArriba()) {
      flechas.push(this._crearFlechaNavegacion('arriba', objetivos.flechaArriba));
    }
    if (this._puedeNavegarAbajo()) {
      flechas.push(this._crearFlechaNavegacion('abajo', objetivos.flechaAbajo));
    }
    this.flechasNavegacion = flechas.filter(Boolean);
  }

  _actualizarPosicionFlechas(objetivos) {
    this.flechasNavegacion.forEach((flecha) => {
      const posicion = flecha.tipoNavegacion === 'arriba'
        ? objetivos.flechaArriba
        : objetivos.flechaAbajo;
      flecha.setPosition(posicion.x, posicion.y);
    });
  }

  _destruirFlechasNavegacion() {
    this.flechasNavegacion.forEach((flecha) => flecha?.destroy());
    this.flechasNavegacion = [];
  }

  onSeleccionar(potestad) {
    if (this._estaSeleccionado && this.potestad === potestad) {
      this.onDeseleccionar();
      return false;
    }

    this.potestad = potestad;
    if (!this.potestad) return false;
    this.acciones = adaptarParaOrbes(this.potestad);

    this._estaSeleccionado = true;
    this._transicionandoOrbes = false;
    this._registrarInputsNavegacion();
    this._mostrarCadena('principal', 0, 0, false);
    return true;
  }

  onDeseleccionar() {
    if (!this._estaSeleccionado && !this.tareaPendienteObjetivo) return;
    this._estaSeleccionado = false;
    this._transicionandoOrbes = false;
    this._detenerInputsNavegacion();
    this._limpiarSeleccionObjetivo();
    this._destruirOrbes();
    this._destruirFlechasNavegacion();
    this._cadenaActual = 'principal';
    this._offsetCadena = 0;
    this.potestad = null;
  }
}
