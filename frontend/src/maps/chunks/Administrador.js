import Forest from "./forest.js";

export default class AdministradorMapas {
  // Dentro de AdministradorMapas

constructor(scene, baseDatos) {
  this.scene = scene;
  this.baseDatos = baseDatos;

  this.mapaActual = null;
  this.mapaPhaser = null;
  this.capasActuales = [];
  this.zonasTransicion = [];
  this.puntosEntrada = new Map();

  // Se rellena al entrar en una puerta.
  this.retornoPendiente = null;

  this.cambiandoMapa = false;
}

obtenerConfiguracion() {
  return this.baseDatos.obtenerConfiguracionMapas();
}

obtenerRegistroMapa(clave) {
  return this.baseDatos.obtenerMapa(clave);
}

obtenerObjetoPorNombre(capa, nombre) {
  if (!capa) return null;

  return capa.objects.find(objeto => objeto.name === nombre) ?? null;
}

obtenerPropiedad(objeto, nombre) {
  const propiedad = objeto.properties?.find(p => p.name === nombre);
  return propiedad?.value ?? null;
}

limpiarMapaAnterior() {
  for (const zona of this.zonasTransicion) {
      zona.destroy();
  }

  for (const capa of this.capasActuales) {
      capa.destroy();
  }

  this.zonasTransicion = [];
  this.capasActuales = [];
  this.puntosEntrada.clear();

  if (this.mapaPhaser) {
      this.mapaPhaser.destroy();
      this.mapaPhaser = null;
  }
}

crearMapa(claveMapa) {
  const registro = this.obtenerRegistroMapa(claveMapa);

  if (!this.scene.cache.tilemap.exists(registro.clave)) {
      throw new Error(
          `[Mapas] El mapa "${registro.clave}" no está precargado.`
      );
  }

  this.limpiarMapaAnterior();

  const mapa = this.scene.make.tilemap({
      key: registro.clave
  });

  this.mapaPhaser = mapa;
  this.mapaActual = claveMapa;

  /*
   * IMPORTANTE:
   * Los nombres deben coincidir con el nombre del tileset
   * dentro del archivo Tiled y con las claves de imagen
   * cargadas en Phaser.
   *
   * Completar esta configuración en el siguiente apartado.
   */
  const registroTilesets = registro.tilesets ?? [];

  for (const datos of registroTilesets) {
      const tileset = mapa.addTilesetImage(
          datos.nombreTiled,
          datos.claveImagen
      );

      if (!tileset) {
          throw new Error(
              `[Mapas] No se pudo conectar el tileset "${datos.nombreTiled}".`
          );
      }
  }

  // Crear todas las capas de suelo/dibujo del mapa.
  for (const capaDatos of mapa.layers) {
      const capa = mapa.createLayer(
          capaDatos.name,
          registroTilesets
              .map(datos => mapa.tilesets.find(t => t.name === datos.nombreTiled))
              .filter(Boolean),
          0,
          0
      );

      if (capa) {
          this.capasActuales.push(capa);
      }
  }

  this.leerPuntosEntrada(mapa);
  this.leerTransiciones(mapa);

  return mapa;
}

leerPuntosEntrada(mapa) {
  const config = this.obtenerConfiguracion();
  const capa = mapa.getObjectLayer(config.capas.puntosEntrada);

  if (!capa) {
      console.warn(
          `[Mapas] El mapa "${this.mapaActual}" no tiene la capa de puntos "${config.capas.puntosEntrada}".`
      );
      return;
  }

  for (const objeto of capa.objects) {
      if (!objeto.name) continue;

      this.puntosEntrada.set(objeto.name, {
          x: objeto.x,
          y: objeto.y
      });
  }
}

resolverDestino(transicion) {
  if (transicion.tipoDestino !== "casaOrdinaria") {
      return transicion.destinoMapa;
  }

  if (!transicion.idAldea || !transicion.idCasa) {
      throw new Error(
          `[Mapas] La casa "${transicion.id}" necesita idAldea e idCasa.`
      );
  }

  const variante = this.baseDatos.obtenerVarianteCasa(
      transicion.idAldea,
      transicion.idCasa
  );

  return this.baseDatos.configuracionMapas.mapas.casas[variante].clave;
}

leerTransiciones(mapa) {
  const tipoDestino = this.obtenerPropiedad(objeto, "tipoDestino");
const idAldea = this.obtenerPropiedad(objeto, "idAldea");
const idCasa = this.obtenerPropiedad(objeto, "idCasa");

// Añade estos campos al objeto de transición:
tipoDestino,
idAldea,
idCasa
  const puntoRetorno = this.obtenerPropiedad(objeto, "puntoRetorno");

this.zonasTransicion.push({
    id,
    x: objeto.x,
    y: objeto.y,
    ancho: objeto.width ?? 0,
    alto: objeto.height ?? 0,
    destinoMapa,
    destinoPunto,
    puntoRetorno,
    activada: false
});
}

obtenerPuntoEntrada(nombre) {
  const punto = this.puntosEntrada.get(nombre);

  if (!punto) {
      throw new Error(
          `[Mapas] No existe el punto de entrada "${nombre}" en "${this.mapaActual}".`
      );
  }

  return punto;
}

async cambiarMapa(claveDestino, puntoDestino, puntoRetorno = null) {
  if (this.cambiandoMapa) return;

  this.cambiandoMapa = true;

  try {
      const registro = this.obtenerRegistroMapa(claveDestino);

      if (!this.scene.cache.tilemap.exists(registro.clave)) {
          throw new Error(
              `[Mapas] El mapa "${registro.clave}" no fue precargado.`
          );
      }

      this.crearMapa(claveDestino);

      const punto = this.obtenerPuntoEntrada(puntoDestino);
      const jugador = this.scene.obtenerJugador();

      if (!jugador) {
          throw new Error("[Mapas] PhaserMaster no devolvió al jugador.");
      }

      jugador.setPosition(punto.x, punto.y);

      // Guarda el punto de regreso si la transición viene de una puerta.
      this.retornoPendiente = puntoRetorno
          ? { ...puntoRetorno }
          : null;

      this.scene.cameras.main.startFollow(jugador);
  } finally {
      this.cambiandoMapa = false;
  }
}


async activarTransicion(id) {
    const transicion = this.zonasTransicion.find(t => t.id === id);

    if (!transicion) {
        throw new Error(`[Mapas] No existe la transición "${id}".`);
    }

    if (!transicion.puntoRetorno) {
        throw new Error(
            `[Mapas] La puerta "${id}" no tiene la propiedad puntoRetorno.`
        );
    }

    const mapaOrigen = this.mapaActual;

    this.retornoPendiente = {
        mapa: mapaOrigen,
        punto: transicion.puntoRetorno
    };

    await this.cambiarMapa(
        transicion.destinoMapa,
        transicion.destinoPunto
    );
}

async regresarAlMapaAnterior() {
    if (!this.retornoPendiente) {
        console.warn("[Mapas] No hay un punto de retorno guardado.");
        return;
    }

    const retorno = this.retornoPendiente;

    // Se conserva el dato si la carga falla, para poder reintentar.
    await this.cambiarMapa(retorno.mapa, retorno.punto);

    this.retornoPendiente = null;
}


async regresarAlMapaAnterior(puntoSalida) {
  if (!this.retornoPendiente) {
      console.warn("[Mapas] No hay un mapa de retorno guardado.");
      return;
  }

  const retorno = this.retornoPendiente;
  this.retornoPendiente = null;

  await this.cambiarMapa(
      retorno.mapa,
      puntoSalida,
      null
  );
}

