/**
 * Captura de teclado y rueda mientras el panel está abierto.
 *
 * Teclas:
 *   - Esc           → handlers.cerrar
 *   - ArrowLeft     → handlers.navegarMismoBando(-1)
 *   - ArrowRight    → handlers.navegarMismoBando(1)
 *   - Tab           → handlers.irAInicial (se previene el comportamiento default del navegador)
 *   - H             → handlers.historial
 *
 * Rueda:
 *   - delegada a handlers.scroll(pointer, deltaY)
 *
 * Devuelve un objeto con .desuscribir() para limpiar listeners al cerrar.
 */

export function registrarInputsPanel(scene, handlers) {
  if (!scene?.input?.keyboard) {
    return { desuscribir() {} };
  }

  const teclado = scene.input.keyboard;

  const onEsc = (event) => {
    event?.preventDefault?.();
    handlers?.cerrar?.();
  };
  const onLeft = () => handlers?.navegarMismoBando?.(-1);
  const onRight = () => handlers?.navegarMismoBando?.(1);
  const onTab = (event) => {
    event?.preventDefault?.();
    handlers?.irAInicial?.();
  };
  const onH = () => handlers?.historial?.();

  teclado.on('keydown-ESC', onEsc);
  teclado.on('keydown-LEFT', onLeft);
  teclado.on('keydown-RIGHT', onRight);
  teclado.on('keydown-TAB', onTab);
  teclado.on('keydown-H', onH);

  const onWheel = (pointer, gameObjects, deltaX, deltaY) => {
    handlers?.scroll?.(pointer, deltaY);
  };
  scene.input.on('wheel', onWheel);

  return {
    desuscribir() {
      teclado.off('keydown-ESC', onEsc);
      teclado.off('keydown-LEFT', onLeft);
      teclado.off('keydown-RIGHT', onRight);
      teclado.off('keydown-TAB', onTab);
      teclado.off('keydown-H', onH);
      scene.input.off('wheel', onWheel);
    },
  };
}
