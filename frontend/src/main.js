import MenuScene from './MenuScene.js';
import PhaserMaster from './maps/PhaserMaster.js';
import CharacterSelectScene from './battle/vestibulo/characterSelectScene.js';
import vista from './battle/vista.js';

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

    PhaserMaster,

    //══════════════════Escenas de batalla══════════════════
    
    CharacterSelectScene,
    vista,
  ],
}
const game = new Phaser.Game(config);