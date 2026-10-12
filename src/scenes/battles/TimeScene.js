export default class TimeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'time' });
  }
  preload() {
    this.wg = window.gameData
    this.cursors = this.input.keyboard.createCursorKeys();
    this.imagenes= []
  }
  create() {
    this.capa = 'Historial' //se va a imprimir en el boton
    this.jugadaActual = null
    this.elementos = []

    //boton para cambiar entre escenas
    let turno = this.add.text(850, 800, `ver ${this.capa}`, {
      fontSize: '32px',
      fill: '#ffffff',
      backgroundColor: '#1d1d1d',
      padding: { x: 20, y: 15 }
    }).setInteractive({ useHandCursor: true }).setOrigin(0.5)

    turno.on('pointerdown', () => {
      if (this.capa === 'Batalla') {
        this.capa = 'Historial'
        window.gameData.fase = 'Selección'
        this.limpiar()
        this.volver()
      } else {
        this.capa = 'Batalla'
        window.gameData.fase = 'Historial'
        this.ir() //para todo
        this.mostrarHistorial()
      }
      turno.setText(`ver ${this.capa}`)
    });
  }

  mostrarHistorial() {
    this.limpiar()
    this.jugadaActual = null
    const box = this.wg.The_box

    const titulo = this.add.text(850, 60, 'HISTORIAL DE JUGADAS', {
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5)
    this.elementos.push(titulo)

    const linea = this.add.rectangle(850, 100, 600, 2, 0x555555)
    this.elementos.push(linea)

    const startX = 200
    const y = 200
    const ancho = 180
    const alto = 120
    const espacio = 30

    box.forEach((jugada, i) => {
      const x = startX + i * (ancho + espacio)

      const caja = this.add.rectangle(x, y, ancho, alto, 0x333333)
        .setStrokeStyle(2, 0x666666)
        .setInteractive({ useHandCursor: true })
      this.elementos.push(caja)
      this.imagenes.push(caja)

      const txt = this.add.text(x, y - 20, `Turno ${jugada.jugada}`, {
        fontSize: '22px',
        color: '#ffffff',
      }).setOrigin(0.5)
      this.elementos.push(txt)
      this.imagenes.push(txt)

      const sub = this.add.text(x, y + 20, 'ver', {
        fontSize: '16px',
        color: '#aaaaaa',
      }).setOrigin(0.5)
      this.elementos.push(sub)
      this.imagenes.push(sub)

      caja.on('pointerdown', () => {
        this.mostrarDetalle(jugada)
      })
      caja.on('pointerover', () => caja.setFillStyle(0x444444))
      caja.on('pointerout', () => caja.setFillStyle(0x333333))
    })
  }

  mostrarDetalle(jugada) {
    this.limpiar()
    this.jugadaActual = jugada.jugada

    const estilo = { fontSize: '18px', color: '#ffffff' }
    const estiloAccion = { fontSize: '20px', color: '#66ccff' }
    const nombres = { 1: 'Cura', 2: 'Escudo', 3: 'Recarga', 4: 'Disparo', 5: 'Disparo Doble' }

    const titulo = this.add.text(850, 50, `TURNO ${jugada.jugada}`, {
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5)
    this.elementos.push(titulo)

    const linea = this.add.rectangle(850, 90, 400, 2, 0x555555)
    this.elementos.push(linea)

    // ALIADOS
    const aliados = ['Aliado_1', 'Aliado_2', 'Aliado_3']
    const filasY = [180, 380, 580]

    const tituloA = this.add.text(250, 120, 'ALIADOS', {
      fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5)
    this.elementos.push(tituloA)

    aliados.forEach((key, i) => {
      const x = 250
      const y = filasY[i]
      const data = jugada[key]

      const caja = this.add.rectangle(x, y + 30, 500, 210, 0x222222)
        .setStrokeStyle(1, 0x555555)
      this.elementos.push(caja)

      if (data.vidas <= 0) {
        const nom = this.add.text(x, y, 'ELIMINADO', {
          fontSize: '28px', color: '#ff3333'
        }).setOrigin(0.5)
        this.elementos.push(nom)
      } else {
        const nom = this.add.text(x, y - 40, `Aliado ${i + 1}`, {
          fontSize: '22px', color: '#aaaaff'
        }).setOrigin(0.5)
        this.elementos.push(nom)

        const accionTexto = data.accion !== null ? (nombres[data.accion] || data.accion) : '---'
        const acc = this.add.text(x, y, `Acción: ${accionTexto}`, estiloAccion).setOrigin(0.5)
        this.elementos.push(acc)

        const stats = this.add.text(x, y + 40,
          `Vidas: ${data.vidas}  Escudos: ${data.escudos}  Curas: ${data.curas}  Balas: ${data.balas}`, estilo
        ).setOrigin(0.5)
        this.elementos.push(stats)
      }
    })

    // ENEMIGOS
    const enemigos = ['Enemigo_1', 'Enemigo_2', 'Enemigo_3']

    const tituloE = this.add.text(1450, 120, 'ENEMIGOS', {
      fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5)
    this.elementos.push(tituloE)

    enemigos.forEach((key, i) => {
      const x = 1450
      const y = filasY[i]
      const data = jugada[key]

      const caja = this.add.rectangle(x, y + 30, 500, 210, 0x222222)
        .setStrokeStyle(1, 0x555555)
      this.elementos.push(caja)

      if (data.vidas <= 0) {
        const nom = this.add.text(x, y, 'ELIMINADO', {
          fontSize: '28px', color: '#ff3333'
        }).setOrigin(0.5)
        this.elementos.push(nom)
      } else {
        const nom = this.add.text(x, y - 40, `Enemigo ${i + 1}`, {
          fontSize: '22px', color: '#ff8888'
        }).setOrigin(0.5)
        this.elementos.push(nom)

        const accionTexto = data.accion || '---'
        const acc = this.add.text(x, y, `Acción: ${accionTexto}`, estiloAccion).setOrigin(0.5)
        this.elementos.push(acc)

        const stats = this.add.text(x, y + 40,
          `Vidas: ${data.vidas}  Escudos: ${data.escudos}  Curas: ${data.curas}  Balas: ${data.balas}`, estilo
        ).setOrigin(0.5)
        this.elementos.push(stats)
      }
    })

    // BOTÓN VOLVER
    const btnVolver = this.add.text(850, 720, '← Volver al historial', {
      fontSize: '28px',
      fill: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    }).setInteractive({ useHandCursor: true }).setOrigin(0.5)
    this.elementos.push(btnVolver)

    btnVolver.on('pointerdown', () => this.mostrarHistorial())
    btnVolver.on('pointerover', () => btnVolver.setBackgroundColor('#444444'))
    btnVolver.on('pointerout', () => btnVolver.setBackgroundColor('#333333'))
  }

  limpiar() {
    this.elementos.forEach(el => el.destroy())
    this.elementos = []
  }

  ir() {
    this.scene.stop('vista')
    this.scene.stop('estadisticas')
    this.scene.stop('instrucciones')
    this.scene.stop('codigo')
  }

  volver() {
    this.scene.launch('vista')
  }
  update() {
    if (this.cursors.right.isDown) {
      this.imagenes.forEach((elemento) =>{
        elemento.x -= 5
      })
    }
    if (this.cursors.left.isDown) {
      this.imagenes.forEach((elemento) =>{
        elemento.x += 5
      })
    }
  }
}