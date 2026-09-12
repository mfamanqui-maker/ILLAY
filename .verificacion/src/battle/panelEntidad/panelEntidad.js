/**
 * Ensamblador del panel de detalle de entidad.
 *
 * Skin nuevo:
 *   - Fondo: panel.png (1700×900) escalado al tamaño del panel. Ya trae las
 *     vendas rojas, la banda de nombre, el recuadro gris de referencia y el
 *     divisor central, así que el contenido se superpone alineado por fracciones
 *     (LAYOUT en panelEntidadConfig).
 *   - Navegación: vendas rojas de las esquinas (flecha Next al hover).
 *   - Cierre: tecla Esc o clic fuera del panel (velo). No hay botón X.
 *
 * `opciones` shape (igual que antes):
 *   { nombre, equipos, bando, idActual, idInicial, foto, vida,
 *     estadisticas, efectos, acciones, objetos, movimiento,
 *     onResolverEntidad, onCerrar, escenaAPausar }
 */

import {
  ASSETS,
  COLORES,
  DEPTHS,
  LAYOUT,
  PANEL,
  DESCRIPCIONES,
} from './panelEntidadConfig.js';
import { crearNombre, crearVendasNavegacion } from './partes/header.js';
import { crearLadoIzquierdo } from './partes/ladoIzquierdo.js';
import { crearSeccionEstadisticasEfectos } from './partes/seccionEstadisticasEfectos.js';
import { crearSeccionAcciones } from './partes/seccionAcciones.js';
import { registrarInputsPanel } from './partes/inputs.js';

export function precargarDescripcionesPanelEntidad(scene) {
  if (!scene?.load?.json) return;
  Object.values(DESCRIPCIONES).forEach((meta) => {
    if (!scene.cache.json.exists(meta.clave)) {
      scene.load.json(meta.clave, meta.ruta);
    }
  });
}

