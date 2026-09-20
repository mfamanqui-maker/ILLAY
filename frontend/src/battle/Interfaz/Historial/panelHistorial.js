import { COLOR_FONDO, DEPTH_HISTORIAL } from './estilosHistorial.js';
import { crearVistaGrilla } from './vistaGrilla.js';
import { crearVistaDetalle } from './vistaDetalle.js';

function crearCapaFullscreen(escenaHud, ancho, alto) {
  const overlay = escenaHud.add.container(0, 0);
  overlay.setScrollFactor(0);
  overlay.setDepth(DEPTH_HISTORIAL);

  const bloqueador = escenaHud.add.rectangle(ancho / 2, alto / 2, ancho, alto, COLOR_FONDO, 1);
  bloqueador.setScrollFactor(0);
  bloqueador.setInteractive({ useHandCursor: false });
  overlay.add(bloqueador);

  return overlay;
}

/**
 * @param {Phaser.Scene} escenaHud
 * @param {{ turnos: object[] }} registro
 * @param {{ onCerrarDesdeGrilla?: () => void }} opciones
 */
export function abrirHistorial(escenaHud, registro, opciones = {}) {
  const { width, height } = escenaHud.scale;
  const overlay = crearCapaFullscreen(escenaHud, width, height);

  const estado = {
    vista: 'grilla',
    grilla: null,
    detalle: null,
    turnoSeleccionado: null,
  };

  const cerrarPanel = () => {
    opciones.onCerrarDesdeGrilla?.();
  };

  const mostrarGrilla = () => {
    estado.detalle?.destruir();
    estado.detalle = null;
    estado.vista = 'grilla';
    estado.grilla?.destruir();
    estado.grilla = crearVistaGrilla(escenaHud, overlay, {
      ancho: width,
      alto: height,
      turnos: registro?.turnos ?? [],
      onElegirTurno: (turno) => {
        estado.turnoSeleccionado = turno;
        mostrarDetalle();
      },
      onRegresar: cerrarPanel,
    });
  };

  const mostrarDetalle = () => {
    estado.grilla?.destruir();
    estado.grilla = null;
    estado.vista = 'detalle';
    estado.detalle?.destruir();
    estado.detalle = crearVistaDetalle(escenaHud, overlay, {
      ancho: width,
      alto: height,
      turno: estado.turnoSeleccionado,
      onRegresar: () => mostrarGrilla(),
    });
  };

  mostrarGrilla();

  return {
    overlay,
    actualizar(nuevoRegistro) {
      registro = nuevoRegistro;
      if (estado.vista === 'grilla') mostrarGrilla();
      else if (estado.turnoSeleccionado) {
        const num = estado.turnoSeleccionado.numero;
        estado.turnoSeleccionado = registro.turnos.find((t) => t.numero === num) ?? estado.turnoSeleccionado;
        mostrarDetalle();
      }
    },
    destruir() {
      estado.grilla?.destruir();
      estado.detalle?.destruir();
      overlay.destroy(true);
    },
  };
}

export function cerrarHistorial(handle) {
  handle?.destruir();
}

export function actualizarHistorial(handle, registro) {
  handle?.actualizar?.(registro);
}

export function alternarHistorial(escenaHud, registro, handleActual, opciones = {}) {
  if (handleActual) {
    cerrarHistorial(handleActual);
    return null;
  }
  return abrirHistorial(escenaHud, registro, opciones);
}
