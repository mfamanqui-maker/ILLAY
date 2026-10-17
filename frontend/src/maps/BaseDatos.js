export default class BaseDatos {
  constructor() {
    this.seed = null;

    // Configuración compartida del mundo.
    this.configuracion = {
      chunksPorLado: 64,
      tilesPorChunk: 32,
      pixelesPorTile: 32,
      distanciaBordeBiomas: 2,
      margenBosque: 72,
      interior: 120,
      tilesAncho: 72 * 2 + 120,
      tilesAlto: 72 * 2 + 120
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

  configuracionMapas = {
    capas: {
        transiciones: "Transiciones",
        puntosEntrada: "PuntosEntrada"
    },

    // Completar con las claves y rutas reales de tus mapas.
    mapas: {
        aldeas: {
            aldeaPrincipal: {
                clave: "Phyonel",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "aldea"
            },
            aldeaBosque: {
                clave: "Inicio",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "aldea"
            },
            aldeaNieve: {
                clave: "urcobo",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "aldea"
            },
            aldeaPantano: {
                clave: "ultima",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "aldea"
            },
            aldeaCuatro: {
                clave: "nina",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "aldea"
            },
            aldeaPerdida: {
                clave: "lumelperdido",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "aldea"
            }
        },

        interiores: {
            tienda: {
                clave: "tienda",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "interiorFijo"
            },
            descanso: {
                clave: "descanso",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "interiorFijo"
            }
        },

        casas: {
            variante1: {
                clave: "casa1",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "casaOrdinaria"
            },
            variante2: {
                clave: "casa2",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "casaOrdinaria"
            },
            variante3: {
                clave: "casa3",
                ruta: "../../assets/maps/aldea/Phyonel.png",
                tipo: "casaOrdinaria"
            }
        }
    }
  };

  obtenerConfiguracionMapas() {
    return this.configuracionMapas;
  }

  obtenerMapa(claveMapa) {
    const grupos = this.configuracionMapas.mapas;

    for (const grupo of Object.values(grupos)) {
        for (const mapa of Object.values(grupo)) {
            if (mapa.clave === claveMapa) {
                return mapa;
            }
        }
    }

    throw new Error(`[BaseDatos] No existe el mapa: ${claveMapa}`);
  }

  obtenerTodosLosMapas() {
    const resultado = [];

    for (const grupo of Object.values(this.configuracionMapas.mapas)) {
        resultado.push(...Object.values(grupo));
    }

    return resultado;
  }
  // Dentro de BaseDatos

  obtenerVarianteCasa(idAldea, idCasa) {
    const variantes = Object.keys(
        this.configuracionMapas.mapas.casas
    );

    if (variantes.length === 0) {
        throw new Error("[BaseDatos] No hay variantes de casas.");
    }

    const semilla = String(this.obtenerSemilla());
    const texto = `${semilla}:${idAldea}:${idCasa}`;

    // Hash determinista: la misma semilla y ubicación
    // producen siempre la misma variante.
    let hash = 2166136261;

    for (let i = 0; i < texto.length; i++) {
        hash ^= texto.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    const indice = (hash >>> 0) % variantes.length;
    return variantes[indice];
  }
}
