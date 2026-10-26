const PROFUNDIDAD = {
  Ground: 0,
  GroundDetails: 1,
  WorldObjects: 2,
  AbovePlayer: 100000
};

const CAPAS = ["Ground", "GroundDetails", "WorldObjects", "AbovePlayer"];

const IMAGEN_POR_NOMBRE = {
  piso: "ground",
  tierra: "ground",
  piso1: "lake",
  agua: "lake",
  trees: "trees",
  arboles: "trees",
  vigas: "vigas",
  palos: "vigas",
  iglecia: "exterior",
  casas: "casas",
  tiendas: "tienda"
};

const RADIO_BATALLA = 80;

const ZONAS_INTERIOR = [
  { id: 13, color: 0xb44dff, mensaje: "entrando a la tienda" },
  { id: 9, color: 0x3ddc6a, mensaje: "entrando a la casa" }
];

const MAPAS = [
  {
    clave: "inicio",
    ruta: "assets/maps/aldea/inicio.tmj",
    puntoEntrada: 8,
    puntoInicio: 9,
    puntosBatalla: [10, 11, 12],
    imagenes: {
      trees: "arbolesInicio",
      casas: "decoracion",
      casa: "casaInicio",
      fence: "fence"
    }
  },
  {
    clave: "central",
    ruta: "assets/maps/aldea/central.tmj",
    puntoEntrada: 1
  },
  {
    clave: "oculta",
    ruta: "assets/maps/aldea/aldeaOcultaEntreElPantano.tmj",
    puntoEntrada: 8
  },
  {
    clave: "urcobo",
    ruta: "assets/maps/aldea/urcobo.tmj",
    puntoEntrada: 13,
    puntosBatalla: [14, 15, 16],
    imagenes: {
      trees: "arbolesInicio",
      decorativos: "decoracion",
      casa: "casaInicio",
      fence: "fence"
    }
  }
];

const VALLA = {
  columns: 16,
  image: "assets/images/maps/fence_medieval.png",
  imageheight: 1024,
  imagewidth: 512,
  margin: 0,
  name: "fence",
  spacing: 0,
  tilecount: 512,
  tileheight: 32,
  tilewidth: 32
};

function empotrarValla(json) {
  if (!json?.tilesets) return;

  json.tilesets = json.tilesets.map(tileset => {
    const externo = typeof tileset.source === "string" && tileset.source.includes("fence_medieval");
    if (!externo) return tileset;
    return { ...VALLA, firstgid: tileset.firstgid ?? 4784 };
  });
}

export function claveInterior(nombreAldea) {
  if (nombreAldea === "central") return "central";
  if (nombreAldea === "oeste") return "oculta";
  if (nombreAldea === "noreste") return "urcobo";
  return "inicio";
}

export default class Aldea {
  static precargar(scene) {
    scene.load.image("vigas", "assets/images/maps/Tileset2.png");
    scene.load.image("exterior", "assets/images/maps/Exterior.png");
    scene.load.image("tienda", "assets/images/maps/1.png");
    scene.load.image("casas", "assets/images/maps/spritesheet%20(5).png");
    scene.load.image("arbolesInicio", "assets/images/maps/trees_01%20(1).png");
    scene.load.image("decoracion", "assets/images/maps/decorations-medieval.png");
    scene.load.image("casaInicio", "assets/images/maps/spritesheet%20(5)%20(1).png");
    scene.load.image("fence", "assets/images/maps/fence_medieval.png");

    for (const mapa of MAPAS) {
      scene.load.tilemapTiledJSON(mapa.clave, mapa.ruta);
    }
  }

  constructor(scene) {
    this.scene = scene;
    this.mapas = new Map();
    this.activa = null;
    this.zonaSalida = null;
    this.colision = null;
  }

  montar() {
    for (const definicion of MAPAS) {
      this.crear(definicion);
    }
  }

