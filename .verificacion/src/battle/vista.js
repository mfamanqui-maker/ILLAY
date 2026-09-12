/**
 * vista.js — Puerta de entrada del battle system.
 *
 * SPECT: docs/spects/spect004.md
 *
 * QUE SERA: iniciar una batalla tiene que ser tan simple como llamar a una
 * funcion y pasarle un JSON. Este archivo registra las dos escenas de batalla
 * en un juego Phaser ya arrancado y lanza PhaserMaster. Nada mas.
 *
 * El JSON llega ya resuelto. Lo produce el multijugador (la configuracion que
 * mando el rival) o crearNiveles/ en modo historia. A este archivo le da igual
 * de donde venga.
 *
 * REGLA 3 DEL CONTRATO: las escenas no se listan en el main.js del colaborador.
 * Se anaden en caliente aqui, para que integrar el sistema cueste un solo
 * import.
 *
 * ESTADO: esqueleto funcional. Revisar contra el spect 004.
 */

import PhaserMaster from './PhaserMaster.js';
import GenerarInterfaz from './generarInterfaz.js';

export const CLAVE_ESCENA_MUNDO = 'PhaserMaster';
export const CLAVE_ESCENA_HUD = 'interfazBatalla';

/**
 * @param {Phaser.Game} game - instancia viva del juego del colaborador.
 * @param {object} configuracion - molde de batalla ya resuelto.
 */
export function iniciarBatalla(game, configuracion) {
  // La guarda no es adorno: registrar una clave que ya existe lanza excepcion,
  // y eso pasa en cuanto el jugador vuelve al menu y entra a una segunda batalla.
  if (!game.scene.getScene(CLAVE_ESCENA_MUNDO)) {
    game.scene.add(CLAVE_ESCENA_MUNDO, PhaserMaster, false);
    game.scene.add(CLAVE_ESCENA_HUD, GenerarInterfaz, false);
  }
  game.scene.start(CLAVE_ESCENA_MUNDO, configuracion);
}
