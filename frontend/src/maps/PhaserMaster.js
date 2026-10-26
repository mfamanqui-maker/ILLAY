import BaseDatos from "./BaseDatos.js";
import AdministradorMapas from "./chunks/Administrador.js";
import Aldea, { claveInterior } from "./chunks/aldea.js";
import BaseControl from "./BaseControl.js";
import ControlDeCarga from "./controlDeCarga.js";

export default class PhaserMaster extends Phaser.Scene {
  constructor() {
    super({ key: "PhaserMaster" });

    this.baseDatos = null;
    this.administradorMapas = null;
    this.control = null;
    this.jugador = null;
    this.carga = null;
    this.listo = false;
  }

  init(configuracion = {}) {
    this.configuracion = configuracion;
  }

  preload() {
    ControlDeCarga.precargar(this);
  }

  async create() {
    console.log("[Illay] Iniciando mundo...");
    this.listo = false;
    this.carga = new ControlDeCarga(this);
    this.carga.iniciar();

    this.baseDatos = new BaseDatos();
    const seed = this.configuracion?.seed;
    if (Number.isInteger(seed)) {
      this.baseDatos.establecerSemilla(seed);
    } else {
      this.baseDatos.generarSemilla();
    }

    this.control = new BaseControl(this);
    await this.carga.cargarMapas(this.control);
    this.montarMundo();
    await this.carga.mostrarCargados();
    await this.carga.transicion();
    this.listo = true;
    this.scene.launch("uiMapa");
    this.scene.bringToTop("uiMapa");

    console.log(
      "[Illay] Mundo preparado:",
      this.baseDatos.obtenerSemilla()
    );
  }

  montarMundo() {
    this.administradorMapas = new AdministradorMapas(
      this,
      this.baseDatos
    );

    this.administradorMapas.iniciarGeneracion();
    this.administradorMapas.prepararTerreno(this);
    this.administradorMapas.pintarTerreno();

    const mundo = this.administradorMapas.obtenerExtensionMundo();
    this.physics.world.setBounds(0, 0, mundo.ancho, mundo.alto);
    this.cameras.main.setBounds(0, 0, mundo.ancho, mundo.alto);

    this.aldea = new Aldea(this);
    this.aldea.montar();
    this.enAldea = false;
    this.puntoRetorno = null;

    // Tecla ENTER para la interacción con las aldeas
    this.teclaEntrar = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );

    // Sistema de Pausa con ESC (Código rescatado de tu amigo)
    this.input.keyboard.on('keydown-ESC', this.abrirMenuPausa, this);
    this.events.once('shutdown', () => {
      this.input.keyboard.off('keydown-ESC', this.abrirMenuPausa, this);
    });

    const spawn = this.aldea.punto("inicio", 9);
    this.jugador = this.control.crearJugador(spawn.x, spawn.y);
    this.jugador.setCollideWorldBounds(true);
    this.colisionTronco = this.physics.add.collider(
      this.jugador,
      this.administradorMapas.obtenerCapaTronco()
    );
    this.colisionAgua = this.physics.add.collider(
      this.jugador,
      this.administradorMapas.obtenerCapaSuelo()
    );

    this.entrarAldea("inicio", true);
  }

  // Método de menú de pausa con ESC rescatado e integrado
  abrirMenuPausa(event) {
    if (event?.repeat || !this.listo || !this.enAldea) return;

    const mapa = this.aldea.mapaActivo();
    if (!mapa) return;

    this.scene.pause();
    this.scene.launch('iuDeMapa', {
      map: mapa,
      player: this.jugador,
      interactions: this.interaccionesMapa || [],
      puntosBatalla: this.aldea.puntosBatalla(),
      zonasInterior: this.aldea.zonasInterior(),
      worldSceneKey: this.scene.key
    });
    this.scene.bringToTop('iuDeMapa');
  }

  update() {
    if (!this.listo) return;
    this.control?.update();
    if (!Phaser.Input.Keyboard.JustDown(this.teclaEntrar)) return;

    if (this.enAldea) {
      const zona = this.aldea.zonaInteriorCercana(this.jugador);
      if (this.aldea.encimaDeSalida(this.jugador)) this.salirAlBosque();
      else if (zona) console.log(zona.mensaje);
      else if (this.aldea.puntoBatallaCercano(this.jugador)) this.iniciarBatalla();
      return;
    }

    const tile = 32;
    const tx = Math.floor(this.jugador.x / tile);
    const ty = Math.floor(this.jugador.y / tile);
    const aldea = this.administradorMapas.aldeaPegada(tx, ty);
    if (aldea) this.entrarAldea(aldea.nombre);
  }

  iniciarBatalla() {
    if (this.scene.isActive("iuDeMapa")) this.scene.stop("iuDeMapa");
    if (this.scene.isActive("uiMapa")) this.scene.stop("uiMapa");
    this.scene.start("vista", {});
  }

  entrarAldea(nombre, inicial = false) {
    if (!inicial) {
      this.puntoRetorno = { x: this.jugador.x, y: this.jugador.y };
    }

    const clave = claveInterior(nombre);
    const registro = this.aldea.mostrar(clave);
    const id = inicial ? registro.definicion.puntoInicio ?? registro.definicion.puntoEntrada
      : registro.definicion.puntoEntrada;
    const punto = this.aldea.punto(clave, id);

    this.fijarBosque(false);
    this.colocarJugador(punto.x, punto.y);
    this.enAldea = true;
    console.log(`[Aldea] Dentro de ${clave}`);
  }

  salirAlBosque() {
    const destino = this.puntoRetorno
      ?? this.administradorMapas.puntoJuntoA("suroeste");

    this.aldea.ocultar();
    this.fijarBosque(true);

    const mundo = this.administradorMapas.obtenerExtensionMundo();
    this.physics.world.setBounds(0, 0, mundo.ancho, mundo.alto);
    this.cameras.main.setBounds(0, 0, mundo.ancho, mundo.alto);
    this.colocarJugador(destino.x, destino.y);
    this.enAldea = false;
    console.log("[Aldea] De vuelta al bosque");
  }

  fijarBosque(visible) {
    this.administradorMapas.fijarTerrenoVisible(visible);
    if (this.colisionTronco) this.colisionTronco.active = visible;
    if (this.colisionAgua) this.colisionAgua.active = visible;
  }

  colocarJugador(x, y) {
    this.cameras.main.stopFollow();
    this.jugador.setPosition(x, y);
    this.jugador.setDepth(y + 50);
    this.cameras.main.centerOn(x, y);
    this.cameras.main.startFollow(this.jugador, false, 0.1, 0.1);
  }

  obtenerJugador() {
    return this.jugador;
  }

  obtenerBaseDatos() {
    return this.baseDatos;
  }

  obtenerAdministradorMapas() {
    return this.administradorMapas;
  }
}
