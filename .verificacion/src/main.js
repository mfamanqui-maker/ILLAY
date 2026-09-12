import MenuScene from './MenuScene.js';
import GlobalMapScene from './maps/globalMapScene.js';
import HouseMapScene from './maps/houseMapScene.js';
import ShopMapScene from './maps/shopMapScene.js';
import CharacterSelectScene from './battle/characterSelectScene.js';

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
    // Las escenas de batalla ya no se listan aqui. El battle system las
    // registra en caliente cuando arranca una batalla: basta con llamar a
    // iniciarBatalla(game, molde) de src/battle/vista.js. Ver spect 004.
    CharacterSelectScene,
  ],
}
const game = new Phaser.Game(config);