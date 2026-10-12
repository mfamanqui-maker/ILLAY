import VistaScene from './scenes/battles/VistaScene.js';
import InstruccionesScene from './scenes/battles/InstruccionesScene.js';
import EstadisticasScene from './scenes/battles/EstadisticasScene.js';
import CodigoScene from './scenes/battles/CodigoScene.js';
import TimeScene from './scenes/battles/TimeScene.js';
import MenuScene from './scenes/MenuScene.js';
import GlobalMapScene from './scenes/maps/GlobalMapScene.js';
import HouseMapScene from './scenes/maps/HouseMapScene.js';
import ShopMapScene from './scenes/maps/ShopMapScene.js';

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

    VistaScene,
    EstadisticasScene,
    InstruccionesScene,
    CodigoScene,
    TimeScene
  ],
}

window.gameData = {
  fase: null,
  vigencia: null,
  jugada: 0,

  objetivos_A: [],
  objetivos_E: [],

  aliados_vivos: ['Aliado_1', 'Aliado_2', 'Aliado_3'],
  enemigos_vivos: ['Enemigo_1', 'Enemigo_2', 'Enemigo_3'],

  botonesAliados: [],
  textosAliados: [],
  botonesEnemigos: [],
  textosEnemigos: [],

  The_box: [],

  seleccion: {
    aliado: null,
    enemigo: null
  },

  Aliado_1: {
    vidas: 3, escudos: 3, curas: 2, balas: 0,
    accion: null, escudo: false,
    objetivo_anterior: null, objetivo_cura: null,
    vida_maxima: 3, Z: true
  },
  Aliado_2: {
    vidas: 4, escudos: 2, curas: 1, balas: 0,
    accion: null, escudo: false,
    objetivo_anterior: null, objetivo_cura: null,
    vida_maxima: 4, Z: true
  },
  Aliado_3: {
    vidas: 3, escudos: 2, curas: 3, balas: 0,
    accion: null, escudo: false,
    objetivo_anterior: null, objetivo_cura: null,
    vida_maxima: 3, Z: true
  },

  Enemigo_1: {
    vidas: 3, escudos: 3, curas: 2, balas: 0,
    accion: null, escudo: false,
    vida_maxima: 3, Z: true
  },
  Enemigo_2: {
    vidas: 4, escudos: 2, curas: 1, balas: 0,
    accion: null, escudo: false,
    vida_maxima: 4, Z: true
  },
  Enemigo_3: {
    vidas: 3, escudos: 2, curas: 3, balas: 0,
    accion: null, escudo: false,
    vida_maxima: 3, Z: true
  }
}
const game = new Phaser.Game(config);