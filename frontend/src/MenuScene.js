export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'menu' });
  }
  preload() {
    this.load.image('fondo', 'assets/images/system/Menu.png');
  }
  create() {
    this.add.image(850, 450, 'fondo').setOrigin(0.5).setScale(2.7)

    const campaña = this.add.rectangle(350, 550, 350, 150, '0xffffff').setOrigin(0.5).setInteractive({
      cursor: 'pointer'
    })
    const Multijugador = this.add.rectangle(350, 750, 350, 150, '0xffffff').setOrigin(0.5).setInteractive({
      cursor: 'pointer'
    })
    
    this.add.text(350, 550, 'Campaña', {
      fontFamily: 'impact',
      fontSize: '64px',
      color: '#000000',
    }).setOrigin(0.5)

    this.add.text(350, 750, 'Multijugador', {
      fontFamily: 'impact',
      fontSize: '64px',
      color: '#000000',
    }).setOrigin(0.5)

    campaña.on('pointerdown', () => { this.scene.start('PhaserMaster') })
    Multijugador.on('pointerdown', () => { this.scene.start('CharacterSelectScene') })

  }
}