  // Generador pseudoaleatorio reproducible.
  // La misma semilla produce la misma secuencia.
  crearAleatorio(seed) {
    let estado = seed >>> 0;

    return () => {
      estado = (estado + 0x6D2B79F5) >>> 0;

      let t = estado;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  mezclar(array, random) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  iniciarGeneracion() {
    // La semilla vive en BaseDatos. El mismo número reconstruye el mismo mundo.
    this.seed = this.baseDatos.obtenerSemilla();
    this.configuracion = this.baseDatos.obtenerConfiguracion();

    this.mundo = {
      seed: this.seed,
      versionGenerador: this.baseDatos.obtenerVersionGenerador(),
      ancho: this.configuracion.tilesAncho,
      alto: this.configuracion.tilesAlto,
      margenBosque: this.configuracion.margenBosque,
      interior: this.configuracion.interior,
      capas: ["suelo", "decorado", "tronco", "copa"]
    };

    console.log(
      `[Illay] Plano del mundo | Semilla: ${this.seed} | ${this.mundo.ancho}×${this.mundo.alto}`
    );

    this.iniciado = true;
    return this.mundo;
  }

  obtenerMundo() {
    if (!this.mundo) {
      throw new Error(
        "Primero debes ejecutar iniciarGeneracion()."
      );
    }

    return this.mundo;
  }

  prepararTerreno(scene) {
    console.log("[Mapas] Preparando el terreno...");

    this.forest = new Forest(scene, this.baseDatos);
    this.forest.generar(this.obtenerMundo());

    console.log("[Mapas] Terreno generado.");
    return this.forest;
  }
  
  pintarTerreno() {
    if (!this.forest) {
      throw new Error(
        "[Mapas] Primero debes preparar el terreno."
      );
    }
  
    return this.forest.pintar();
  }

  obtenerPuntoJugador() {
    if (!this.mundo) {
      throw new Error(
        "Primero debes ejecutar iniciarGeneracion()."
      );
    }

    const tile = this.configuracion.pixelesPorTile;
    const inicio = this.forest?.puntoInicio;

    if (!inicio) {
      throw new Error(
        "[Mapas] Primero debes preparar el terreno."
      );
    }

    return {
      x: (inicio.x + 0.5) * tile,
      y: (inicio.y + 0.5) * tile
    };
  }

  obtenerCapaSuelo() {
    const capa = this.forest?.capaSuelo;

    if (!capa) {
      throw new Error(
        "[Mapas] Primero debes pintar el terreno."
      );
    }

    return capa;
  }

  obtenerCapaTronco() {
    const capa = this.forest?.capaTronco;

    if (!capa) {
      throw new Error(
        "[Mapas] Primero debes pintar el terreno."
      );
    }

    return capa;
  }

  fijarTerrenoVisible(visible) {
    const forest = this.forest;
    if (!forest) return;

    forest.capaSuelo?.setVisible(visible);
    forest.capaDecorado?.setVisible(visible);
    forest.capaTronco?.setVisible(visible);
    forest.capaCopa?.setVisible(visible);
  }

  aldeaPegada(tx, ty) {
    let mejor = null;
    let distancia = Infinity;

    for (const aldea of this.forest?.aldeas ?? []) {
      if (!this.casillaPegada(aldea, tx, ty)) continue;
      const centro = this.forest.centroDe(aldea);
      const actual = (centro.x - tx) ** 2 + (centro.y - ty) ** 2;
      if (actual < distancia) {
        distancia = actual;
        mejor = aldea;
      }
    }

    return mejor;
  }

  casillaPegada(aldea, tx, ty) {
    const dentro = tx >= aldea.x && tx < aldea.x + aldea.ancho
      && ty >= aldea.y && ty < aldea.y + aldea.alto;
    if (dentro) return false;

    return tx >= aldea.x - 1 && tx <= aldea.x + aldea.ancho
      && ty >= aldea.y - 1 && ty <= aldea.y + aldea.alto;
  }

  puntoJuntoA(nombre) {
    const aldea = this.forest?.aldeas?.find(candidata => candidata.nombre === nombre);
    if (!aldea) {
      throw new Error(`[Mapas] No existe la aldea "${nombre}".`);
    }

    const tile = this.configuracion.pixelesPorTile;
    const candidatos = [];

    for (let y = aldea.y - 1; y <= aldea.y + aldea.alto; y++) {
      for (let x = aldea.x - 1; x <= aldea.x + aldea.ancho; x++) {
        if (!this.casillaPegada(aldea, x, y)) continue;
        if (!this.forest.enMapa(x, y)) continue;
        if (this.forest.agujero[y][x] || this.forest.rio[y][x]) continue;
        if (this.forest.tronco[y][x] !== -1) continue;
        const alSur = y === aldea.y + aldea.alto;
        const centro = Math.abs(x - (aldea.x + aldea.ancho / 2));
        candidatos.push({ x, y, alSur, centro });
      }
    }

    candidatos.sort((a, b) => Number(b.alSur) - Number(a.alSur) || a.centro - b.centro);
    const elegido = candidatos[0] ?? {
      x: aldea.x + Math.floor(aldea.ancho / 2),
      y: aldea.y + aldea.alto
    };

    return {
      x: (elegido.x + 0.5) * tile,
      y: (elegido.y + 0.5) * tile
    };
  }

  obtenerExtensionMundo() {
    const mapa = this.forest?.mapa;

    if (!mapa) {
      throw new Error(
        "[Mapas] Primero debes pintar el terreno."
      );
    }

    return {
      ancho: mapa.widthInPixels,
      alto: mapa.heightInPixels
    };
  }
}
