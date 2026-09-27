/**
 * seleccionTipo1.js — Interfaz de las acciones que dependen del rival.
 *
 * SPECT: docs/spects/spect005.md
 *
 * QUE SERA: cuando una potestad elige una accion de acciones/directoConfig1.js
 * (escudar, retirada), el juego ya sabe que le viene encima al jugador. Este
 * archivo lo ensena y espera a que elija: oscurece el tablero, hace parpadear
 * en azul a los candidatos, marca con particulas rojas a los que tienen un
 * proyectil apuntandoles, y al pasar el cursor muestra que les va a caer.
 *
 * POR QUE ESTA EN sistemaDeOrbes Y NO EN guionSincrono: es una interaccion de
 * seleccion, la misma familia que marcar objetivos en el tablero. En el codigo
 * viejo estaban 250 lineas de tweens y particulas metidas dentro del
 * controlador de turnos, que es logica pura.
 *
 * Rescatado de: classes/battle/controladorJugada.js lineas 288-555 (borrado).
 *
 * ESTADO: rescate adaptado. El original leia todo de escenas que buscaba a
 * mano; aqui la escena y los candidatos entran por parametro. Revisar contra
 * el spect 005.
 */

import { amenazasPorAliado } from '../datosDePotestades/utilidadesDeSeleccion.js';

// ─── RESCATE: controladorJugada.js lineas 288-304. Adaptado. ─────────────────
// Congelar las animaciones mientras el jugador decide. Devuelve la funcion que
// las reanuda, para no tener que llevar la lista por fuera.

export function pausarAnimaciones(sprites) {
  const pausadas = [];
  (sprites ?? []).forEach((sprite) => {
    if (sprite?.anims?.isPlaying) {
      sprite.anims.pause();
      pausadas.push(sprite);
    }
  });
  return () => pausadas.forEach((sprite) => sprite?.anims?.resume?.());
}

// ─── RESCATE: controladorJugada.js lineas 354-363. Sirve tal cual. ───────────
// La particula se genera en memoria en vez de cargar un PNG.

export function asegurarTexturaParticula(escena) {
  const clave = 'particulaProyectilTipo1';
  if (escena.textures.exists(clave)) return clave;
  const grafico = escena.add.graphics();
  grafico.fillStyle(0xffffff, 1);
  grafico.fillCircle(10, 10, 10);
  grafico.generateTexture(clave, 20, 20);
  grafico.destroy();
  return clave;
}

// ─── RESCATE: controladorJugada.js lineas 365-391. Sirve tal cual. ───────────
// Parpadeo tintado. Devuelve el restaurador para dejar el sprite como estaba;
// sin el, el tinte se quedaba pegado al cancelar la seleccion.

export function crearParpadeo(escena, sprite, color) {
  if (!sprite?.active) return null;

  const tintePrevio = sprite.tintTopLeft;
  const alphaPrevio = sprite.alpha;
  sprite.setTint(color);

  const tween = escena.tweens.add({
    targets: sprite,
    alpha: 0.45,
    duration: 420,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });

  return () => {
    escena.tweens?.killTweensOf(sprite);
    sprite.setAlpha(alphaPrevio ?? 1);
    if (tintePrevio != null && tintePrevio !== 0xffffff) sprite.setTint(tintePrevio);
    else sprite.clearTint();
    tween?.remove?.();
  };
}

// ─── RESCATE: controladorJugada.js lineas 307-321. Sirve tal cual. ───────────
// scrollFactor 0 fijado a camara: si no, el tooltip cambia de tamano con el
// zoom del tablero y se vuelve ilegible.

export function crearTooltip(escena) {
  const tooltip = escena.add.text(0, 0, '', {
    fontFamily: 'monospace',
    fontSize: '32px',
    color: '#ffffff',
    backgroundColor: '#000000cc',
    padding: { x: 14, y: 10 },
    align: 'left',
  });
  tooltip.setScrollFactor(0);
  tooltip.setDepth(1002);
  tooltip.setVisible(false);
  return tooltip;
}

