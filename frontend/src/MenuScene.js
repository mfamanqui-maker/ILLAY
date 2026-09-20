export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'menu' });
  }
  preload() {
    this.load.image('fondo', 'assets/images/system/menu.png');
  }
  create() {
    this.add.image(850, 450, 'fondo').setOrigin(0.5).setScale(1.4)
    this.add.text(850, 150, 'ILLAY REBIRTH', {
      fontFamily: 'impact',
      fontSize: '128px',
      color: '#d2d881',
      stroke: '#816f3e',
      strokeThickness: 10
    }).setOrigin(0.5)

    const play = this.add.rectangle(850, 550, 350, 150, '0xd2d881').setOrigin(0.5).setInteractive({
      cursor: 'pointer'
    })
    const Multijugador = this.add.rectangle(850, 750, 350, 150, '0xd2d881').setOrigin(0.5).setInteractive({
      cursor: 'pointer'
    })
    
    this.add.text(850, 550, 'Play', {
      fontFamily: 'impact',
      fontSize: '64px',
      color: '#d2d881',
      stroke: '#816f3e',
      strokeThickness: 10
    }).setOrigin(0.5)

    this.add.text(850, 750, 'Multijugador', {
      fontFamily: 'impact',
      fontSize: '64px',
      color: '#d2d881',
      stroke: '#816f3e',
      strokeThickness: 10
    }).setOrigin(0.5)

    play.on('pointerdown', () => { this.scene.start('globalMap') })
    Multijugador.on('pointerdown', () => { this.scene.start('CharacterSelectScene') })

  }
}