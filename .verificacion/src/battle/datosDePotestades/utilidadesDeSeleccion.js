/**
 * utilidadesDeSeleccion.js — Que objetivos son validos para una accion.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE SERA: entra una accion y un estado de tablero, sale una lista de
 * objetivos validos. Nada mas.
 *
 * REGLA 8 DEL CONTRATO: funciones puras, cero imports de Phaser. Esa es la
 * barrera que impide que este archivo crezca sin control: si algun dia
 * necesita importar Phaser, es que le estan metiendo trabajo que no le toca.
 * Una regla que se verifica mirando la primera linea del archivo es una regla
 * que sobrevive.
 *
 * En el codigo viejo estas ~105 lineas de razonamiento puro estaban enterradas
 * dentro del archivo de interfaz de las orbes, mezcladas con tweens y sprites.
 *
 * Rescatado de: ui/Entidades/Aliados.js lineas 563-667 (borrado).
 *
 * ESTADO: esqueleto con rescate. Revisar contra el spect 006.
 */

// ─── RESCATE: Aliados.js lineas 563-594. Sirve tal cual. ─────────────────────
// Traduce el `casoDeElección` de una accion a que tipo de seleccion hace falta.
// 'automatico' no pide nada, 'entidad' pide senalar a alguien, 'casilla' pide
// senalar suelo, y 'posterior' es la de tipo 1: no se puede decidir hasta
// saber que hizo el rival.

export function normalizarCasoSeleccion(casoDeEleccion) {
  if (casoDeEleccion == null || casoDeEleccion === false) return { tipo: 'automatico' };

  const valor = String(casoDeEleccion).toLowerCase();
  if (valor === '0') return { tipo: 'entidad', bandos: ['Aliados', 'Enemigos'] };
  if (valor === '1') return { tipo: 'posterior', bandos: ['Aliados', 'Enemigos'] };
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
// El rango se mide en casillas de Chebyshev (el maximo de las dos distancias),
// que es lo que corresponde a un tablero donde la diagonal cuenta como un paso.

export function obtenerRangoAccion(accion) {
  const rango = Number(accion?.rango);
  return Number.isFinite(rango) && rango >= 0 ? rango : Infinity;
}

export function estaDentroDeRango(origen, destino, rango) {
  if (!Number.isFinite(rango)) return true;
  if (!origen || !destino) return false;
  return Math.abs(Number(destino.x) - Number(origen.x)) <= rango &&
    Math.abs(Number(destino.y) - Number(origen.y)) <= rango;
}

// ─── RESCATE ADAPTADO: Aliados.js lineas 617-643. ────────────────────────────
// El original leia las listas de vivos de la escena `entidad`. Ahora las
// recibe: es lo que lo convierte en funcion pura.

export function candidatosPorBando(potestades, bandos, origen, rango) {
  return (potestades ?? [])
    .filter((entrada) => bandos.includes(entrada.bando))
    .filter((entrada) => Number(entrada.potestad?.estadisticas?.hp) > 0)
    .filter((entrada) => estaDentroDeRango(origen, entrada.potestad?.datos?.posicion, rango));
}

// ─── RESCATE ADAPTADO: Aliados.js lineas 645-666. ────────────────────────────
// El original comprobaba `casilla.casillaPhaser` para saber si la casilla
// existia, o sea preguntaba por un objeto de Phaser dentro de una decision de
// reglas. Aqui se usa `id === 0`, que es el dato que ya marca casilla nula.

export function casillaEstaOcupada(casilla) {
  return Boolean(casilla?.entidad && casilla.entidad !== false);
}

export function candidatosCasilla(tablero, origen, rango, permitirOcupada = false) {
  const candidatos = [];
  (tablero ?? []).forEach((fila, y) => {
    fila.forEach((casilla, x) => {
      if (!casilla || casilla.id === 0) return;
      if (!permitirOcupada && casillaEstaOcupada(casilla)) return;
      const posicion = { x: x + 1, y: y + 1 };
      if (!estaDentroDeRango(origen, posicion, rango)) return;
      candidatos.push({ casilla, ...posicion });
    });
  });
  return candidatos;
}
