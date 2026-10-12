export default class EstadisticasScene extends Phaser.Scene {
  constructor() {
    super({ key: 'estadisticas' });
  }

  create() {
    const filas = [150, 450, 750];
    const estilo = { fontSize: '14px', color: '#000000' };

    // Aliados
    const aliados = ['Aliado_1', 'Aliado_2', 'Aliado_3'];

    aliados.forEach((key, i) => {
      const x = 120;
      const y = filas[i];
      const data = window.gameData[key];
      const inicioY = y - 75;
      this.add.text(x, inicioY, `Vidas: ${data.vidas}`, estilo).setOrigin(0.5);
      this.add.text(x, inicioY + 45, `Escudos: ${data.escudos}`, estilo).setOrigin(0.5);
      this.add.text(x, inicioY + 90, `Curas: ${data.curas}`, estilo).setOrigin(0.5);
      this.add.text(x, inicioY + 135, `Balas: ${data.balas}`, estilo).setOrigin(0.5);
       
    });

    // Enemigos
    const enemigos = ['Enemigo_1', 'Enemigo_2', 'Enemigo_3'];
    enemigos.forEach((key, i) => {
      const x = 1580;
      const y = filas[i];
      const data = window.gameData[key];
      const inicioY = y - 75;
      this.add.text(x, inicioY, `Vidas: ${data.vidas}`, estilo).setOrigin(0.5);
      this.add.text(x, inicioY + 45, `Escudos: ${data.escudos}`, estilo).setOrigin(0.5);
      this.add.text(x, inicioY + 90, `Curas: ${data.curas}`, estilo).setOrigin(0.5);
      this.add.text(x, inicioY + 135, `Balas: ${data.balas}`, estilo).setOrigin(0.5);
    });
  }
}