// ─── RESCATE: controladorJugada.js lineas 337-352. Adaptado. ─────────────────
// Agrupa las acciones pendientes por objetivo para que el tooltip diga
// "atacar: 2" en vez de listar la misma linea dos veces.

export function resumirAmenazas(acccionesPendientes) {
  const resumen = new Map();
  (acccionesPendientes ?? []).forEach((pendiente) => {
    if (pendiente.cancelada) return;
    const id = pendiente.idObjetivo;
    if (id == null) return;
    if (!resumen.has(id)) resumen.set(id, new Map());
    const cuenta = resumen.get(id);
    const nombre = pendiente.nombreAccion ?? 'Accion';
    cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + 1);
  });
  return resumen;
}

const COLOR_AZUL = 0x4da3ff;
const COLOR_ROJO = 0xff4d4d;
const DEPTH_FILTRO = 900;
const DEPTH_ETIQUETA = 1001;

function filasDeConfigRival(configuracionRival) {
  if (Array.isArray(configuracionRival)) return configuracionRival;
  if (Array.isArray(configuracionRival?.configuracion)) return configuracionRival.configuracion;
  return [];
}

function entradaPorId(potestades, id) {
  const clave = id == null ? null : String(id);
  return (potestades ?? []).find((entrada) => (
    String(entrada.potestad?.id) === clave
    || String(entrada.potestad?.datos?.id) === clave
  )) ?? null;
}

function textoObjetivo(objetivo, potestades) {
  if (objetivo == null) return '';
  if (typeof objetivo === 'object' && Number.isFinite(Number(objetivo.x))) {
    return `(${Number(objetivo.x)}, ${Number(objetivo.y)})`;
  }
  const id = typeof objetivo === 'object' ? (objetivo.id ?? objetivo.potestadId) : objetivo;
  const entrada = entradaPorId(potestades, id);
  return entrada?.potestad?.arquetipo ?? String(id ?? '');
}

function estiloDeJugada(accion, nombre) {
  const tipo = String(accion?.type ?? accion?.tipo ?? '').toLowerCase();
  const n = String(nombre ?? accion?.nombre ?? '').toLowerCase();
  const esAtaque = tipo.includes('enemigo')
    || ['atacar', 'disparar', 'maldicion', 'rayo de magia'].includes(n);
  const esCasilla = tipo.includes('casilla')
    || n.includes('movilidad')
    || n === 'moverse'
    || n === 'poner trampa';
  if (esAtaque) return { color: '#ff6b6b', backgroundColor: '#3a0000ee' };
  if (esCasilla) return { color: '#8be66f', backgroundColor: '#0a2a00ee' };
  return { color: '#f5d68a', backgroundColor: '#2a1e00ee' };
}

function buscarAccion(potestad, nombre) {
  return Object.values(potestad?.listaDeAcciones ?? {})
    .flat()
    .find((accion) => accion?.nombre === nombre) ?? null;
}

function aplicarFiltroCamara(escena) {
  const cam = escena?.cameras?.main;
  if (!cam?.postFX?.addColorMatrix) return () => {};
  let fx = null;
  try {
    fx = cam.postFX.addColorMatrix();
    fx.grayscale?.(0.75);
  } catch {
    return () => {};
  }
  return () => {
    try { cam.postFX?.remove?.(fx); } catch { /* ya destruida */ }
  };
}

function crearOverlay(escena) {
  const cam = escena.cameras.main;
  const overlay = escena.add.rectangle(
    cam.width / 2,
    cam.height / 2,
    cam.width,
    cam.height,
    0x1a1a1a,
    0.48,
  );
  overlay.setScrollFactor(0);
  overlay.setDepth(DEPTH_FILTRO);
  overlay.setOrigin(0.5);
  const sync = () => {
    if (!overlay.active) return;
    const c = escena.cameras.main;
    overlay.setPosition(c.width / 2, c.height / 2);
    overlay.setSize(c.width, c.height);
    overlay.setDisplaySize(c.width, c.height);
  };
  escena.events.on('update', sync);
  return {
    nodo: overlay,
    soltar: () => {
      escena.events.off('update', sync);
      overlay.destroy?.();
    },
  };
}

