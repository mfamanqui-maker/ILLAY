export default class UiMapa extends Phaser.Scene {
  constructor() {
    super({ key: "uiMapa" });
  }

  create() {
    const ancho = this.scale.width;
    this.crearBoton("pausa", 110, () => console.log("crear pausa"));
    this.crearBoton("libro", ancho / 2, () => console.log("crear Libro"));
    this.crearBoton("hora", ancho - 110, () => console.log("mostrar hora"));
  }

  crearBoton(texto, x, alPulsar) {
    const y = 42;
    const fondo = this.add.rectangle(x, y, 180, 52, 0x1a1a1a, 0.82)
      .setStrokeStyle(3, 0xd2d881)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, texto, {
      fontFamily: "impact",
      fontSize: "28px",
      color: "#d2d881"
    }).setOrigin(0.5);

    if (alPulsar) fondo.on("pointerdown", alPulsar);
  }

  pausar() {
    this.scene.get("PhaserMaster")?.abrirMenuPausa();
  }
}
