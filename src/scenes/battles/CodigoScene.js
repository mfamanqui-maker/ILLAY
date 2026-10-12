export default class CodigoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'codigo' });
  }

  preload() {
    this.tecla1 = this.input.keyboard.addKey('ONE')
    this.tecla2 = this.input.keyboard.addKey('TWO')
    this.tecla3 = this.input.keyboard.addKey('THREE')
    this.tecla4 = this.input.keyboard.addKey('FOUR')
    this.tecla5 = this.input.keyboard.addKey('FIVE')
    this.teclaEnter = this.input.keyboard.addKey('ENTER')
  }

  create() {
    window.gameData.fase = 'Selección'
    this.data = window.gameData.seleccion
    this.wg = window.gameData
    this.confirmacion = []
    this.bloqueosRestantes = 0
    this.selector = 0
    this.curador = null
    if (!this.wg.jugada) {
      this.guardar_jugada()
    }
  }

  update() {
    // ══════════════════════════════════════
    // FASE: Selección de acciones del jugador
    // ══════════════════════════════════════
    if (this.wg.fase === 'Selección') {
      if (Phaser.Input.Keyboard.JustDown(this.tecla1)) {
        this.seleccion(this.data.aliado, 1)
        if (this.wg.fase !== 'Error') {
          this.curador = this.data.aliado
          this.wg.fase = 'Curar?'
          this.data.aliado = null
          this.refrescar()
        }
      }
      if (Phaser.Input.Keyboard.JustDown(this.tecla2)) {
        this.seleccion(this.data.aliado, 2)
      }
      if (Phaser.Input.Keyboard.JustDown(this.tecla3)) {
        this.seleccion(this.data.aliado, 3)
      }
      if (Phaser.Input.Keyboard.JustDown(this.tecla4)) {
        if (this.wg.enemigos_vivos.includes(`Enemigo_${this.data.aliado[7]}`)) {
          this.seleccion(this.data.aliado, 4)
        } else {
          this.seleccion(this.data.aliado, 4)
          if (this.wg.fase !== 'Error') {
            this.wg.fase = 'Objetivo?'
            this.data.enemigo = null
            this.refrescar()
          } 
        }
      }
      if (Phaser.Input.Keyboard.JustDown(this.tecla5)) {
        this.seleccion(this.data.aliado, 5)
        if (this.wg.fase !== 'Error') {
            this.wg.fase = 'Objetivo?'
            this.data.enemigo = null
            this.refrescar()
        } 
      }

      // Confirmar con ENTER cuando todos los aliados vivos tienen acción
      if (Phaser.Input.Keyboard.JustDown(this.teclaEnter) && this.confirmacion.length === this.wg.aliados_vivos.length) {
        this.wg.Aliado_1.objetivo_anterior=null
        this.wg.Aliado_2.objetivo_anterior=null
        this.wg.Aliado_3.objetivo_anterior=null
        this.wg.fase = 'PC'
        this.movePC()

        // Accionar solo aliados vivos
        this.wg.aliados_vivos.forEach((aliado) => {
          this.accionar(aliado, this.wg[aliado].accion)
        })

        // Limpiar objetivo_cura DESPUÉS de accionar
        this.wg.Aliado_1.objetivo_cura=null
        this.wg.Aliado_2.objetivo_cura=null
        this.wg.Aliado_3.objetivo_cura=null
        this.refrescar()

        // Contar escudos activos
        this.bloqueosRestantes = 0
        if (this.wg.Aliado_1.escudo) this.bloqueosRestantes++
        if (this.wg.Aliado_2.escudo) this.bloqueosRestantes++
        if (this.wg.Aliado_3.escudo) this.bloqueosRestantes++

        // ¿Hay escudos y proyectiles enemigos? → Fase Bloqueo
        if (this.bloqueosRestantes > 0 && this.wg.objetivos_E.length > 0) {
          this.wg.fase = 'Bloqueo'
          this.wg.seleccion.enemigo = null
          this.refrescar()
        } else {
          this.daño()
          this.refrescar()
        }
      }

    // ══════════════════════════════════════
    // FASE: Mostrar acciones del PC
    // ══════════════════════════════════════
    } else if (this.wg.fase === 'PC') {
      if (Phaser.Input.Keyboard.JustDown(this.teclaEnter)) {
        // Verificar victoria o derrota
        if (this.wg.enemigos_vivos.length === 0 || this.wg.aliados_vivos.length === 0) {
          this.scene.stop("instrucciones")
          this.scene.stop("time")
          this.scene.stop("vista")
          this.scene.stop("estadisticas")
          this.scene.launch('globalMap')
          this.scene.stop("codigo")
          return
        }
        this.guardar_jugada()
        this.wg.Aliado_1.accion = null
        this.wg.Aliado_2.accion = null
        this.wg.Aliado_3.accion = null
        // Limpiar acciones de enemigos muertos
        const todosEnemigos = ['Enemigo_1', 'Enemigo_2', 'Enemigo_3']
        todosEnemigos.forEach(e => {
          if (!this.wg.enemigos_vivos.includes(e)) {
            this.wg[e].accion = null
          }
        })
        this.wg.fase = 'Selección' 
        this.wg.vigencia = null,
        this.refrescar()
      }
    // ══════════════════════════════════════
    // FASE: Seleccionar aliado para curar
    // ══════════════════════════════════════
    } else if (this.wg.fase === 'Curar?') {
      if (this.wg.seleccion.aliado) {
        const aliadoObjetivo = this.wg.seleccion.aliado
        const datos = this.wg[aliadoObjetivo]
        // Puede curar si: está vivo y no a vida máxima, O está muerto y tiene Z
        if (this.wg.aliados_vivos.includes(aliadoObjetivo)) {
          if (datos.vidas < datos.vida_maxima) {
            this.wg[this.curador].objetivo_cura = aliadoObjetivo
            this.data.aliado = this.curador
            this.wg.seleccion.aliado = this.curador
            this.wg.fase = 'Selección'
            this.refrescar()
          } else {
            this.wg.seleccion.aliado = null
          }
        } else if (datos.Z) {
          // Está muerto pero puede revivir
          this.wg[this.curador].objetivo_cura = aliadoObjetivo
          this.data.aliado = this.curador
          this.wg.seleccion.aliado = this.curador
          this.wg.fase = 'Selección'
          this.refrescar()
        } else {
          // Muerte definitiva, no se puede revivir
          this.wg.seleccion.aliado = null
        }
      }  
    // ══════════════════════════════════════
    // FASE: Seleccionar objetivo del disparo
    // ══════════════════════════════════════
    } else if (this.wg.fase === 'Objetivo?') {
      if (this.wg.seleccion.enemigo) {
        if (!(this.wg.enemigos_vivos.includes(`Enemigo_${this.data.aliado[7]}`)) && this.wg[this.data.aliado].accion === 5) {
          if (this.selector === 0) {
            this.wg[this.data.aliado].objetivo_anterior = []
            this.wg.objetivos_A.push(this.wg.seleccion.enemigo)
            this.wg[this.data.aliado].objetivo_anterior.push(this.wg.seleccion.enemigo)
            this.wg.seleccion.enemigo = null
            this.refrescar()
            this.selector = 1
          } else {
            this.wg.objetivos_A.push(this.wg.seleccion.enemigo)
            this.wg[this.data.aliado].objetivo_anterior.push(this.wg.seleccion.enemigo)
            this.wg.seleccion.enemigo = null
            this.wg.fase = 'Selección'
            this.refrescar()
            this.selector = 0
          }
        } else {
          this.wg.objetivos_A.push(this.wg.seleccion.enemigo)
          this.wg[this.data.aliado].objetivo_anterior = this.wg.seleccion.enemigo
          this.wg.seleccion.enemigo = null
          this.wg.fase = 'Selección'
          this.refrescar()
        }
     }
  
    // ══════════════════════════════════════
    // FASE: Bloqueo de proyectiles enemigos
    // ══════════════════════════════════════
    } else if (this.wg.fase === 'Bloqueo') {
      if (this.wg.seleccion.enemigo) {
        const enemigoClick = this.wg.seleccion.enemigo
        const enemigoData = this.wg[enemigoClick]

        // Solo bloquear si esa entidad realmente disparó
        if (enemigoData && (enemigoData.accion === 'Disparo' || enemigoData.accion === 'Disparo Doble')) {
          if (this.wg.objetivos_E.length > 0) {
            this.wg.objetivos_E.splice(0, 1)
            this.bloqueosRestantes--

            // Gastar el escudo del primer aliado que lo tenga activo
            const aliados = ['Aliado_1', 'Aliado_2', 'Aliado_3']
            for (let i = 0; i < 3; i++) {
              if (this.wg[aliados[i]].escudo) {
                this.wg[aliados[i]].escudos--
                this.wg[aliados[i]].escudo = false
                break
              }
            }
          }
          this.wg.seleccion.enemigo = null

          // ¿Quedan más bloqueos y proyectiles?
          if (this.bloqueosRestantes > 0 && this.wg.objetivos_E.length > 0) {
            this.refrescar()
          } else {
            this.daño()
            this.guardar_jugada()
            this.wg.Aliado_1.accion = null
            this.wg.Aliado_2.accion = null
            this.wg.Aliado_3.accion = null
            this.wg.vigencia = null, 
            this.wg.fase = 'Selección'
            this.refrescar()
          }
        } else {
          // Esa entidad no disparó, ignorar click
          this.wg.seleccion.enemigo = null
        }
      }
    }
  }

  // ══════════════════════════════════════
  // VALIDACIÓN: ¿Puede hacer esta acción?
  // ══════════════════════════════════════
  puedeHacer(entidad, tecla) {
    if (tecla === 1 && entidad.curas <= 0) return false
    if (tecla === 2 && entidad.escudos <= 0) return false
    if (tecla === 4 && entidad.balas < 1) return false
    if (tecla === 5 && entidad.balas < 2) return false
    return true
  }

  // ══════════════════════════════════════
  // DAÑO: Resolver proyectiles
  // ══════════════════════════════════════
  daño() {
    let bloqueo = false
    const win = window.gameData
    const enemigos = ['Enemigo_1', 'Enemigo_2', 'Enemigo_3']

    // Proyectiles aliados → hacen daño a enemigos
    win.objetivos_A.forEach((enemigo) => {
      // Buscar escudo del enemigo MÁS vulnerable (menos vidas) para bloquear
      let escudero = null
      let menorVida = Infinity
      for (let i = 0; i < 3; i++) {
        if (win[enemigos[i]].escudo && win[enemigos[i]].vidas < menorVida) {
          escudero = i
          menorVida = win[enemigos[i]].vidas
        }
      }
      if (escudero !== null) {
        win[enemigo].escudos--
        win[enemigos[escudero]].escudo = false
        bloqueo = true
      }
      if (!bloqueo) {
        win[enemigo].vidas--
        if (win[enemigo].vidas <= 0) {
          win.vigencia = 'activa'
          const posicion = win.enemigos_vivos.indexOf(enemigo)
          this.wg.botonesEnemigos[Number(enemigo[8])-1].setFillStyle(0x131313)
          if (posicion !== -1) {
            win.enemigos_vivos.splice(posicion, 1)
          }
        }
      }
      bloqueo = false
    });

    // Proyectiles enemigos → hacen daño a aliados
    win.objetivos_E.forEach((aliado) => {
      win[aliado].vidas--
      if (win[aliado].vidas <= 0) {
        const posicion = win.aliados_vivos.indexOf(aliado)
        const idx = Number(aliado[7])-1
        if (!win[aliado].Z) {
          // Ya fue revivido, muerte definitiva
          this.wg.botonesAliados[idx].setFillStyle(0x000000)
          this.wg.textosAliados[idx].setText('')
        } else {
          this.wg.botonesAliados[idx].setFillStyle(0x131313)
        }
        if (posicion !== -1) {
          win.aliados_vivos.splice(posicion, 1)
        }
      }
    });

    // Limpiar arrays y escudos
    win.objetivos_A.splice(0, 6)
    win.objetivos_E.splice(0, 6)
    win.Enemigo_1.escudo = false
    win.Enemigo_2.escudo = false
    win.Enemigo_3.escudo = false
    win.Aliado_1.escudo = false
    win.Aliado_2.escudo = false
    win.Aliado_3.escudo = false

    // Verificar victoria/derrota → mostrar en fase PC primero
    if (win.enemigos_vivos.length === 0 || win.aliados_vivos.length === 0) {
      this.wg.fase = 'PC'
    }
  }

  // ══════════════════════════════════════
  // SELECCIÓN: Asignar acción a un aliado
  // ══════════════════════════════════════
  seleccion(aliado, tecla) {
    if (!aliado) return

    const aliadoW = this.wg[aliado]

    // Validar si puede hacer la acción
    if (!this.puedeHacer(aliadoW, tecla) || (this.wg.Aliado_1.vidas + this.wg.Aliado_2.vidas + this.wg.Aliado_3.vidas === 10 && tecla === 1)) {
      this.wg.fase = 'Error'
      this.refrescar()
      this.time.delayedCall(1000, () => {
        this.wg.fase = 'Selección'
        this.refrescar()
      })
      return
    }

    // Registrar en confirmación (reemplazar si ya existía)
    let pertenecer = null
    this.confirmacion.forEach((value,i) => {
      if (aliado === this.confirmacion[i]) {
        pertenecer = true
        this.confirmacion.splice(i, 1)
        this.confirmacion.push(aliado)
      }
    })
    if (this.wg[aliado].objetivo_anterior !== null) {
      if (!(this.wg.enemigos_vivos.includes(`Enemigo_${aliado[7]}`)) && aliadoW.accion === 5) {
        this.wg[aliado].objetivo_anterior.forEach((value) => {
          this.wg.objetivos_A.splice(this.wg.objetivos_A.indexOf(value), 1)
        })
      } else {
        this.wg.objetivos_A.splice(this.wg.objetivos_A.indexOf(this.wg[aliado].objetivo_anterior), 1)
      }
    } 

    if (!pertenecer) {
      this.confirmacion.push(aliado)
    }

    aliadoW.accion = tecla
    this.refrescar()
  }
  
  // ══════════════════════════════════════
  // REFRESCAR: Redibujar escenas de UI
  // ══════════════════════════════════════
  refrescar() {
    this.scene.stop('estadisticas')
    this.scene.launch('estadisticas')
    this.scene.stop('instrucciones')
    this.scene.launch('instrucciones')
  }
  // ══════════════════════════════════════
  // GUARDAR_JUGADA: agrega un elemento a The_box
  // ══════════════════════════════════════
  guardar_jugada() {
    this.wg.jugada++
    const w = this.wg
    const obj = {
      jugada: this.wg.jugada,
      Aliado_1: {
        vidas: w.Aliado_1.vidas,
        escudos: w.Aliado_1.escudos,
        curas: w.Aliado_1.curas,
        balas: w.Aliado_1.balas,
        accion: w.Aliado_1.accion,
      },
      Aliado_2: {
        vidas: w.Aliado_2.vidas,
        escudos: w.Aliado_2.escudos,
        curas: w.Aliado_2.curas,
        balas: w.Aliado_2.balas,
        accion: w.Aliado_2.accion,
      },
      Aliado_3: {
        vidas: w.Aliado_3.vidas,
        escudos: w.Aliado_3.escudos,
        curas: w.Aliado_3.curas,
        balas: w.Aliado_3.balas,
        accion: w.Aliado_3.accion,
      },
      Enemigo_1: {
        vidas: w.Enemigo_1.vidas,
        escudos: w.Enemigo_1.escudos,
        curas: w.Enemigo_1.curas,
        balas: w.Enemigo_1.balas,
        accion: w.Enemigo_1.accion,
      },
      Enemigo_2: {
        vidas: w.Enemigo_2.vidas,
        escudos: w.Enemigo_2.escudos,
        curas: w.Enemigo_2.curas,
        balas: w.Enemigo_2.balas,
        accion: w.Enemigo_2.accion,
      },
      Enemigo_3: {
        vidas: w.Enemigo_3.vidas,
        escudos: w.Enemigo_3.escudos,
        curas: w.Enemigo_3.curas,
        balas: w.Enemigo_3.balas,
        accion: w.Enemigo_3.accion,
      }
    }
    w.The_box.push(obj)
  }

  // ══════════════════════════════════════
  // ACCIONAR: Ejecutar acción de un aliado
  // ══════════════════════════════════════
  accionar(aliado, tecla) {
    const aliadoW = this.wg[aliado]
    const objetivos = this.wg.objetivos_A
    if (tecla === 1) {
      aliadoW.curas--
      const objetivo = aliadoW.objetivo_cura || aliado
      // Si estaba muerto, revivir con 1 vida
      if (!(this.wg.aliados_vivos.includes(objetivo))) {
        this.wg[objetivo].vidas = 1
        this.wg[objetivo].Z = false
        this.wg.aliados_vivos.push(objetivo)
        this.wg.botonesAliados[Number(objetivo[7])-1].setFillStyle(0x4B0082)
      } else {
        this.wg[objetivo].vidas++
      }
    }
    if (tecla === 2) {
      aliadoW.escudo = true
    }
    if (tecla === 3) {
      aliadoW.balas++
    }
    if (tecla === 4) {
      if (this.wg.enemigos_vivos.includes(`Enemigo_${aliado[7]}`)) {
        objetivos.push(`Enemigo_${aliado[7]}`)
      } 
      aliadoW.balas--
    }
    if (tecla === 5) {
      if (this.wg.enemigos_vivos.includes(`Enemigo_${aliado[7]}`)) {
        objetivos.push(`Enemigo_${aliado[7]}`)
      } 
      aliadoW.balas -= 2
    }
  }

  // ══════════════════════════════════════
  // MOVE PC: IA elige acciones para enemigos
  // ══════════════════════════════════════
  movePC() {
    this.confirmacion.splice(0, 3)
    const enemigos = this.wg.enemigos_vivos
    const nombres = ['Cura', 'Escudo', 'Recarga', 'Disparo', 'Disparo Doble']

    enemigos.forEach((enemig, i) => {
      this.el = enemig
      this.recolectarDatos()
      const tecla = this.calculoDePrioridades()
      this.wg[enemig].accion = nombres[tecla - 1]
      const objetivos = this.wg.objetivos_E

          if (tecla === 1) {
            this.seleccionDeObjetivo('curar')
          }
          if (tecla === 2) {
            this.wg[enemig].escudo = true
          }
          if (tecla === 3) {
            this.wg[enemig].balas++
          }
          if (tecla === 4) {
            this.wg[enemig].balas--
            if (this.wg.aliados_vivos.includes(`Aliado_${String(enemigos[i])[8]}`)) {
              objetivos.push(`Aliado_${String(enemigos[i])[8]}`)
            } else {
              this.seleccionDeObjetivo ('disparar')
            }
          }
          if (tecla === 5) {
            this.wg[enemig].balas -= 2

            if (this.wg.aliados_vivos.includes(`Aliado_${String(enemigos[i])[8]}`)) {
              objetivos.push(`Aliado_${String(enemigos[i])[8]}`)
              this.seleccionDeObjetivo ('disparar')
            } else {
              this.seleccionDeObjetivo ('disparar 2 veces')
            }
          }
        
    })
    this.refrescar()
  }

  // ══════════════════════════════════════
  // RECOLECTAR DATOS: Llenar los 4 objetos de información
  // ══════════════════════════════════════
  recolectarDatos() {
    const w = this.wg
    const yo = w[this.el]

    // Zombiosis: ¿Puedo curar/revivir aliados enemigos?
    this.zombiosis = {
      vidasEnemigos: {
        Enemigo_1: w.Enemigo_1.vidas,
        Enemigo_2: w.Enemigo_2.vidas,
        Enemigo_3: w.Enemigo_3.vidas,
      },
      misCuras: yo.curas,
      zEnemigos: {
        Enemigo_1: w.Enemigo_1.Z,
        Enemigo_2: w.Enemigo_2.Z,
        Enemigo_3: w.Enemigo_3.Z,
      },
      enemigosVivos: [...w.enemigos_vivos]
    }

    // Riesgos: ¿Cuánto daño puedo hacer?
    this.riesgos = {
      misBalas: yo.balas,
      aliadosVivos: [...w.aliados_vivos],
      vidasAliados: {
        Aliado_1: w.Aliado_1.vidas,
        Aliado_2: w.Aliado_2.vidas,
        Aliado_3: w.Aliado_3.vidas,
      },
      escudosAliados: {
        Aliado_1: w.Aliado_1.escudos,
        Aliado_2: w.Aliado_2.escudos,
        Aliado_3: w.Aliado_3.escudos,
      },
      curasAliados: {
        Aliado_1: w.Aliado_1.curas,
        Aliado_2: w.Aliado_2.curas,
        Aliado_3: w.Aliado_3.curas,
      }
    }

    // Amenaza: ¿Cuánto peligro hay para mí?
    this.amenaza = {
      misEscudos: yo.escudos,
      misVidas: yo.vidas,
      balasAliados: {
        Aliado_1: w.Aliado_1.balas,
        Aliado_2: w.Aliado_2.balas,
        Aliado_3: w.Aliado_3.balas,
      },
      vidasEnemigos: {
        Enemigo_1: w.Enemigo_1.vidas,
        Enemigo_2: w.Enemigo_2.vidas,
        Enemigo_3: w.Enemigo_3.vidas,
      }
    }

    // Bloquear: ¿Debo defenderme?
    this.bloquear = {
      objetivosAliados: [...w.objetivos_A],
      miEscudoActivo: yo.escudo,
      vidasEnemigos: {
        Enemigo_1: w.Enemigo_1.vidas,
        Enemigo_2: w.Enemigo_2.vidas,
        Enemigo_3: w.Enemigo_3.vidas,
      }
    }
  }

  
  // ══════════════════════════════════════
  // CALCULO DE PRIORIDADES: Evaluar y elegir acción
  // ══════════════════════════════════════
  calculoDePrioridades() {
    let pCurar = 0
    let pBloquear = 0
    let pRecargar = 0
    let pDisparar = 0
    let pDispararDoble = 0
    //maximo puntaje 20 y minimo 0
    const z = this.zombiosis
    const m = this.amenaza
    const r = this.riesgos
    const b = this.bloquear
    // curar?
    const vidaTotalEnemigos = z.vidasEnemigos.Enemigo_1 + z.vidasEnemigos.Enemigo_2 + z.vidasEnemigos.Enemigo_3
    if (z.misCuras > 0 && vidaTotalEnemigos < 8) {
      pCurar += (3-z.enemigosVivos.length)*(Math.random()*4)
      pCurar += (7-vidaTotalEnemigos)*(Math.random()*2)
    }
    //bloquear?
    if (m.misEscudos  > 0 && vidaTotalEnemigos < 8) {
      if (m.balasAliados.Aliado_1 >= 2) pBloquear += (Math.random()*14)/3
      if (m.balasAliados.Aliado_2 >= 2) pBloquear += (Math.random()*14)/3
      if (m.balasAliados.Aliado_3 >= 2) pBloquear += (Math.random()*14)/3
      pBloquear += (7-vidaTotalEnemigos)*(Math.random()*1.5)
    }
    //recargar
    if (m.balasAliados.Aliado_1 < 2) pRecargar += (Math.random()*10)/3
    if (m.balasAliados.Aliado_2 < 2) pRecargar += (Math.random()*10)/3
    if (m.balasAliados.Aliado_3 < 2) pRecargar += (Math.random()*10)/3
    pRecargar += (vidaTotalEnemigos)*(Math.random())

    //disparo simple
    if (r.misBalas > 0) {
      pDisparar = 8
      if (m.balasAliados.Aliado_1 >= 2) pDisparar -= (Math.random()*5)
      if (m.balasAliados.Aliado_2 >= 2) pDisparar -= (Math.random()*5)
      if (m.balasAliados.Aliado_3 >= 2) pDisparar -= (Math.random()*5)
    }
    //disparo doble 
    if (r.misBalas > 1) {
      pDispararDoble = 15
      if (m.balasAliados.Aliado_1 >= 2) pDispararDoble -= (Math.random()*5)
      if (m.balasAliados.Aliado_2 >= 2) pDispararDoble -= (Math.random()*5)
      if (m.balasAliados.Aliado_3 >= 2) pDispararDoble -= (Math.random()*5)
    }

    // ── ELEGIR MÁXIMO ──
    const puntajes = [pCurar, pBloquear, pRecargar, pDisparar, pDispararDoble]
    let max = -Infinity
    let indiceMax = 2
    puntajes.forEach((value, i) => {
      if (value > max) {
        max = value
        indiceMax = i
      }
    })
    return indiceMax + 1
  }
  

  seleccionDeObjetivo(tipo) {
    if (tipo === 'curar') {
      const Enemigos = ['Enemigo_1', 'Enemigo_2', 'Enemigo_3']
      const enemigoMasErido = this.seleccionarMenor (Enemigos, 'vidas', true)
      this.wg[this.el].curas--
      if (this.wg[enemigoMasErido].vidas <= 0 ) {
        this.wg[enemigoMasErido].vidas = 1
        this.wg[enemigoMasErido].Z = false
        this.wg.enemigos_vivos.push(enemigoMasErido)
        this.wg.botonesEnemigos[Number(enemigoMasErido[8])-1].setFillStyle(0x4B0082)
      } else {
        this.wg[enemigoMasErido].vidas++
      }
    } else  if (tipo === 'disparar') {
      const Aliados = ['Aliado_1', 'Aliado_2','Aliado_3']
      const aliadoMasErido = this.seleccionarMenor (Aliados, 'vidas', false)
      this.wg.objetivos_E.push(aliadoMasErido)
    } else if (tipo === 'disparar 2 veces') {
      const Aliados = ['Aliado_1', 'Aliado_2','Aliado_3']
      const aliadoMasErido = this.seleccionarMenor (Aliados, 'vidas', false)
      this.wg.objetivos_E.push(aliadoMasErido)
      this.wg.objetivos_E.push(aliadoMasErido)
    }
  }
  seleccionarMenor (array, cualidad, muertos) {
    let min = Infinity
    let minN;
    const w = this.wg
    if (muertos) {
      array.forEach ((value) => {
          if (w[value][cualidad] < min && w[value].Z) {
            minN=value
            min=w[value][cualidad]
          }
      })
    } else {
      array.forEach ((value) => {
          if (w[value][cualidad] < min && w.aliados_vivos.includes(value)) {
            minN=value
            min=w[value][cualidad]
          }
      })
    }
    return minN
    console.log("Advincula, quiero keke")
  }
}