/**
 * Texto del panel: Phaser.Text, no tesela de PNG.
 *
 * `escala` sigue siendo el contrato de las partes del panel (1.5 / 2 / 3).
 * Se traduce a un px de fuente y se pinta a 2x con filtro lineal para que
 * pixelArt no mastique las letras. El resto del juego no pasa por aqui.
 */

import { ESTILOS_TEXTO, FUENTE_UI } from './textoPixelConfig.js';

const TODOS_ESTILOS = { ...ESTILOS_TEXTO };
const ESTILO_DEFECTO = 'panel';
const canvasMedida = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const ctxMedida = canvasMedida?.getContext?.('2d') ?? null;

function resolverOrigen(origen) {
  if (origen == null) return { x: 0, y: 0 };
  if (typeof origen === 'number') return { x: origen, y: origen };
  return { x: origen.x ?? 0, y: origen.y ?? 0 };
}

function tamanoFuente(escala) {
  return Math.max(20, Math.round(14 * (escala ?? 2)));
}

function resolucionTexto() {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  return Math.max(2, Math.round(dpr || 1));
}

function cssDeEstilo(estilo, opciones = {}) {
  const tamano = tamanoFuente(opciones.escala);
  const peso = estilo.peso ?? 'bold';
  const familia = estilo.fuente ?? FUENTE_UI;
  const color = opciones.color ?? estilo.color ?? '#1a1208';
  return { tamano, peso, familia, color, css: `${peso} ${tamano}px ${familia}` };
}

function metricasDe(texto, opciones = {}) {
  const estilo = TODOS_ESTILOS[opciones.estilo ?? ESTILO_DEFECTO] ?? TODOS_ESTILOS[ESTILO_DEFECTO];
  const visual = cssDeEstilo(estilo, opciones);
  const lineas = String(texto ?? '').split('\n');
  let ancho = 0;
  if (ctxMedida) {
    ctxMedida.font = visual.css;
    lineas.forEach((linea) => {
      ancho = Math.max(ancho, ctxMedida.measureText(linea).width);
    });
  } else {
    ancho = lineas.reduce((max, linea) => Math.max(max, linea.length * visual.tamano * 0.6), 0);
  }
  return {
    ancho,
    alto: Math.max(visual.tamano, lineas.length * Math.round(visual.tamano * 1.28)),
    visual,
  };
}

function aplicarFiltroLineal(nodo) {
  nodo.texture?.setFilter?.(Phaser.Textures.FilterMode.LINEAR);
}

export function registrarFramesEstilo() {
  return true;
}

export function registrarTodosLosFramesTexto() {
  return true;
}

export function precargarTextoPixel() {}

export function precargarTodosLosTextos() {}

export function crearTexto(scene, texto, opciones = {}) {
  const x = Math.round(opciones.x ?? 0);
  const y = Math.round(opciones.y ?? 0);
  const container = scene.add.container(x, y);
  container.setDepth(opciones.depth ?? 0);
  container.anchoTexto = 0;
  container.altoTexto = 0;

  const plano = String(texto ?? '');
  if (plano.length === 0) return container;

  const estilo = TODOS_ESTILOS[opciones.estilo ?? ESTILO_DEFECTO];
  if (!estilo) {
    console.warn(`textoPixel: estilo "${opciones.estilo}" no existe.`);
    return container;
  }

  const { visual } = metricasDe(plano, opciones);
  const origen = resolverOrigen(opciones.origen);
  const nodo = scene.add.text(0, 0, plano, {
    fontFamily: visual.familia,
    fontStyle: visual.peso,
    fontSize: `${visual.tamano}px`,
    color: visual.color,
    align: opciones.align ?? 'left',
    resolution: resolucionTexto(),
  });
  nodo.setOrigin(origen.x, origen.y);
  if (typeof nodo.updateText === 'function') nodo.updateText();
  aplicarFiltroLineal(nodo);
  container.add(nodo);
  container.anchoTexto = nodo.width;
  container.altoTexto = nodo.height;
  return container;
}

export function medirTexto(texto, opciones = {}) {
  const estiloNombre = opciones.estilo ?? ESTILO_DEFECTO;
  if (!TODOS_ESTILOS[estiloNombre]) return { ancho: 0, alto: 0 };
  const medidas = metricasDe(texto, opciones);
  return { ancho: medidas.ancho, alto: medidas.alto };
}

export { ESTILOS_TEXTO, FUENTE_UI };
