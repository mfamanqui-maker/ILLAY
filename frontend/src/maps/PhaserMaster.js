
import BaseDatos from "./BaseDatos.js";

export default class PhaserMaster extends Phaser.Scene {
  constructor() {
    // Esta es la clave con la que Phaser identifica la escena.
    super({ key: "PhaserMaster" });

    this.baseDatos = null;
    this.inicializado = false;
  }

  // Se ejecuta al iniciar la escena.
  init(configuracion = {}) {
    this.configuracion = configuracion;
  }

  // Se ejecuta cuando Phaser inicia la escena.
  create() {
    // Crear una única base de datos para esta instancia.
    if (!this.baseDatos) {
      this.baseDatos = new BaseDatos();
    }

    // Inicializar los datos de la partida si nos pasan una semilla.
    if (Number.isInteger(this.configuracion?.seed)) {
      this.baseDatos.establecerSemilla(
        this.configuracion.seed
      );
    }

    this.inicializado = true;

    console.log("PhaserMaster iniciado.");

    // Punto de integración futuro:
    // 1. WorldGenerator
    // 2. MapManager
    // 3. BaseControl
    // 4. CaracteristicaObjeto
  }

  // Acceso controlado a la base de datos.
  obtenerBaseDatos() {
    if (!this.baseDatos) {
      throw new Error(
        "PhaserMaster todavía no ha sido inicializado."
      );
    }

    return this.baseDatos;
  }

  // Comprobar si el sistema está preparado.
  estaInicializado() {
    return this.inicializado;
  }

  // Preparado para coordinar futuras operaciones.
  update() {
    // No necesitamos lógica de actualización todavía.
  }
}
