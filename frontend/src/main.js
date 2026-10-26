import MenuScene from './MenuScene.js';
import PhaserMaster from './maps/PhaserMaster.js';
import CharacterSelectScene from './battle/vestibulo/characterSelectScene.js';
import vista from './battle/vista.js';
import iuDeMapa from './system/noBaseScene.js';
import UiMapa from './system/uiMapa.js';

const config = {
  type: Phaser.AUTO,
  parent: 'juego',
  width: 1700,
  height: 900,
  backgroundColor: '#2d2d2d',

  pixelArt: true,
  antialias: false,
  roundPixels: true,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },

  scene: [

    MenuScene,
    iuDeMapa,

    //══════════════════Escenas de Mapas══════════════════

    PhaserMaster,
    UiMapa,

    //══════════════════Escenas de batalla══════════════════
    
    CharacterSelectScene,
    vista,
  ],
}
const game = new Phaser.Game(config);