/**
 * orbes.js — Menu radial de acciones de una potestad.
 *
 * SPECT: docs/spects/spect005.md
 *
 * QUE SERA: cuando el jugador selecciona una potestad, aparecen tres orbes a
 * su alrededor (movimiento, habilidad, objeto). Al pulsar una se despliega su
 * cadena de acciones, navegable con flechas o teclado. Al elegir una accion
 * se marca en el tablero a quien o donde puede apuntar.
 *
 * Es el sistema mas salvable del codigo viejo y se traslada casi entero.
 *
 * QUE TIENE QUE CAMBIAR EL SPECT 005, en orden de importancia:
 *
 *   1. La escena. El original se llamaba desde la escena `entidad` y buscaba
 *      la del tablero con scene.get('tablero'): 18 llamadas a
 *      obtenerEscenaTablero() repartidas por el archivo. Ahora la escena del
 *      mundo se inyecta por constructor. Se ha dejado obtenerEscenaTablero()
 *      como puente de una linea para que el rescate siga en pie; hay que
 *      sustituir las 18 llamadas por this.escena y borrar el puente.
 *
 *   2. La linea 670 del original era este monumento al acoplamiento:
 *        this.obtenerEscenaTablero()?.scene?.settings?.data?.controlador?.controladorTurnos
 *      Cinco saltos entre dos escenas para encontrar el controlador de turnos.
 *      Ahora eso se resuelve con el emisor de eventos (regla 2 del contrato).
 *
 *   3. Los metodos de seleccion de objetivo ya no viven aqui: se han movido a
 *      datosDePotestades/utilidadesDeSeleccion.js como funciones puras. Los
 *      que quedan abajo son delegaciones de una linea, marcadas, para no
 *      romper el rescate. Hay que borrarlas y llamar directo a la utilidad.
 *
 *   4. La mecanica de habilidad tipo 1 llega desde controladorJugada; vive
 *      ahora en seleccionTipo1.js, en esta misma carpeta.
 *
 * Rescatado de: ui/Entidades/Aliados.js (borrado).
 *
 * ESTADO: rescate sin adaptar. Revisar entero contra el spect 005.
 */