  crear(definicion) {
    const cache = this.scene.cache.tilemap.get(definicion.clave);
    if (cache?.data) empotrarValla(cache.data);

    const mapa = this.scene.make.tilemap({ key: definicion.clave });
    const nombres = mapa.tilesets.map(tileset => tileset.name);
    const tilesets = [];

    for (const nombre of nombres) {
      const limpio = nombre.trim().toLowerCase();
      const imagen = definicion.imagenes?.[limpio] ?? IMAGEN_POR_NOMBRE[limpio];
      if (!imagen) {
        throw new Error(`[Aldea] El tileset "${nombre}" no tiene imagen.`);
      }

      const tileset = mapa.addTilesetImage(nombre, imagen);
      if (!tileset) {
        throw new Error(`[Aldea] No se pudo conectar el tileset "${nombre}".`);
      }
      tilesets.push(tileset);
    }

    const capas = {};
    for (const nombre of CAPAS) {
      const capa = mapa.createLayer(nombre, tilesets, 0, 0);
      if (!capa) {
        throw new Error(`[Aldea] Falta la capa "${nombre}" en "${definicion.clave}".`);
      }
      capa.setDepth(PROFUNDIDAD[nombre]);
      capa.setVisible(false);
      capas[nombre] = capa;
    }

    capas.WorldObjects.setCollisionByExclusion([-1]);

    const puntos = new Map();
    const objetos = mapa.getObjectLayer("Objects");
    for (const objeto of objetos?.objects ?? []) {
      puntos.set(objeto.id, { x: objeto.x, y: objeto.y });
    }

    this.mapas.set(definicion.clave, { definicion, mapa, capas, puntos });
  }

  mapaActivo() {
    return this.mapas.get(this.activa)?.mapa ?? null;
  }

  puntosBatalla() {
    const registro = this.mapas.get(this.activa);
    if (!registro) return [];

    return (registro.definicion.puntosBatalla ?? [])
      .map(id => registro.puntos.get(id))
      .filter(Boolean);
  }

  zonasInterior() {
    const registro = this.mapas.get(this.activa);
    if (!registro) return [];

    return ZONAS_INTERIOR
      .filter(zona => zona.id !== registro.definicion.puntoEntrada)
      .map(zona => {
        const punto = registro.puntos.get(zona.id);
        if (!punto) return null;
        return { x: punto.x, y: punto.y, color: zona.color, mensaje: zona.mensaje };
      })
      .filter(Boolean);
  }

  zonaInteriorCercana(jugador) {
    if (!jugador) return null;

    return this.zonasInterior().find(zona => {
      const dx = jugador.x - zona.x;
      const dy = jugador.y - zona.y;
      return dx * dx + dy * dy <= RADIO_BATALLA * RADIO_BATALLA;
    }) ?? null;
  }

  puntoBatallaCercano(jugador) {
    if (!jugador) return null;

    return this.puntosBatalla().find(punto => {
      const dx = jugador.x - punto.x;
      const dy = jugador.y - punto.y;
      return dx * dx + dy * dy <= RADIO_BATALLA * RADIO_BATALLA;
    }) ?? null;
  }

  punto(clave, id) {
    const punto = this.mapas.get(clave)?.puntos.get(id);
    if (!punto) {
      throw new Error(`[Aldea] No existe el punto ${id} en "${clave}".`);
    }
    return punto;
  }

  mostrar(clave) {
    this.ocultar();

    const registro = this.mapas.get(clave);
    if (!registro) {
      throw new Error(`[Aldea] No existe el mapa "${clave}".`);
    }

    for (const capa of Object.values(registro.capas)) {
      capa.setVisible(true);
    }

    const entrada = this.punto(clave, registro.definicion.puntoEntrada);
    this.zonaSalida = this.scene.add.zone(entrada.x, entrada.y, 48, 48);
    this.scene.physics.add.existing(this.zonaSalida, true);

    const jugador = this.scene.obtenerJugador();
    this.colision = this.scene.physics.add.collider(jugador, registro.capas.WorldObjects);
    this.activa = clave;

    this.scene.physics.world.setBounds(0, 0, registro.mapa.widthInPixels, registro.mapa.heightInPixels);
    this.scene.cameras.main.setBounds(0, 0, registro.mapa.widthInPixels, registro.mapa.heightInPixels);

    return registro;
  }

  ocultar() {
    if (!this.activa) return;

    const registro = this.mapas.get(this.activa);
    for (const capa of Object.values(registro.capas)) {
      capa.setVisible(false);
    }

    this.colision?.destroy();
    this.colision = null;
    this.zonaSalida?.destroy();
    this.zonaSalida = null;
    this.activa = null;
  }

  encimaDeSalida(jugador) {
    if (!this.zonaSalida || !jugador) return false;
    return Math.abs(jugador.x - this.zonaSalida.x) <= 28
      && Math.abs(jugador.y - this.zonaSalida.y) <= 28;
  }
}
