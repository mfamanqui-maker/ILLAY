export default class BaseDatos {
  constructor() {
    this.seed = null;

    // Configuración compartida del mundo.
    this.configuracion = {
      chunksPorLado: 64,
      tilesPorChunk: 32,
      pixelesPorTile: 32,
      distanciaBordeBiomas: 2
    };

    // Espacio reservado para futuros datos de la partida.
    // No estamos implementando el guardado todavía.
    this.estadoPartida = {
      versionGenerador: 1,
      cambiosMundo: {},
      posicionJugador: null
    };
  }

  // Genera una semilla nueva para una partida.
  generarSemilla() {
    this.seed = Math.floor(
      Math.random() * 0x100000000
    ) >>> 0;

    return this.seed;
  }

  // Permite recuperar una semilla guardada.
  establecerSemilla(seed) {
    if (!Number.isInteger(seed) ||
        seed < 0 ||
        seed > 0xFFFFFFFF) {
      throw new TypeError(
        "La semilla debe ser un entero entre 0 y 4294967295."
      );
    }

    this.seed = seed >>> 0;
    return this.seed;
  }

  obtenerSemilla() {
    if (this.seed === null) {
      throw new Error(
        "Todavía no se ha generado ni establecido una semilla."
      );
    }

    return this.seed;
  }

  obtenerConfiguracion() {
    return { ...this.configuracion };
  }

  obtenerVersionGenerador() {
    return this.estadoPartida.versionGenerador;
  }
}
