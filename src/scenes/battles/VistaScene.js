export default class VistaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'vista' });
  }

  preload() {
    this.scene.launch('estadisticas')
    this.scene.launch('codigo')
    this.scene.launch('instrucciones')
    this.scene.launch('time')
  }

  create() {
    const filas = [150, 450, 750];

    // Aliados (izquierda)
    const nombresAliados = ['Aliado_1', 'Aliado_2', 'Aliado_3'];

    filas.forEach((y, i) => {
      this.add.rectangle(120, y, 150, 220, 0x444444)

      // Determinar color del botón según estado
      let colorBoton = 0x444444
      const aliado = window.gameData[nombresAliados[i]]
      if (!window.gameData.aliados_vivos.includes(nombresAliados[i])) {
        if (!aliado.Z) {
          colorBoton = 0x000000 // muerte definitiva
        } else {
          colorBoton = 0x131313 // muerto, puede revivir
        }
      } else if (!aliado.Z && aliado.vidas > 0) {
        colorBoton = 0x4B0082 // revivido (zombie)
      }

      const boton = this.add.circle(330, y, 90, colorBoton).setInteractive({
        useHandCursor: true
      })
      window.gameData.botonesAliados.push(boton)
      boton.on('pointerdown', () => {
        if (window.gameData.aliados_vivos.includes(nombresAliados[i]) || window.gameData.fase === 'Curar?') {
          window.gameData.seleccion.aliado = nombresAliados[i]
          this.children.list.forEach(child => child.setAlpha(1));
          boton.setAlpha(0.5);
        }
      });

      // Texto: vacío si muerte definitiva
      const textoNombre = (!window.gameData.aliados_vivos.includes(nombresAliados[i]) && !aliado.Z) ? '' : nombresAliados[i]
      const texto = this.add.text(330, y, textoNombre, {
        fontSize: '16px',
        color: '#ffffff'
      }).setOrigin(0.5);
      window.gameData.textosAliados.push(texto)
    });
    // Enemigos (derecha)
    const nombresEnemigos = ['Enemigo_1', 'Enemigo_2', 'Enemigo_3'];
    filas.forEach((y, i) => {
      this.add.rectangle(1580, y, 150, 220, 0x444444)

      // Determinar color del botón según estado
      let colorBoton = 0x444444
      const enemigo = window.gameData[nombresEnemigos[i]]
      if (!window.gameData.enemigos_vivos.includes(nombresEnemigos[i])) {
        if (!enemigo.Z) {
          colorBoton = 0x000000
        } else {
          colorBoton = 0x131313
        }
      } else if (!enemigo.Z && enemigo.vidas > 0) {
        colorBoton = 0x4B0082
      }

      const boton = this.add.circle(1370, y, 90, colorBoton).setInteractive({
        useHandCursor: true
      })
      window.gameData.botonesEnemigos.push(boton)
      boton.on('pointerdown', () => {
        if (window.gameData.enemigos_vivos.includes(nombresEnemigos[i])) {
          window.gameData.seleccion.enemigo = nombresEnemigos[i]
          this.children.list.forEach(child => child.setAlpha(1));
          boton.setAlpha(0.5);
        }
      });

      const textoNombre = (!window.gameData.enemigos_vivos.includes(nombresEnemigos[i]) && !enemigo.Z) ? '' : nombresEnemigos[i]
      const texto = this.add.text(1370, y, textoNombre, {
        fontSize: '16px',
        color: '#ffffff'
      }).setOrigin(0.5);
      window.gameData.textosEnemigos.push(texto)

    });
  }
}