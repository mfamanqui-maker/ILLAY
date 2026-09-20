/**
 * pilaPasivas.js — Efectos secundarios que esperan un momento y una condicion.
 *
 * SPECT: docs/spects/spect007.md (fase 2)
 *
 * Un activo puede devolver { efectoPasivo: { momento, condicion, aplicar } }.
 * Se apila aqui; no se aplica hasta verificar(momento, ctx).
 * Al terminar la pila principal del turno se limpia.
 */

/** @typedef {{ momento: string, condicion: Function, aplicar: Function, origen?: object }} EfectoPasivo */

export function crearPilaPasivas() {
  /** @type {EfectoPasivo[]} */
  const items = [];

  function apilar(efectoPasivo, origen = null) {
    if (!efectoPasivo?.momento || typeof efectoPasivo.aplicar !== 'function') return;
    items.push({
      momento: efectoPasivo.momento,
      condicion: typeof efectoPasivo.condicion === 'function'
        ? efectoPasivo.condicion
        : () => true,
      aplicar: efectoPasivo.aplicar,
      origen,
    });
  }

  /**
   * Dispara las pasivas del momento cuya condicion cumpla.
   * Las que aplican se retiran. Devuelve las disparadas (para show).
   */
  function verificar(momento, ctx = {}) {
    const disparadas = [];
    const quedan = [];
    items.forEach((item) => {
      if (item.momento !== momento) {
        quedan.push(item);
        return;
      }
      let cumple = false;
      try {
        cumple = item.condicion(ctx) === true;
      } catch {
        cumple = false;
      }
      if (!cumple) {
        quedan.push(item);
        return;
      }
      try {
        item.aplicar(ctx);
      } catch (error) {
        console.warn('[pilaPasivas] aplicar fallo', error);
      }
      disparadas.push(item);
    });
    items.length = 0;
    items.push(...quedan);
    return disparadas;
  }

  function listar() {
    return items.slice();
  }

  function limpiar() {
    items.length = 0;
  }

  return { apilar, verificar, listar, limpiar };
}
