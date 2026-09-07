/**
 * generarInterfaz.js — Escena del HUD.
 *
 * SPECT: docs/spects/spect002.md
 *
 * QUE SERA: la segunda y ultima escena de la batalla. Fija a camara, por
 * encima del mundo, sin zoom ni pan. Dibuja los botones de control:
 * confirmar, rendirse, pausa, historial e ignorar interfaz.
 *
 * Aqui tambien dibujan (recibiendo esta escena por parametro, no como escenas
 * propias) el panelEntidad, el historial y la finalidad.
 *
 * LO QUE ESTE ARCHIVO NO HACE: red. Los botones emiten eventos y se acaba su
 * trabajo. El bucle de rondas y el envio al servidor son de PhaserMaster.
 * Poner la red aqui metia la maquina de estados del turno dentro de la capa de
 * presentacion, que es exactamente el error que tenia el codigo viejo cuando
 * controladorJugada importaba obtenerConfiguracionManual desde ui/Entidades/.
 *
 * Eventos que emite hacia el emisor de PhaserMaster:
 *   'confirmar' | 'rendirse' | 'pausa' | 'historial' | 'ignorarInterfaz'
 *
 * ESTADO: esqueleto. Archivo nuevo, no hay nada que rescatar.
 */

export default class GenerarInterfaz extends Phaser.Scene {
  constructor() {
    super({ key: 'interfazBatalla' });

    /** Emisor de PhaserMaster, inyectado en init(). Regla 2 del contrato. */
    this.eventos = null;

    /** Botones creados, para poder habilitarlos y deshabilitarlos por fase. */
    this.botones = null;
  }

  init(datos) {}

  preload() {}

  create() {}

  /** Confirmar es el boton importante: cierra la seleccion del jugador y avisa
   *  a PhaserMaster, que decide si abre otra ronda o pasa a precombate. */
  _crearBotonConfirmar() {}

  _crearBotonRendirse() {}

  _crearBotonPausa() {}

  _crearBotonHistorial() {}

  /** Oculta el HUD sin desmontarlo, para ver el tablero limpio. */
  _crearBotonIgnorarInterfaz() {}

  /** Los botones no estan activos en todas las fases: durante la ejecucion del
   *  guion solo deben responder pausa y rendirse. */
  actualizarPorFase(estadoRonda) {}

  shutdown() {}
}
