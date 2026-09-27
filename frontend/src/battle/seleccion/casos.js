/**
 * seleccion/casos.js — Reglas puras: tipo de seleccion, rango y candidatos.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Sin Phaser ni estado. Entra una accion y un estado de tablero, sale una
 * lista de objetivos validos.
 *
 * Rescatado de: ui/Entidades/Aliados.js lineas 563-667 (borrado).
 */

import { esMovilidad } from '../datosDePotestades/acciones/catalogo.js';
import { cupoAccionismo } from './accionismo.js';
import { claveCasilla } from './comun.js';

// ─── RESCATE: Aliados.js lineas 563-594. Sirve tal cual. ─────────────────────
// Traduce el `casoDeElección` de una accion a que tipo de seleccion hace falta.
// 'automatico' no pide nada, 'entidad' pide senalar a alguien, 'casilla' pide
// senalar suelo, y 'posterior' es la de tipo 1: no se puede decidir hasta
// saber que hizo el rival.

export function normalizarCasoSeleccion(casoDeEleccion) {
  if (casoDeEleccion == null || casoDeEleccion === false) return { tipo: 'automatico' };

  const valor = String(casoDeEleccion).toLowerCase().replace(/\s+/g, '');
  if (valor === 'directo') return { tipo: 'automatico' };
  if (valor === '0' || valor === 'diana') return { tipo: 'entidad', bandos: ['Aliados', 'Enemigos'] };
  if (valor === 'dianaenemigo') return { tipo: 'entidad', bandos: ['Enemigos'] };
  if (valor === 'dianaaliado') return { tipo: 'entidad', bandos: ['Aliados'] };
  if (valor === '1' || valor.startsWith('configtype1')) {
    const bandos = valor.endsWith('aliado')
      ? ['Aliados']
      : valor.endsWith('enemigo')
        ? ['Enemigos']
        : ['Aliados', 'Enemigos'];
    return { tipo: 'posterior', bandos };
  }
  if (valor.includes('casilla')) return { tipo: 'casilla' };

  return { tipo: 'entidad', bandos: normalizarBandosObjetivo(casoDeEleccion) };
}

export function normalizarBandosObjetivo(casoDeEleccion) {
  if (casoDeEleccion == null || casoDeEleccion === false) return [];
  if (Array.isArray(casoDeEleccion)) {
    return casoDeEleccion.flatMap((caso) => normalizarBandosObjetivo(caso));
  }
  const valor = String(casoDeEleccion).toLowerCase();
  if (valor.includes('ambos') || valor.includes('todos')) return ['Aliados', 'Enemigos'];
  if (valor.includes('aliad')) return ['Aliados'];
  if (valor.includes('enemig')) return ['Enemigos'];
  return [];
}

// ─── RESCATE: Aliados.js lineas 596-615. Sirve tal cual. ─────────────────────
// Chebyshev: la diagonal cuenta como un paso. rango 1 = 3x3, rango 2 = 5x5.
// Infinity (o cualquier no-numero) cubre todo el tablero.

export function obtenerRangoAccion(accion) {
  const crudo = accion?.rango;
  if (crudo === Infinity || crudo === -Infinity) return Infinity;
  if (typeof crudo === 'string' && crudo.trim().toLowerCase() === 'infinity') return Infinity;
  const rango = Number(crudo);
  return Number.isFinite(rango) && rango >= 0 ? rango : Infinity;
}

export function estaDentroDeRango(origen, destino, rango) {
  if (!Number.isFinite(rango)) return true;
  if (!origen || !destino) return false;
  const dx = Math.abs(Number(destino.x) - Number(origen.x));
  const dy = Math.abs(Number(destino.y) - Number(origen.y));
  return Math.max(dx, dy) <= rango;
}

// ─── RESCATE ADAPTADO: Aliados.js lineas 617-643. ────────────────────────────
// El original leia las listas de vivos de la escena `entidad`. Ahora las
// recibe: es lo que lo convierte en funcion pura.

export function candidatosPorBando(potestades, bandos, origen, rango, opciones = {}) {
  const soloMuertos = opciones.soloMuertos === true;
  return (potestades ?? [])
    .filter((entrada) => bandos.includes(entrada.bando))
    .filter((entrada) => {
      const p = entrada.potestad;
      const hp = Number(p?.estadisticas?.hp ?? 0);
      const muerta = p?.muerta === true || hp <= 0;
      if (soloMuertos) return muerta;
      return !muerta && hp > 0;
    })
    .filter((entrada) => estaDentroDeRango(origen, entrada.potestad?.datos?.posicion, rango));
}

export function esAccionDeMovilidad(nombre) {
  return esMovilidad(nombre);
}

/**
 * Origen para elegir otra movilidad. Si el cupo esta lleno, la siguiente
 * eleccion remplazara la ultima fila: esa no cuenta como origen (si no, el
 * fantasma alarga el rango sin limite).
 */
export function origenDeSeleccionMovilidad(potestad, configDelTurno) {
  const raw = configDelTurno?.get?.(potestad?.id)
    ?? configDelTurno?.get?.(Number(potestad?.id));
  const filas = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const cupo = cupoAccionismo(potestad);
  const relevantes = filas.length >= cupo ? filas.slice(0, -1) : filas;
  for (let i = relevantes.length - 1; i >= 0; i -= 1) {
    const destino = relevantes[i]?.objetivo;
    if (!esAccionDeMovilidad(relevantes[i]?.nombreDeAccion)) continue;
    if (!destino || !Number.isFinite(Number(destino.x)) || !Number.isFinite(Number(destino.y))) {
      continue;
    }
    return { x: Number(destino.x), y: Number(destino.y) };
  }
  return potestad?.datos?.posicion ?? null;
}

// ─── RESCATE ADAPTADO: Aliados.js lineas 645-666. ────────────────────────────
// El original comprobaba `casilla.casillaPhaser` para saber si la casilla
// existia, o sea preguntaba por un objeto de Phaser dentro de una decision de
// reglas. Aqui se usa `id === 0`, que es el dato que ya marca casilla nula.

export function casillaEstaOcupada(casilla) {
  return Boolean(casilla?.entidad && casilla.entidad !== false);
}

export function destinosMoverseAliados(configDelTurno, idExcluir = null) {
  const reservadas = new Set();
  const filas = [...(configDelTurno?.values?.() ?? [])].flatMap((v) => (Array.isArray(v) ? v : [v]));
  filas.forEach((fila) => {
    if (fila == null) return;
    if (idExcluir != null && String(fila.id) === String(idExcluir)) return;
    if (!esAccionDeMovilidad(fila.nombreDeAccion)) return;
    const o = fila.objetivo;
    if (!o || !Number.isFinite(Number(o.x)) || !Number.isFinite(Number(o.y))) return;
    reservadas.add(claveCasilla(o.x, o.y));
  });
  return reservadas;
}

export function candidatosCasilla(tablero, origen, rango, permitirOcupada = false, clavesProhibidas = null) {
  const candidatos = [];
  (tablero ?? []).forEach((fila, y) => {
    fila.forEach((casilla, x) => {
      if (!casilla || casilla.id === 0) return;
      if (!permitirOcupada && casillaEstaOcupada(casilla)) return;
      const posicion = { x: x + 1, y: y + 1 };
      if (clavesProhibidas?.has?.(claveCasilla(posicion.x, posicion.y))) return;
      if (!estaDentroDeRango(origen, posicion, rango)) return;
      candidatos.push({ casilla, ...posicion });
    });
  });
  return candidatos;
}
