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

const MAPAS = [
  {
    clave: "inicio",
    ruta: "assets/maps/aldea/inicio.tmj",
    puntoEntrada: 8,
    puntoInicio: 9
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
  }
];

export function claveInterior(nombreAldea) {
  if (nombreAldea === "central") return "central";
  if (nombreAldea === "oeste") return "oculta";
  return "inicio";
}

export default class Aldea {
  static precargar(scene) {
    scene.load.image("vigas", "assets/images/maps/Tileset2.png");
    scene.load.image("exterior", "assets/images/maps/Exterior.png");
    scene.load.image("tienda", "assets/images/maps/1.png");
    scene.load.image("casas", "assets/images/maps/spritesheet%20(5).png");

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
    const mapa = this.scene.make.tilemap({ key: definicion.clave });
    const nombres = mapa.tilesets.map(tileset => tileset.name);
    const tilesets = [];

    for (const nombre of nombres) {
      const imagen = IMAGEN_POR_NOMBRE[nombre.trim().toLowerCase()];
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
