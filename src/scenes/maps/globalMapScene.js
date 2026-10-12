import BaseScene from './BaseScene.js';

export default class GlobalMapScene extends BaseScene {
  constructor() {
    super('globalMap');
  }

  preload() {
    this.cargarAssets();
    this.load.tilemapTiledJSON('global', 'assets/maps/globalMap.tmj');
  }

  create() {
    // Tilemap con dos tilesets
    const map = this.make.tilemap({ key: 'global' });
    const tileset = map.addTilesetImage('sin textura', 'tileset');

    const ground = map.createLayer('ground', tileset);
    const wall = map.createLayer('walls', tileset, 0, 0);
    const decoration = map.createLayer('decoration', tileset);

    // Punto de inicio
    const objets = map.getObjectLayer('objects');
    const playerStart = objets.objects.find(obj => obj.name === 'start');

    // Crear jugador, cámara, input, animaciones (heredados)
    this.crearJugador(playerStart.x, playerStart.y);
    this.configurarCamara(map);
    this.crearInput();
    this.crearAnimaciones();

    // Colisiones
    wall.setCollisionByExclusion([-1]);
    wall.setCollision([74], false);
    this.physics.add.collider(this.player, wall);

    // Zonas de transición
    this.crearZona(61, 587, 20, 20, 'houseMap', 0xff0000);
    this.crearZona(270, 552, 20, 20, 'vista', 0x00ff00);
    this.crearZona(117, 281, 20, 20, 'shopMap', 0xffff00);
    this.crearZona(542, 213, 20, 20, 'vista', 0xff00ff);
  }
}