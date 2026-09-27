/**
 * negociacion/espejo.js — POV del rival en el cable.
 *
 * SPECT: docs/spects/spect010.md
 *
 * Cada cliente piensa en SU tablero. Solo las coordenadas de casilla se
 * espejan al enviar: x' = columnas + 1 - x. Al recibir, el payload ya viene
 * en POV local (el rival espejo al mandar); no se vuelve a espejar.
 * Los ids / arquetipos no se tocan.
 */

export function espejarObjetivo(objetivo, columnas) {
  if (objetivo == null || typeof objetivo !== 'object') return objetivo;
  if (!Number.isFinite(Number(objetivo.x)) || !Number.isFinite(columnas)) return objetivo;
  return { x: columnas + 1 - Number(objetivo.x), y: Number(objetivo.y) };
}

export function espejarAzar(azar, columnas) {
  if (azar == null || typeof azar !== 'object') return azar;
  const out = { ...azar };
  if (azar.rebote) out.rebote = espejarObjetivo(azar.rebote, columnas);
  if (azar.pretendido) out.pretendido = espejarObjetivo(azar.pretendido, columnas);
  return out;
}

export function espejarConfig(filas, columnas) {
  return (Array.isArray(filas) ? filas : []).map((fila) => ({
    ...fila,
    objetivo: espejarObjetivo(fila.objetivo, columnas),
    azar: espejarAzar(fila.azar, columnas),
  }));
}
