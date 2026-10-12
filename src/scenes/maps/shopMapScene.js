import BaseScene from './BaseScene.js';

export default class ShopMapScene extends BaseScene {
  constructor() {
    super('shopMap');
  }

  preload() {
    this.cargarAssets();
    this.load.tilemapTiledJSON('shop', 'assets/maps/shopMap.tmj');
  }

  create() {
    const map = this.make.tilemap({ key: 'shop' });
    const tileset = map.addTilesetImage('sin textura', 'tileset');

    const ground = map.createLayer('ground', tileset);
    const wall = map.createLayer('walls', tileset, 0, 0);

    // Punto de inicio
    const objets = map.getObjectLayer('objects');
    const playerStart = objets.objects.find(obj => obj.name === '');

    // Crear jugador, cámara, input, animaciones (heredados)
    this.crearJugador(playerStart.x, playerStart.y);
    this.configurarCamara(map);
    this.crearInput();
    this.crearAnimaciones();

    // Colisiones
    wall.setCollisionByExclusion([-1]);
    wall.setCollision([74], false);
    this.physics.add.collider(this.player, wall);

    // Zona para volver a globalMap (en la puerta izquierda, tiles 51)
    this.crearZona(10, 112, 20, 20, 'globalMap', 0x00ffff);
  }
}


