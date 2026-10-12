export default class BaseScene extends Phaser.Scene {
  constructor(key) {
    super({ key });
  }

  // ══════════════════════════════════════
  // CARGAR ASSETS COMUNES (llamar en preload de la hija)
  // ══════════════════════════════════════
  cargarAssets() {
    this.load.image('tileset', 'assets/images/tileset_1bit.png');
    this.load.spritesheet('right', 'assets/images/WalkRight.png', {
      frameWidth: 32, frameHeight: 32
    });
    this.load.spritesheet('up', 'assets/images/WalkUp.png', {
      frameWidth: 32, frameHeight: 32
    });
    this.load.spritesheet('left', 'assets/images/WalkLeft.png', {
      frameWidth: 32, frameHeight: 32
    });
    this.load.spritesheet('down', 'assets/images/WalkDown.png', {
      frameWidth: 32, frameHeight: 32
    });
  }

  // ══════════════════════════════════════
  // CREAR JUGADOR en posición dada
  // ══════════════════════════════════════
  crearJugador(x, y) {
    this.player = this.physics.add.sprite(x, y, 'down', 0)
      .setOrigin(0.5)
      .setScale(0.7);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.2);
    this.player.body.setSize(14, 14);
  }

  // ══════════════════════════════════════
  // CONFIGURAR CÁMARA Y MUNDO
  // ══════════════════════════════════════
  configurarCamara(map) {
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    this.cameras.main.setZoom(4);
  }

  // ══════════════════════════════════════
  // CREAR INPUT WASD + ENTER
  // ══════════════════════════════════════
  crearInput() {
    this.w = this.input.keyboard.addKey('W');
    this.a = this.input.keyboard.addKey('A');
    this.s = this.input.keyboard.addKey('S');
    this.d = this.input.keyboard.addKey('D');
    this.enter = this.input.keyboard.addKey('ENTER');
    this.speed = 100;
    this.direction = 'down';
  }

  // ══════════════════════════════════════
  // CREAR ANIMACIONES (solo si no existen)
  // ══════════════════════════════════════
  crearAnimaciones() {
    if (this.anims.exists('down')) return;

    this.anims.create({
      key: 'down',
      frames: this.anims.generateFrameNumbers('down', { start: 0, end: 7 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('left', { start: 0, end: 7 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({
      key: 'up',
      frames: this.anims.generateFrameNumbers('up', { start: 0, end: 7 }),
      frameRate: 10, repeat: -1
    });
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('right', { start: 0, end: 7 }),
      frameRate: 10, repeat: -1
    });
  }

  // ══════════════════════════════════════
  // CREAR ZONA DE TRANSICIÓN
  // ══════════════════════════════════════
  crearZona(x, y, ancho, alto, destino, color) {
    const zona = this.add.zone(x, y, ancho, alto);
    this.physics.world.enable(zona);
    zona.body.setAllowGravity(false);
    zona.body.moves = false;

    // Debug visual
    if (color) {
      this.add.circle(x, y, 15, color, 0.3);
    }

    this.physics.add.overlap(this.player, zona, () => {
      if (this.enter.isDown) {
        this.scene.start(destino);
      }
    });

    return zona;
  }

  // ══════════════════════════════════════
  // UPDATE: Movimiento del jugador
  // ══════════════════════════════════════
  update() {
    this.player.setVelocity(0, 0);

    if (!(this.w.isDown || this.s.isDown || this.a.isDown || this.d.isDown)) {
      this.player.setFrame(0);
    }

    if (this.w.isDown) {
      this.player.play('up', true);
      this.player.setVelocityY(-this.speed);
      this.direction = 'up';
    } else if (this.s.isDown) {
      this.player.play('down', true);
      this.player.setVelocityY(this.speed);
      this.direction = 'down';
    }

    if (this.a.isDown) {
      this.player.play('left', true);
      this.player.setVelocityX(-this.speed);
      this.direction = 'left';
    } else if (this.d.isDown) {
      this.player.play('right', true);
      this.player.setVelocityX(this.speed);
      this.direction = 'right';
    }
  }
}


