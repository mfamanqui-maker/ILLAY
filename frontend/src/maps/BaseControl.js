// frontend/src/maps/BaseControl.js

export default class BaseControl {
    constructor(scene) {
      this.scene = scene;
      this.player = null;
      this.keys = null;
      this.speed = 120;
      this.direction = "down";
    }
  
    precargar() {
      const scene = this.scene;
      const marco = { frameWidth: 32, frameHeight: 32 };

      scene.load.spritesheet("down", "assets/images/maps/WalkDown.png", marco);
      scene.load.spritesheet("left", "assets/images/maps/WalkLeft.png", marco);
      scene.load.spritesheet("up", "assets/images/maps/WalkUp.png", marco);
      scene.load.spritesheet("right", "assets/images/maps/WalkRight.png", marco);
    }

    crearAnimaciones() {
      const scene = this.scene;

      for (const direccion of ["down", "left", "up", "right"]) {
        const clave = `walk-${direccion}`;
        if (scene.anims.exists(clave)) continue;

        scene.anims.create({
          key: clave,
          frames: scene.anims.generateFrameNumbers(direccion, { start: 0, end: 7 }),
          frameRate: 10,
          repeat: -1
        });
      }
    }

    crearJugador(x, y) {
      const scene = this.scene;

      this.crearAnimaciones();
  
      this.player = scene.physics.add.sprite(
        x,
        y,
        "down",
        0
      );
  
      this.player
        .setOrigin(0.5, 0.5)
        .setScale(0.7)
        .setCollideWorldBounds(false);
  
      this.player.body.setSize(14, 14);
      this.player.setDepth(y + 50);
  
      this.keys = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
      });
  
      scene.cameras.main.startFollow(
        this.player,
        false,
        0.1,
        0.1
      );
  
      scene.cameras.main.setZoom(4);
  
      return this.player;
    }
  
    update() {
      if (!this.player || !this.keys) return;
  
      const body = this.player.body;
  
      body.setVelocity(0);
  
      let moving = false;
  
      if (this.keys.left.isDown) {
        body.setVelocityX(-this.speed);
        this.direction = "left";
        moving = true;
      } else if (this.keys.right.isDown) {
        body.setVelocityX(this.speed);
        this.direction = "right";
        moving = true;
      }
  
      if (this.keys.up.isDown) {
        body.setVelocityY(-this.speed);
        this.direction = "up";
        moving = true;
      } else if (this.keys.down.isDown) {
        body.setVelocityY(this.speed);
        this.direction = "down";
        moving = true;
      }
  
      // Evita que el movimiento diagonal sea más rápido.
      body.velocity.normalize().scale(this.speed);
  
      this.actualizarAnimacion(moving);
  
      // Profundidad aproximada según la posición vertical.
      this.player.setDepth(this.player.y + 50);
    }
  
    actualizarAnimacion(moving) {
      if (!moving) {
        this.player.anims.stop();
        return;
      }
  
      const animationKey = `walk-${this.direction}`;
  
      if (this.scene.anims.exists(animationKey)) {
        this.player.anims.play(animationKey, true);
      }
    }
  
    obtenerJugador() {
      return this.player;
    }
  }