/**
 * Acciones de la barra que hablan con el servidor (spect 010).
 *
 * cerrarPartida es el await de _terminarBatalla: manda Partida_Finalizada
 * y espera Resultado_Partida. Sin socket (modo historia) devuelve el local.
 */

function valorResultado(payload) {
  if (payload && typeof payload === 'object') return payload.resultado ?? null;
  return payload ?? null;
}

export async function cerrarPartida(transporte, resultadoLocal) {
  if (!transporte?.estaConectado?.()) {
    return { resultado: resultadoLocal };
  }
  transporte.enviarPartidaFinalizada(resultadoLocal);
  const recibido = await transporte.esperarResultadoPartida();
  return { resultado: valorResultado(recibido) ?? resultadoLocal };
}

export function rendirsePartida(transporte) {
  return cerrarPartida(transporte, 'derrota');
}