function crearEtiquetasRival(escena, configuracionRival, potestades) {
  const nodos = [];
  filasDeConfigRival(configuracionRival).forEach((fila) => {
    const entrada = entradaPorId(potestades, fila.id);
    if (entrada?.bando !== 'Enemigos') return;
    const sprite = entrada.potestad?.sprite;
    if (!sprite?.active) return;
    const nombre = fila.nombreDeAccion ?? fila.nombre ?? '';
    const accion = buscarAccion(entrada.potestad, nombre);
    const dest = textoObjetivo(fila.objetivo, potestades);
    const texto = dest ? `${nombre}\n${dest}` : String(nombre);
    const estilo = estiloDeJugada(accion, nombre);
    const alto = sprite.displayHeight ?? sprite.height ?? 0;
    const etiqueta = escena.add.text(sprite.x, sprite.y - alto * 0.55, texto.toUpperCase(), {
      fontFamily: 'Impact, Arial Black, Arial',
      fontSize: '42px',
      color: estilo.color,
      backgroundColor: estilo.backgroundColor,
      padding: { x: 16, y: 8 },
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
    });
    etiqueta.setOrigin(0.5, 1);
    etiqueta.setDepth(DEPTH_ETIQUETA);
    const sync = () => {
      if (!etiqueta.active || !sprite.active) return;
      const h = sprite.displayHeight ?? sprite.height ?? 0;
      etiqueta.setPosition(sprite.x, sprite.y - h * 0.55);
    };
    escena.events.on('update', sync);
    nodos.push({
      nodo: etiqueta,
      soltar: () => {
        escena.events.off('update', sync);
        etiqueta.destroy?.();
      },
    });
  });
  return nodos;
}

function limpiarAuras(sesion) {
  (sesion.restaurarAuras ?? []).forEach((fn) => { try { fn?.(); } catch { /* sprite muerto */ } });
  sesion.restaurarAuras = [];
  (sesion.handlers ?? []).forEach(({ sprite, handler }) => {
    sprite?.off?.('pointerdown', handler);
  });
  sesion.handlers = [];
  (sesion.contadores ?? []).forEach((nodo) => nodo?.destroy?.());
  sesion.contadores = [];
}

/**
 * Monta filtro gris + etiquetas grandes. Se queda hasta cerrarSeleccionTipo1.
 */
export function abrirSesionTipo1(escena, { configuracionRival, potestades, tablero } = {}) {
  if (!escena?.add) return null;
  const overlay = crearOverlay(escena);
  const etiquetas = crearEtiquetasRival(escena, configuracionRival, potestades);
  const restaurarCamara = aplicarFiltroCamara(escena);
  const sesion = {
    escena,
    overlay,
    etiquetas,
    restaurarCamara,
    restaurarAuras: [],
    handlers: [],
    contadores: [],
    configuracionRival,
    potestades,
    tablero,
    keyHandler: null,
    shutdownHandler: null,
    cerrada: false,
    _resolverPaso: null,
  };
  sesion.shutdownHandler = () => cerrarSeleccionTipo1(sesion);
  escena.events.once('shutdown', sesion.shutdownHandler);
  escena.events.once('destroy', sesion.shutdownHandler);
  return sesion;
}

/**
 * Aura azul en el defensor, parpadeo rojo en amenazados. Clic o Escape.
 * @returns {Promise<string|number|null>}
 */