import { ASSETS, ORBE_BASE_FRAME } from '../panelEntidad/panelEntidadConfig.js';
import {
  normalizarCasoSeleccion,
  normalizarBandosObjetivo,
  obtenerRangoAccion,
  estaDentroDeRango,
  casillaEstaOcupada,
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

export default class SistemaDeOrbes {
  /**
   * @param {object} data - fila de la potestad tal cual viene del molde.
   * @param {Phaser.Scene} escena - la escena del mundo (PhaserMaster).
   * @param {Phaser.Events.EventEmitter} eventos - emisor de PhaserMaster.
   */
  constructor(data, escena, eventos) {
    this.data = data;
    this.escena = escena;
    this.eventos = eventos;
    // Puente del rescate: el codigo de abajo todavia lee sceneEntidad en tres
    // sitios para sacar las listas de vivos. El spect 005 lo sustituye por el
    // registro de IndexDePotestades.
    this.sceneEntidad = escena;
    this.pilaDetareas = null;
    this.aliadoEspecifico = null;
    this.entidadAliada = null;
    this.acciones = [[], [], []];
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
  }

  /**
   * PUENTE DEL RESCATE. El original hacia scene.get('tablero') aqui, y el
   * resto del archivo llamaba a este metodo 18 veces. Ahora devuelve la escena
   * inyectada, asi que el rescate sigue funcionando sin tocar los 18 sitios.
   * El spect 005 debe sustituirlos por this.escena y borrar este metodo.
   */
  obtenerEscenaTablero() {
    return this.escena;
  }

  // MIGRADO: iniciarAliado (original lineas 52-71) se ha ido a
  // administradorTablero/PotestadesTablero.js. Crear el sprite y colocarlo en
  // su casilla es aritmetica de tablero, no trabajo del menu de acciones.

  _detenerSeguimientoOrbes() {
    const tablero = this.obtenerEscenaTablero();
    if (this._updateOrbesHandler && tablero?.events) {
      tablero.events.off('update', this._updateOrbesHandler);
    }
    this._updateOrbesHandler = null;
  }

  _calcularObjetivosOrbes() {
    const sprite = this.aliadoEspecifico?.sprite;
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

  _resolverEntidadAliada(entidadAliada) {
    if (entidadAliada) return entidadAliada;
    return this.sceneEntidad?.aliados?.find((aliado) => (
      aliado?.aliadoEspecifico === this.aliadoEspecifico ||
      aliado?.data?.id === this.data?.id
    )) ?? null;
  }

  _obtenerCategoriasPrincipales() {
    return [
      { tipo: 'principal', clave: 'movimiento', nombre: 'MOVIMIENTO', indiceAcciones: 2, color: 0x8be66f },
      { tipo: 'principal', clave: 'habilidades', nombre: 'HABILIDAD', indiceAcciones: 0, color: 0x7ed4ff },
      { tipo: 'principal', clave: 'objetos', nombre: 'OBJETO', indiceAcciones: 1, color: 0xf5d36a },
    ];
  }

  _obtenerCategoriaActual() {
    return this._obtenerCategoriasPrincipales().find((categoria) => categoria.clave === this._cadenaActual) ?? null;
  }

  _obtenerElementosCadenaActual() {
    if (this._cadenaActual === 'principal') {
      return this._obtenerCategoriasPrincipales();
    }

    const categoria = this._obtenerCategoriaActual();
    const acciones = this.acciones?.[categoria?.indiceAcciones] ?? [];
    return acciones.map((accion, indiceAccion) => ({
      tipo: 'accion',
      nombre: accion.nombre ?? `ACCION ${indiceAccion + 1}`,
      accion,
      indiceAccion,
      color: accion.condicional === false ? 0x7a7a7a : 0x7ed4ff,
    }));
  }

  _obtenerElementosVisibles() {
    return this._obtenerElementosCadenaActual().slice(this._offsetCadena, this._offsetCadena + 3);
  }

  _limpiarReferenciasOrbesAcciones() {
    this.acciones.flat().forEach((accion) => {
      if (accion) accion.orbePhaser = null;
    });
  }

  /**
   * Subacción: orbe redondo marrón (frame 667 de Base.png) con el icono de la
   * acción (campo `ruta`) encima. Sin etiqueta de texto.
   */
  _crearOrbeSubaccion(tablero, meta, centro, radio) {
    const cont = tablero.add.container(centro.x, centro.y);

    const base = tablero.add.image(0, 0, ASSETS.base.clave, ORBE_BASE_FRAME);
    base.setOrigin(0.5);
    base.setDisplaySize(radio * 2.4, radio * 2.4);
    cont.add(base);

    const ruta = meta?.accion?.ruta;
    if (ruta) {
      const clave = claveIconoAccion(ruta);
      const colocarIcono = () => {
        if (!cont.active || !tablero.textures.exists(clave)) return;
        const icono = tablero.add.image(0, 0, clave);
        icono.setOrigin(0.5);
        icono.setDisplaySize(radio * 1.3, radio * 1.3);
        cont.add(icono);
      };
      if (tablero.textures.exists(clave)) {
        colocarIcono();
      } else {
        tablero.load.image(clave, rutaIconoNormalizada(ruta));
        tablero.load.once('complete', colocarIcono);
        if (!tablero.load.isLoading()) tablero.load.start();
      }
    }

    // Círculo invisible: hitbox alineada al orbe visible (Phaser usa el radio
    // del círculo y escala con el contenedor padre).
    const hit = tablero.add.circle(0, 0, radio * 1.05, 0xffffff, 0.001);
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
    const tablero = this.obtenerEscenaTablero();
    if (!tablero || !objetivos) return;

    let orbe;
    if (meta.tipo === 'accion') {
      orbe = this._crearOrbeSubaccion(tablero, meta, objetivos.centro, objetivos.radio);
    } else {
      orbe = tablero.add.circle(objetivos.centro.x, objetivos.centro.y, objetivos.radio, meta.color, 0.9);
      orbe.setStrokeStyle(3, 0xffffff, 0.9);
      orbe.setInteractive({ useHandCursor: true });
    }

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

    if (meta.accion) {
      meta.accion.orbePhaser = orbe;
    }

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
    const tablero = this.obtenerEscenaTablero();
    const objetivos = this._calcularObjetivosOrbes();
    if (!tablero || !objetivos || this.orbesSeleccion.length === 0) return;

    this.orbesSeleccion.forEach((entrada, indice) => {
      const { orbe } = entrada;
      const destino = objetivos.posiciones[indice];
      const origen = direccion === 0
        ? objetivos.centro
        : { x: destino.x, y: destino.y + direccion * 70 };

      orbe.setPosition(origen.x, origen.y);
      tablero.tweens.killTweensOf(orbe);
      tablero.tweens.add({
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
    const tablero = this.obtenerEscenaTablero();
    if (!tablero || this.orbesSeleccion.length === 0) return;

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
    tablero.events.on('update', this._updateOrbesHandler);
  }

  _animarSalidaOrbes(onComplete = null) {
    const tablero = this.obtenerEscenaTablero();
    const objetivos = this._calcularObjetivosOrbes();
    if (!tablero || !objetivos || this.orbesSeleccion.length === 0) {
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

      tablero.tweens.killTweensOf(orbe);
      tablero.tweens.add({
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
    const tablero = this.obtenerEscenaTablero();

    this.orbesSeleccion.forEach(({ orbe, etiqueta }) => {
      if (orbe?.active) {
        tablero?.tweens?.killTweensOf(orbe);
        orbe.destroy();
      }
      etiqueta?.destroy();
    });
    this.orbesSeleccion = [];

    // Destruye cualquier orbe huérfano aún referenciado en acciones.
    this.acciones.flat().forEach((accion) => {
      const orbe = accion?.orbePhaser;
      if (orbe?.active) {
        tablero?.tweens?.killTweensOf(orbe);
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
    const tablero = this.obtenerEscenaTablero();
    const objetivos = this._calcularObjetivosOrbes();
    if (!tablero || !objetivos || this._transicionandoOrbes) return;

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
      tablero.tweens.killTweensOf(entrada.orbe);
      tablero.tweens.add({
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
      tablero.tweens.killTweensOf(entrada.orbe);
      tablero.tweens.add({
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
    if (this._transicionandoOrbes) return;

    if (meta.tipo === 'principal') {
      this._mostrarCadena(meta.clave, 0, 0);
      return;
    }

    if (meta.accion?.condicional === false) {
      this._animacionRechazoEntidad();
      return;
    }

    const nuevaTarea = {
      accion: meta.accion,
      aliado: this.aliadoEspecifico,
      entidad: this.entidadAliada,
      objetivo: null,
      objetivoEntidad: null,
    };
    this._iniciarSeleccionObjetivo(nuevaTarea);
  }

  /** Tiñe de rojo y hace tiritar al personaje para indicar que la accion no es posible. */
  _animacionRechazoEntidad() {
    const sprite = this.aliadoEspecifico?.sprite;
    const tablero = this.obtenerEscenaTablero();
    if (!sprite?.active || !tablero) return;

    tablero.tweens?.killTweensOf(sprite);
    const xPrev = sprite.x;
    const tintePrevio = sprite.tintTopLeft;
    sprite.setTint(0xff0000);

    tablero.tweens.add({
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

  // ─── MIGRADO a datosDePotestades/utilidadesDeSeleccion.js ──────────────────
  // Estas cinco eran ~55 lineas de razonamiento puro (que objetivos valen para
  // esta accion) metidas dentro de un archivo de interfaz. Ya no tienen cuerpo:
  // delegan en las funciones puras. El spect 005 debe borrar estas
  // delegaciones y llamar directamente a la utilidad importada.

  _normalizarCasoSeleccion(casoDeEleccion) {
    return normalizarCasoSeleccion(casoDeEleccion);
  }

  _normalizarBandosObjetivo(casoDeEleccion) {
    return normalizarBandosObjetivo(casoDeEleccion);
  }

  _obtenerRangoAccion(accion) {
    return obtenerRangoAccion(accion);
  }

  _obtenerPosicionEntidad(entidad) {
    return entidad?.data?.posicion ?? entidad?.datos?.posicion ?? null;
  }

  _estaDentroDeRango(posicionDestino, rango, entidadOrigen = this.entidadAliada) {
    return estaDentroDeRango(this._obtenerPosicionEntidad(entidadOrigen), posicionDestino, rango);
  }

  _obtenerCandidatosObjetivo(bandos, rango = Infinity, entidadOrigen = this.entidadAliada) {
    const candidatos = [];
    const incluirAliados = bandos.includes('Aliados');
    const incluirEnemigos = bandos.includes('Enemigos');

    if (incluirAliados) {
      (this.sceneEntidad?.aliados ?? []).forEach((entidad) => {
        const especifico = entidad?.aliadoEspecifico;
        if (especifico?.sprite?.active) {
          candidatos.push({ bando: 'Aliados', entidad, especifico, sprite: especifico.sprite });
        }
      });
    }

    if (incluirEnemigos) {
      (this.sceneEntidad?.enemigos ?? []).forEach((entidad) => {
        const especifico = entidad?.enemigoEspecifico;
        if (especifico?.sprite?.active) {
          candidatos.push({ bando: 'Enemigos', entidad, especifico, sprite: especifico.sprite });
        }
      });
    }

    return candidatos.filter((candidato) =>
      this._estaDentroDeRango(this._obtenerPosicionEntidad(candidato.entidad), rango, entidadOrigen)
    );
  }

  _casillaEstaOcupada(casilla) {
    return casillaEstaOcupada(casilla);
  }

  _obtenerCandidatosCasilla(rango = Infinity, accion = null, entidadOrigen = this.entidadAliada) {
    const tablero = this.obtenerEscenaTablero();
    const tableroData = tablero?.tableroData ?? this.sceneEntidad?.arrayBidimencional ?? [];
    const permitirOcupada = accion?.permiteCasillaOcupada === true;
    const candidatos = [];

    tableroData.forEach((fila, y) => {
      fila.forEach((casilla, x) => {
        if (!casilla || casilla.id === 0 || !casilla.casillaPhaser) return;
        if (!permitirOcupada && this._casillaEstaOcupada(casilla)) return;
        const posicion = { x: x + 1, y: y + 1 };
        if (!this._estaDentroDeRango(posicion, rango, entidadOrigen)) return;
        candidatos.push({ casilla, col: posicion.x, fila: posicion.y });
      });
    });

    return candidatos;
  }

  /**
   * EL PEOR ACOPLAMIENTO DEL CODIGO VIEJO, conservado aqui como recordatorio.
   * El original era esta linea:
   *   this.obtenerEscenaTablero()?.scene?.settings?.data?.controlador?.controladorTurnos
   * Cinco saltos encadenados entre dos escenas para encontrar el controlador de
   * turnos. Si cualquiera de los cinco fallaba, la accion se perdia en silencio.
   *
   * El spect 005 lo borra: registrar una accion pasa a ser
   * `this.eventos.emit('accionElegida', tarea)` y PhaserMaster la recoge.
   */
  _obtenerControladorJugada() {
    return this.sceneEntidad?.controladorTurnos ?? null;
  }

  _iniciarSeleccionObjetivo(nuevaTarea) {
    const casoDeEleccion = nuevaTarea.accion?.casoDeElección ?? nuevaTarea.accion?.casoDeEleccion;
    const casoSeleccion = this._normalizarCasoSeleccion(casoDeEleccion);
    const rango = this._obtenerRangoAccion(nuevaTarea.accion);

    if (casoSeleccion.tipo === 'automatico') {
      this.objetivoSeleccionado = null;
      this._finalizarSeleccionObjetivo(nuevaTarea, null);
      return;
    }

    if (casoSeleccion.tipo === 'posterior') {
      nuevaTarea.seleccionPosterior = {
        bandos: casoSeleccion.bandos,
        rango,
      };
      this._finalizarSeleccionObjetivo(nuevaTarea, null);
      return;
    }

    if (casoSeleccion.tipo === 'casilla') {
      const casillas = this._obtenerCandidatosCasilla(rango, nuevaTarea.accion, nuevaTarea.entidad);
      if (casillas.length === 0) {
        console.warn('No hay casillas validas en rango para la accion', nuevaTarea.accion);
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

    const candidatos = this._obtenerCandidatosObjetivo(casoSeleccion.bandos, rango, nuevaTarea.entidad);
    if (candidatos.length === 0) {
      console.warn('No hay objetivos validos para la accion', nuevaTarea.accion);
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
    const tablero = this.obtenerEscenaTablero();
    if (!tablero) return;

    candidatos.forEach((candidato) => {
      const tintePrevio = candidato.sprite.tintTopLeft;
      const alphaPrevio = candidato.sprite.alpha;
      candidato.sprite.setTint(candidato.bando === 'Aliados' ? 0x8be66f : 0xff6b6b);
      tablero.tweens.add({
        targets: candidato.sprite,
        alpha: 0.45,
        duration: 520,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
      this._restauradoresBrilloObjetivo.push(() => {
        tablero.tweens?.killTweensOf(candidato.sprite);
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
    const tablero = this.obtenerEscenaTablero();
    if (!tablero) return;

    casillas.forEach(({ casilla, col, fila }) => {
      const base = casilla.casillaPhaser;
      if (!base?.active) return;

      // En vez de tintar la casilla original (lo que la hace parecer otra),
      // superponemos una marca translucida que pulsa: la casilla se ilumina y se
      // desvanece, pero el suelo original sigue visible debajo (no parece otra).
      const ancho = base.displayWidth || (base.width * (base.scaleX ?? 1)) || 1;
      const alto = base.displayHeight || (base.height * (base.scaleY ?? 1)) || 1;
      const cx = base.x + ancho * (0.5 - (base.originX ?? 0));
      const cy = base.y + alto * (0.5 - (base.originY ?? 0));

      const brillo = tablero.add.rectangle(cx, cy, ancho, alto, 0xffe066);
      brillo.setDepth((base.depth ?? 0) + 1);
      brillo.setAlpha(0.25);
      brillo.setInteractive({ useHandCursor: true });

      tablero.tweens.add({
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
    const tablero = this.obtenerEscenaTablero();
    if (!tablero?.input?.keyboard || this._keydownObjetivoHandler) return;

    this._keydownObjetivoHandler = (event) => {
      if (event.code !== 'Escape' && event.code !== 'ArrowLeft' && event.code !== 'KeyA') return;
      event.preventDefault?.();
      this._limpiarSeleccionObjetivo();
      this._mostrarCadena(this._cadenaActual, this._offsetCadena, 0, false);
    };
    tablero.input.keyboard.on('keydown', this._keydownObjetivoHandler);
  }

  _limpiarSeleccionObjetivo(limpiarTarea = true) {
    const tablero = this.obtenerEscenaTablero();

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
      tablero?.tweens?.killTweensOf(marca);
      marca?.destroy();
    });
    this.marcasObjetivo = [];

    if (this._keydownObjetivoHandler && tablero?.input?.keyboard) {
      tablero.input.keyboard.off('keydown', this._keydownObjetivoHandler);
    }
    this._keydownObjetivoHandler = null;

    if (limpiarTarea) {
      this.tareaPendienteObjetivo = null;
    }
  }

  _finalizarSeleccionCasilla(nuevaTarea, candidato) {
    if (!nuevaTarea) return;

    const coordenadas = candidato
      ? { x: candidato.col, y: candidato.fila }
      : null;

    nuevaTarea.objetivo = null;
    nuevaTarea.objetivoEntidad = null;
    nuevaTarea.bandoObjetivo = null;
    nuevaTarea.casillaObjetivo = coordenadas;
    nuevaTarea.coordenadasObjetivo = coordenadas;
    this._limpiarSeleccionObjetivo();

    const Entidades = [this.sceneEntidad?.aliados, this.sceneEntidad?.enemigos];
    const controladorJugada = this._obtenerControladorJugada();
    if (controladorJugada?.actualizarPilaDetareas) {
      const ok = controladorJugada.actualizarPilaDetareas(nuevaTarea, Entidades);
      if (!ok) {
        console.warn('No se pudo registrar la acción de casilla.');
        return;
      }
      if (this._estaSeleccionado) {
        this._mostrarCadena(this._cadenaActual, this._offsetCadena, 0, false);
      }
      return;
    }

    console.warn('No se pudo registrar la tarea de casilla', nuevaTarea);
  }

  _finalizarSeleccionObjetivo(nuevaTarea, candidato) {
    if (!nuevaTarea) return;

    this.objetivoSeleccionado = candidato?.especifico ?? null;
    nuevaTarea.objetivo = this.objetivoSeleccionado;
    nuevaTarea.objetivoEntidad = candidato?.entidad ?? null;
    nuevaTarea.bandoObjetivo = candidato?.bando ?? null;
    this._limpiarSeleccionObjetivo();
    const Entidades = [this.sceneEntidad?.aliados, this.sceneEntidad?.enemigos];
    const controladorJugada = this._obtenerControladorJugada();
    if (controladorJugada?.actualizarPilaDetareas) {
      const ok = controladorJugada.actualizarPilaDetareas(nuevaTarea, Entidades);
      if (!ok) {
        console.warn('No se pudo registrar la acción (accionismo agotado sin acción previa).');
        return;
      }
      if (this._estaSeleccionado) {
        this._mostrarCadena(this._cadenaActual, this._offsetCadena, 0, false);
      }
      return;
    }

    if (this.pilaDetareas?.set) {
      this.pilaDetareas.set(this.entidadAliada ?? this.aliadoEspecifico, nuevaTarea);
      return;
    }

    console.warn('No se pudo registrar la tarea seleccionada', nuevaTarea);
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
    const tablero = this.obtenerEscenaTablero();
    if (!tablero?.input?.keyboard || this._keydownOrbesHandler) return;

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

    tablero.input.keyboard.on('keydown', this._keydownOrbesHandler);
  }

  _detenerInputsNavegacion() {
    const tablero = this.obtenerEscenaTablero();
    if (this._keydownOrbesHandler && tablero?.input?.keyboard) {
      tablero.input.keyboard.off('keydown', this._keydownOrbesHandler);
    }
    this._keydownOrbesHandler = null;
  }

  _crearFlechaNavegacion(tipo, posicion, activa = true) {
    const tablero = this.obtenerEscenaTablero();
    if (!tablero) return null;

    const puntos = tipo === 'arriba'
      ? [0, 28, 22, 0, 44, 28]
      : [0, 0, 44, 0, 22, 28];
    const flecha = tablero.add.triangle(posicion.x, posicion.y, ...puntos, 0xffffff, activa ? 0.9 : 0.25);
    flecha.tipoNavegacion = tipo;
    flecha.setDepth(22);
    flecha.setOrigin(0.5);
    flecha.setInteractive({ useHandCursor: activa });
    flecha.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
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

  onSeleccionar(aliadoEspecifico, pilaDetareas, entidadAliada = null) {
    if (this._estaSeleccionado && this.aliadoEspecifico === aliadoEspecifico) {
      this.onDeseleccionar();
      return false;
    }

    this.pilaDetareas = pilaDetareas;
    this.aliadoEspecifico = aliadoEspecifico;
    if (!this.aliadoEspecifico) return false;
    this.aliadoEspecifico.propiedadesEspeciales(this.aliadoEspecifico);
    this.entidadAliada = this._resolverEntidadAliada(entidadAliada);
    this.acciones = this.entidadAliada?.acciones ?? [[], [], []];

    this._estaSeleccionado = true;
    this._transicionandoOrbes = false;
    this._registrarInputsNavegacion();
    this._mostrarCadena('principal', 0, 0, false);
    return true;
  }

  onDeseleccionar() {
    if (!this._estaSeleccionado) return;
    this._estaSeleccionado = false;
    this._transicionandoOrbes = false;
    this._detenerInputsNavegacion();
    this._limpiarSeleccionObjetivo();
    this._destruirOrbes();
    this._destruirFlechasNavegacion();
    this._cadenaActual = 'principal';
    this._offsetCadena = 0;
  }

  // MIGRADO: obtenerDatosDetalle, aItems y construirDatosDetalle (original
  // lineas 1053-1099) se han ido a datosDePotestades/IndexDePotestades.js como
  // adaptarParaPanel. Dar forma a los datos para el panel no es trabajo del
  // menu de orbes, y ademas Enemigos.js importaba construirDatosDetalle desde
  // aqui, que era el archivo de los aliados.
}
