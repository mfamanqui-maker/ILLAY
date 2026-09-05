import MenuScene from './scenes/MenuScene.js';
import GlobalMapScene from './scenes/maps/globalMapScene.js';
import HouseMapScene from './scenes/maps/houseMapScene.js';
import ShopMapScene from './scenes/maps/shopMapScene.js';
import Vista from './classes/battle/vista.js';
import tableroScene from './scenes/battles/tableroScene.js';
import entidadScene from './scenes/battles/entidadScene.js';
import CharacterSelectScene from './scenes/battles/characterSelectScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1700,
  height: 900,
  backgroundColor: '#2d2d2d',

  pixelArt: true,
  antialias: false,
  roundPixels: true,

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },

  scene: [

    MenuScene,

    //══════════════════Escenas de Mapas══════════════════

    ShopMapScene,
    GlobalMapScene,
    HouseMapScene,

    //══════════════════Escenas de batalla══════════════════
    CharacterSelectScene,
    Vista,
    tableroScene,
    entidadScene,
  ],
}
const game = new Phaser.Game(config);