import {
  alternarHistorial,
  actualizarHistorial,
  cerrarHistorial,
} from './Historial/panelHistorial.js';

export function enlazarControlesInterfaz(escenaHud, opciones) {
  const { eventos, contenedorBarra, obtenerRegistro } = opciones;
  if (!eventos) return () => {};

  let handleHistorial = null;
  let barraVisible = true;

  const onHistorial = () => {
    handleHistorial = alternarHistorial(escenaHud, obtenerRegistro(), handleHistorial, {
      onCerrarDesdeGrilla: () => {
        cerrarHistorial(handleHistorial);
        handleHistorial = null;
      },
    });
  };

  const onOcultar = () => {
    barraVisible = !barraVisible;
    contenedorBarra?.setVisible(barraVisible);
  };

  const onRegistroActualizado = () => {
    if (handleHistorial) actualizarHistorial(handleHistorial, obtenerRegistro());
  };

  eventos.on('historial', onHistorial);
  eventos.on('ignorarInterfaz', onOcultar);
  eventos.on('registroJugadasActualizado', onRegistroActualizado);

  return () => {
    eventos.off('historial', onHistorial);
    eventos.off('ignorarInterfaz', onOcultar);
    eventos.off('registroJugadasActualizado', onRegistroActualizado);
    cerrarHistorial(handleHistorial);
    handleHistorial = null;
  };
}
