import BaseScene from './BaseScene.js';

export default class HouseMapScene extends BaseScene {
  constructor() {
    super('houseMap');
  }

  preload() {
    this.cargarAssets();
    this.load.tilemapTiledJSON('house', 'assets/maps/houseMap.tmj');
  }

  create() {
    const map = this.make.tilemap({ key: 'house' });
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

    // Zona para volver a globalMap (en la puerta, tile 21 del mapa)
    this.crearZona(164, 8, 20, 20, 'globalMap', 0x00ffff);
  }
}