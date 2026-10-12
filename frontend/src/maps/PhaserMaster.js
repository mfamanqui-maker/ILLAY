import BaseDatos from "./BaseDatos.js";
import AdministradorMapas from "./chunks/Administrador.js";

export default class PhaserMaster extends Phaser.Scene {
  constructor() {
    super({ key: "PhaserMaster" });

    this.baseDatos = null;
    this.administradorMapas = null;
  }

  init(configuracion = {}) {
    this.configuracion = configuracion;
  }

  create() {
    console.log("[Illay] Iniciando mundo...");

    this.baseDatos = new BaseDatos();

    const seed = this.configuracion?.seed;

    if (Number.isInteger(seed)) {
      // Recuperar la identidad de una partida existente.
      this.baseDatos.establecerSemilla(seed);
    } else {
      // Crear un mundo nuevo.
      this.baseDatos.generarSemilla();
    }

    this.administradorMapas = new AdministradorMapas(
      this.baseDatos
    );

    this.administradorMapas.iniciarGeneracion();

    console.log(
      "[Illay] Mundo preparado:",
      this.baseDatos.obtenerSemilla()
    );
  }

  obtenerBaseDatos() {
    return this.baseDatos;
  }

  obtenerAdministradorMapas() {
    return this.administradorMapas;
  }
}