export function pintarPasoTipo1(sesion, { defensor, candidatos } = {}) {
  if (!sesion || sesion.cerrada) return Promise.resolve(null);
  const escena = sesion.escena;
  limpiarAuras(sesion);

  const azul = crearParpadeo(escena, defensor?.sprite, COLOR_AZUL);
  if (azul) sesion.restaurarAuras.push(azul);

  return new Promise((resolve) => {
    let resuelto = false;
    const terminar = (valor) => {
      if (resuelto) return;
      resuelto = true;
      sesion._resolverPaso = null;
      if (sesion.keyHandler && escena.input?.keyboard) {
        escena.input.keyboard.off('keydown', sesion.keyHandler);
      }
      sesion.keyHandler = null;
      limpiarAuras(sesion);
      resolve(valor);
    };
    sesion._resolverPaso = terminar;

    sesion.keyHandler = (event) => {
      if (event.code !== 'Escape') return;
      event.preventDefault?.();
      terminar(null);
    };
    escena.input?.keyboard?.on('keydown', sesion.keyHandler);

    const amenazas = amenazasPorAliado(
      sesion.configuracionRival,
      sesion.potestades,
      sesion.tablero,
    );

    (candidatos ?? []).forEach((entrada) => {
      const potestad = entrada.potestad ?? entrada;
      const sprite = potestad?.sprite;
      if (!sprite?.active) return;
      if (String(potestad?.id) === String(defensor?.id)) return;
      const rojo = crearParpadeo(escena, sprite, COLOR_ROJO);
      if (rojo) sesion.restaurarAuras.push(rojo);
      const cuenta = amenazas.get(String(potestad.id));
      if (cuenta?.total > 0) {
        const lineas = [`×${cuenta.total}`];
        cuenta.porNombre.forEach((n, nombre) => {
          lineas.push(n > 1 ? `${nombre} ×${n}` : nombre);
        });
        const alto = sprite.displayHeight ?? sprite.height ?? 0;
        const badge = escena.add.text(sprite.x, sprite.y + alto * 0.52, lineas.join('\n'), {
          fontFamily: 'Impact, Arial Black, Arial',
          fontSize: '36px',
          color: '#ff6b6b',
          backgroundColor: '#3a0000ee',
          padding: { x: 12, y: 6 },
          align: 'center',
          stroke: '#000000',
          strokeThickness: 3,
        });
        badge.setOrigin(0.5, 0);
        badge.setDepth(DEPTH_ETIQUETA);
        sesion.contadores.push(badge);
      }
      sprite.setInteractive?.({ useHandCursor: true });
      const handler = (pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        terminar(potestad.id ?? null);
      };
      sprite.on('pointerdown', handler);
      sesion.handlers.push({ sprite, handler });
    });
  });
}

export function cerrarSeleccionTipo1(sesion) {
  if (!sesion || sesion.cerrada) return;
  sesion.cerrada = true;
  sesion._resolverPaso?.(null);
  sesion._resolverPaso = null;
  const escena = sesion.escena;
  if (sesion.shutdownHandler && escena?.events) {
    escena.events.off('shutdown', sesion.shutdownHandler);
    escena.events.off('destroy', sesion.shutdownHandler);
  }
  sesion.shutdownHandler = null;
  if (sesion.keyHandler && escena?.input?.keyboard) {
    escena.input.keyboard.off('keydown', sesion.keyHandler);
  }
  sesion.keyHandler = null;
  limpiarAuras(sesion);
  sesion.etiquetas?.forEach((e) => e.soltar?.());
  sesion.etiquetas = [];
  sesion.overlay?.soltar?.();
  sesion.overlay = null;
  try { sesion.restaurarCamara?.(); } catch { /* camara ya muerta */ }
  sesion.restaurarCamara = null;
}

/**
 * Un paso suelto (abre, espera, cierra). La cola de PhaserMaster usa la sesion.
 */
export function mostrarSeleccionTipo1(escena, opciones = {}) {
  const sesion = opciones.sesion
    ?? abrirSesionTipo1(escena, opciones);
  const propia = !opciones.sesion;
  return pintarPasoTipo1(sesion, opciones).finally(() => {
    if (propia && opciones.cerrar !== false) cerrarSeleccionTipo1(sesion);
  });
}
