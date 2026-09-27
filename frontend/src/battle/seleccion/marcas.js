/**
 * seleccion/marcas.js — Pintar y limpiar el resultado de una seleccion.
 *
 * SPECT: docs/spects/spect006.md
 *
 * REGLA 8 DEL CONTRATO: Phaser solo para marcas de seleccion. No importa
 * orbes, panel ni red. El clic se queda en las orbes.
 */

import {
  frenarBrillo,
  frenarBrillosCasilla,
  frenarTodosLosBrillos,
  iniciarBrillo,
  iniciarBrilloCasilla,
} from './brillos.js';
import { restaurarBrillosAccionismo } from './accionismo.js';
import { mostrarEtiquetasConfigRival, quitarEtiquetasConfigRival } from './etiquetasRival.js';

export function pausarBrillosExcepto(origenSprite, contexto) {
  (contexto?.potestades ?? []).forEach(({ potestad }) => {
    const sprite = potestad?.sprite;
    if (!sprite || sprite === origenSprite) return;
    frenarBrillo(sprite);
  });
}

export function limpiarMarcasSeleccion(contexto, { restaurar = true } = {}) {
  quitarEtiquetasConfigRival();
  frenarBrillosCasilla();
  frenarTodosLosBrillos();
  if (restaurar) restaurarBrillosAccionismo(contexto);
}

export function aplicarMarcasSeleccion(resultado, contexto) {
  if (!contexto?.escena || !resultado) return resultado;
  if (resultado.esperaRival || resultado.tipo === 'automatico') return resultado;
  if (!resultado.candidatos?.length) return resultado;

  const lanzador = contexto.origenPotestad?.sprite;
  pausarBrillosExcepto(lanzador, contexto);
  if (lanzador?.active) iniciarBrillo(lanzador, { escena: contexto.escena });

  if (resultado.tipo === 'casilla') {
    frenarBrillosCasilla();
    resultado.candidatos.forEach((candidato) => {
      candidato.marca = iniciarBrilloCasilla(candidato.casilla, contexto.escena);
    });
    return resultado;
  }

  resultado.candidatos.forEach((entrada) => {
    const sprite = entrada.potestad?.sprite;
    if (!sprite?.active || sprite === lanzador) return;
    // Diana de ataque: amarillo de espera. El rojo se reserva a amenazas tipo 1.
    iniciarBrillo(sprite, { escena: contexto.escena });
  });
  if (resultado.etiquetasRival) {
    mostrarEtiquetasConfigRival(contexto.configuracionRival, contexto);
  }
  return resultado;
}
