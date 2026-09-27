/**
 * seleccion/etiquetasRival.js — Que eligio cada enemigo (Recibir_Config_Acciones).
 *
 * SPECT: docs/spects/spect006.md
 *
 * Texto bajo cada enemigo durante la segunda capa de tipo 1.
 */

import { buscarAccion, entradaPorId, filasDeConfigRival } from './comun.js';

/** Etiquetas de Recibir_Config_Acciones bajo enemigos. */
const etiquetasRival = [];

function esTypeDiana(type) {
  const valor = String(type ?? '').toLowerCase().replace(/\s+/g, '');
  return valor.startsWith('diana') || valor.includes('casilla') || valor === '0';
}

function textoObjetivo(objetivo, potestades) {
  if (objetivo == null) return '';
  if (typeof objetivo === 'object' && Number.isFinite(Number(objetivo.x))) {
    return `${Number(objetivo.x)},${Number(objetivo.y)}`;
  }
  const entrada = entradaPorId(potestades, objetivo);
  return entrada?.potestad?.arquetipo ?? String(objetivo);
}

function textoEtiquetaRival(fila, potestad, potestades) {
  const nombre = fila.nombreDeAccion ?? fila.nombre ?? '';
  const accion = buscarAccion(potestad, nombre);
  if (!esTypeDiana(accion?.type ?? accion?.tipo) || fila.objetivo == null) return nombre;
  return `${nombre}: ${textoObjetivo(fila.objetivo, potestades)}`;
}

export function quitarEtiquetasConfigRival() {
  etiquetasRival.splice(0, etiquetasRival.length).forEach((nodo) => nodo.destroy?.());
}

export function mostrarEtiquetasConfigRival(configuracionRival, contexto) {
  const escena = contexto?.escena;
  if (!escena) return;
  quitarEtiquetasConfigRival();

  filasDeConfigRival(configuracionRival).forEach((fila) => {
    const entrada = entradaPorId(contexto.potestades, fila.id);
    if (entrada?.bando !== 'Enemigos') return;
    const sprite = entrada.potestad?.sprite;
    if (!sprite?.active) return;

    const texto = textoEtiquetaRival(fila, entrada.potestad, contexto.potestades);
    if (!texto) return;

    const etiqueta = escena.add.text(
      sprite.x,
      sprite.y + (sprite.displayHeight ?? sprite.height ?? 0) * 0.5 + 8,
      texto,
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 },
        align: 'center',
      },
    );
    etiqueta.setOrigin(0.5, 0);
    etiqueta.setDepth((sprite.depth ?? 0) + 5);
    etiquetasRival.push(etiqueta);
  });
}