export function abrirPanelEntidad(scene, opciones) {
  if (scene.panelEntidadActivo) {
    scene.panelEntidadActivo.cerrar();
  }

  const cam = scene.cameras.main;
  const anchoPanel = Math.floor(cam.width * PANEL.fraccionAncho);
  const altoPanel = Math.floor(cam.height * PANEL.fraccionAlto);
  const panelX = Math.floor((cam.width - anchoPanel) / 2);
  const panelY = Math.floor((cam.height - altoPanel) / 2);

  /** Convierte una fracción de panel.png a un rect local del container. */
  const R = (f) => ({
    x: f.x * anchoPanel,
    y: f.y * altoPanel,
    ancho: f.w * anchoPanel,
    alto: f.h * altoPanel,
  });

  const escenaAPausar = opciones.escenaAPausar ?? scene.scene?.get?.('tablero') ?? null;
  if (escenaAPausar && escenaAPausar.input) {
    escenaAPausar.input.enabled = false;
  }

  const velo = scene.add.rectangle(0, 0, cam.width, cam.height, COLORES.velo, COLORES.veloAlpha);
  velo.setOrigin(0, 0);
  velo.setDepth(DEPTHS.velo);
  velo.setScrollFactor(0);
  velo.setInteractive({ useHandCursor: false });

  const container = scene.add.container(panelX, panelY);
  container.setDepth(DEPTHS.fondo);
  container.setScrollFactor(0);
  container.setSize(anchoPanel, altoPanel);

  let fondo;
  if (scene.textures.exists(ASSETS.fondo.clave)) {
    fondo = scene.add.image(0, 0, ASSETS.fondo.clave);
    fondo.setDisplaySize(anchoPanel, altoPanel);
  } else {
    fondo = scene.add.rectangle(0, 0, anchoPanel, altoPanel, COLORES.fondo, COLORES.fondoAlpha);
    fondo.setStrokeStyle(COLORES.bordeGrosor, COLORES.borde, 1);
  }
  fondo.setOrigin(0, 0);
  // El fondo absorbe los clics dentro del panel: así un clic en el área vacía
  // del panel no llega al velo (que cierra al hacer clic fuera).
  fondo.setInteractive({ useHandCursor: false });
  fondo.on('pointerdown', (pointer) => pointer.event?.stopPropagation?.());
  container.add(fondo);

  const estado = {
    idActual: opciones.idActual ?? null,
    idInicial: opciones.idInicial ?? opciones.idActual ?? null,
    bando: opciones.bando ?? 'Aliados',
    equipos: opciones.equipos ?? { Aliados: [], Enemigos: [] },
    opciones,
  };

  let inputsHandle = null;
  let header = null;
  let ladoIzq = null;
  let seccionStats = null;
  let seccionAcciones = null;
  let cerrado = false;

  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    inputsHandle?.desuscribir?.();
    seccionStats?.destruir?.();
    seccionAcciones?.destruir?.();
    seccionStats = null;
    seccionAcciones = null;
    if (escenaAPausar && escenaAPausar.input) {
      escenaAPausar.input.enabled = true;
    }
    container.destroy();
    velo.destroy();
    if (scene.panelEntidadActivo === api) {
      scene.panelEntidadActivo = null;
    }
    if (typeof opciones.onCerrar === 'function') opciones.onCerrar();
  };

  velo.on('pointerdown', () => cerrar());

  header = crearNombre(scene, {
    rect: R(LAYOUT.nombre),
    padre: container,
    nombreInicial: opciones.nombre ?? '',
  });

  crearVendasNavegacion(scene, {
    rectIzq: R(LAYOUT.vendaIzq),
    rectDer: R(LAYOUT.vendaDer),
    padre: container,
    onIzq: () => navegarMismoBando(-1),
    onDer: () => navegarMismoBando(1),
  });

  ladoIzq = crearLadoIzquierdo(scene, {
    padre: container,
    rects: {
      foto: R(LAYOUT.foto),
      barra: R(LAYOUT.barraVida),
      textoVida: R(LAYOUT.textoVida),
      botones: R(LAYOUT.botones),
      tooltip: R(LAYOUT.tooltip),
    },
    datosIniciales: {
      foto: opciones.foto,
      vida: opciones.vida,
    },
    onIrAInicial: () => irAInicial(),
    onHistorial: () => historial(),
  });

  const aplicarDatos = (datos) => {
    if (datos.equipos) estado.equipos = datos.equipos;
    estado.idActual = datos.idActual ?? datos.id ?? estado.idActual;
    estado.bando = datos.bando ?? estado.bando;
    header.fijarNombre(datos.nombre ?? '');
    ladoIzq.actualizar({ foto: datos.foto, vida: datos.vida });

    seccionStats?.destruir?.();
    seccionAcciones?.destruir?.();
    seccionStats = null;
    seccionAcciones = null;

    const rStats = R(LAYOUT.statsEfectos);
    const rAcc = R(LAYOUT.acciones);

    seccionStats = crearSeccionEstadisticasEfectos(scene, {
      x: rStats.x,
      y: rStats.y,
      ancho: rStats.ancho,
      alto: rStats.alto,
      padre: container,
      datos: {
        estadisticas: datos.estadisticas ?? [],
        efectos: datos.efectos ?? [],
      },
      tooltip: ladoIzq.tooltip,
    });

    seccionAcciones = crearSeccionAcciones(scene, {
      x: rAcc.x,
      y: rAcc.y,
      ancho: rAcc.ancho,
      alto: rAcc.alto,
      padre: container,
      datos: {
        acciones: datos.acciones ?? [],
        objetos: datos.objetos ?? [],
        movimiento: datos.movimiento ?? [],
      },
      tooltip: ladoIzq.tooltip,
    });
  };

  const mostrarEntidad = (id) => {
    if (id == null) return;
    if (typeof opciones.onResolverEntidad !== 'function') return;
    const nuevos = opciones.onResolverEntidad(id);
    if (!nuevos) return;
    aplicarDatos(nuevos);
  };

  function navegarMismoBando(direccion) {
    const lista = estado.equipos?.[estado.bando] ?? [];
    if (!lista.length || direccion == null) return;

    let indexActual = lista.findIndex((entidad) => entidad.id == estado.idActual);
    if (indexActual < 0) indexActual = 0;

    const nuevoIndex = indexActual + direccion;
    if (nuevoIndex < 0 || nuevoIndex >= lista.length) {
      if (direccion === -1) {
        mostrarEntidad(lista[lista.length - 1].id);
      } else {
        mostrarEntidad(lista[0].id);
      }
      return;
    }
    const elegido = lista[nuevoIndex];
    if (elegido) mostrarEntidad(elegido.id);
  }

  function irAInicial() {
    if (estado.idInicial != null) mostrarEntidad(estado.idInicial);
  }

  function historial() {
    console.log('trabajando en ello...');
  }

  const enrutarScroll = (pointer, deltaY) => {
    const px = pointer.x;
    const py = pointer.y;
    if (seccionStats?.contieneCoordenadas(px, py)) {
      seccionStats.desplazar(px, py, -deltaY * 0.6);
      return;
    }
    if (seccionAcciones?.contieneCoordenadas(px, py)) {
      seccionAcciones.desplazar(px, py, -deltaY * 0.6);
    }
  };

  aplicarDatos({
    idActual: estado.idActual,
    bando: estado.bando,
    nombre: opciones.nombre,
    foto: opciones.foto,
    vida: opciones.vida,
    estadisticas: opciones.estadisticas,
    efectos: opciones.efectos,
    acciones: opciones.acciones,
    objetos: opciones.objetos,
    movimiento: opciones.movimiento,
  });

  inputsHandle = registrarInputsPanel(scene, {
    cerrar,
    navegarMismoBando,
    irAInicial,
    historial,
    scroll: enrutarScroll,
  });

  const actualizar = (datos) => {
    if (datos?.equipos) estado.equipos = datos.equipos;
    if (datos?.onResolverEntidad) estado.opciones.onResolverEntidad = datos.onResolverEntidad;
    if (datos?.idInicial != null) estado.idInicial = datos.idInicial;
    aplicarDatos(datos);
  };

  const api = {
    container,
    cerrar,
    actualizar,
    mostrarEntidad,
  };

  scene.panelEntidadActivo = api;
  return api;
}
