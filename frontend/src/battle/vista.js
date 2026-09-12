// Contexto de este js: este es un archibo de entrenada a la batalla. y ya w si necesitas iniciar una batalla, solo inicia esta escena y pasa el molde.


// dato importante la batalla solo tiene 2 escenas: PhaserMaster(zoom, paneo, hover, clic) y GenerarInterfaz(paneles).
import PhaserMaster, { CLAVE_ESCENA_MUNDO } from './PhaserMaster.js';
import GenerarInterfaz, { CLAVE_ESCENA_HUD } from './generarInterfaz.js';

export { CLAVE_ESCENA_MUNDO, CLAVE_ESCENA_HUD };

const ESCENAS_DE_BATALLA = [
  [CLAVE_ESCENA_MUNDO, PhaserMaster],
  [CLAVE_ESCENA_HUD, GenerarInterfaz],
];


/**
 * @param {Phaser.Game} game
 * @param {object} configuracion molde ya resuelto
 */
export function iniciarBatalla(game, configuracion) {
  if (!game?.scene) {
    throw new Error('[vista] iniciarBatalla necesita una instancia de Phaser.Game viva.');
  }
  if (!configuracion || typeof configuracion !== 'object') {
    throw new Error('[vista] iniciarBatalla necesita el molde ya resuelto, no una clave.');
  }

  ESCENAS_DE_BATALLA.forEach(([clave, Escena]) => { // aqui se registran las escenas de batalla.
    if (!game.scene.getScene(clave)) game.scene.add(clave, Escena, false);
  });

  // this.scene.start desde el lanzador lo apaga y cede el paso al mundo.
  // game.scene.start solo enciende PhaserMaster y dejaria 'vista' viva.
  const lanzador = game.scene.getScene('vista');
  if (lanzador?.scene) {
    lanzador.scene.start(CLAVE_ESCENA_MUNDO, configuracion);
    return;
  }
  game.scene.start(CLAVE_ESCENA_MUNDO, configuracion);
}

/**
 * Lanzador de prueba / modo historia. Resuelve Molde001 y arranca la batalla.
 */
export default class vista extends Phaser.Scene {
  constructor() {
    super({ key: 'vista' });
    this.configuracion = null;
  }
  init(configuracion) {
    this.configuracion = configuracion;
  }
  preload() {
    this.load.json('Molde001', 'src/battle/AlmacenDeMoldes/Molde001.json');
  } 

  create() {
    if (!this.configuracion?.nombre) {
      this.configuracion = this.cache.json.get('Molde001');
    }
    iniciarBatalla(this.game, this.configuracion);
    console.log('this.configuracion', this.configuracion);
  }
}
