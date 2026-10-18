export const RECURSOS_TERRENO = {
  suelo: {
    clave: "ground",
    imagen: "assets/images/maps/ground.png"
  },
  agua: {
    clave: "lake",
    imagen: "assets/images/maps/lake.png"
  },
  arboles: {
    clave: "trees",
    imagen: "assets/images/maps/trees.png"
  },
  tile: 32
};

// El tileset de suelo tiene 19 columnas. Cada bloque se estampa entero.
const BLOQUES_SUELO = [
  { hasta: 0.70, mosaico: [[307]] },
  { hasta: 0.90, mosaico: [[288]] },
  { hasta: 1, mosaico: [[43, 44, 45], [62, 63, 64], [81, 82, 83]] }
];

// Cada pieza: tierra de ground y agua de lake.
const CAMINO = {
  centro: 309, norte: 290, sur: 328, este: 310, oeste: 308,
  noroeste: 289, noreste: 291, suroeste: 327, sureste: 329
};

const RIO = {
  centro: 55, norte: 15, sur: 112, este: 69, oeste: 60,
  noroeste: 14, noreste: 20, suroeste: 110, sureste: 114
};

const TILE_HOYO = 76;
const DESFASE_AGUA = 500;
const GROSOR_CAMINO = 4;
const GROSOR_RIO = 4;
const PROFUNDIDAD_COPA = 1000000;

// Piedra 2×1 y vegetación 2×3 del tileset de lake (12 columnas).
const PIEDRA_LAGO = [[82, 83]];
const VEGETACION_LAGO = [
  [94, 95],
  [106, 107],
  [118, 119]
];
const BIOMAS = {
  central: "bosque",
  oeste: "bosque",
  noreste: "bosque",
  suroeste: "bosque",
  sureste: "pantano",
  noroeste: "prado"
};

const DECORADO = [
  [298, 299, 300],
  [317, 318, 319],
  [336, 337, 338]
];

// Árbol izquierdo de trees.png (columnas 48-59, filas 103-117).
// dx, dy son relativos a la copa. El tronco es la base sólida.
const SOMBRA = [
  [10, 9, 13498], [8, 10, 13616], [9, 10, 13617], [10, 10, 13618],
  [1, 11, 13729], [8, 11, 13736], [9, 11, 13737], [10, 11, 13738],
  [1, 12, 13849], [2, 12, 13850], [3, 12, 13851],
  [8, 12, 13856], [9, 12, 13857], [10, 12, 13858],
  [1, 13, 13969], [2, 13, 13970], [3, 13, 13971],
  [7, 13, 13975], [8, 13, 13976],
  [3, 14, 14091], [7, 14, 14095], [8, 14, 14096]
];

// La columna del tronco también está en la copa: las dos capas
// conservan su tile en la misma casilla.
const TRONCO = [
  [5, 8, 13373],
  [5, 9, 13493],
  [5, 10, 13613],
  [4, 11, 13732], [5, 11, 13733], [6, 11, 13734],
  [4, 12, 13852], [5, 12, 13853], [6, 12, 13854],
  [4, 13, 13972], [5, 13, 13973], [6, 13, 13974],
  [4, 14, 14092], [5, 14, 14093], [6, 14, 14094]
];

const COPA = [
  [4, 0, 12412],
  [3, 1, 12531], [4, 1, 12532], [5, 1, 12533], [6, 1, 12534], [7, 1, 12535],
  [2, 2, 12650], [3, 2, 12651], [4, 2, 12652], [5, 2, 12653], [6, 2, 12654], [7, 2, 12655], [8, 2, 12656],
  [2, 3, 12770], [3, 3, 12771], [4, 3, 12772], [5, 3, 12773], [6, 3, 12774], [7, 3, 12775], [8, 3, 12776],
  [2, 4, 12890], [3, 4, 12891], [4, 4, 12892], [5, 4, 12893], [6, 4, 12894], [7, 4, 12895], [8, 4, 12896],
  [2, 5, 13010], [3, 5, 13011], [4, 5, 13012], [5, 5, 13013], [6, 5, 13014], [7, 5, 13015], [8, 5, 13016], [9, 5, 13017],
  [2, 6, 13130], [3, 6, 13131], [4, 6, 13132], [5, 6, 13133], [6, 6, 13134], [7, 6, 13135], [8, 6, 13136], [9, 6, 13137],
  [1, 7, 13249], [2, 7, 13250], [3, 7, 13251], [4, 7, 13252], [5, 7, 13253], [6, 7, 13254], [7, 7, 13255], [8, 7, 13256], [9, 7, 13257],
  [0, 8, 13368], [1, 8, 13369], [2, 8, 13370], [3, 8, 13371], [4, 8, 13372], [5, 8, 13373], [6, 8, 13374], [7, 8, 13375], [8, 8, 13376], [9, 8, 13377],
  [0, 9, 13488], [1, 9, 13489], [2, 9, 13490], [3, 9, 13491], [4, 9, 13492], [5, 9, 13493], [6, 9, 13494], [7, 9, 13495], [8, 9, 13496], [9, 9, 13497],
  [1, 10, 13609], [2, 10, 13610], [3, 10, 13611], [4, 10, 13612], [5, 10, 13613], [6, 10, 13614], [7, 10, 13615],
  [2, 11, 13730], [3, 11, 13731], [4, 11, 13732], [5, 11, 13733], [6, 11, 13734], [7, 11, 13735],
  [5, 12, 13853], [6, 12, 13854], [7, 12, 13855]
];

const DESFASE_ARBOLES = 1000;

export default class Forest {
  constructor(scene, baseDatos) {
    this.scene = scene;
    this.baseDatos = baseDatos;
    this.mapa = null;
    this.capaSuelo = null;
    this.capaDecorado = null;
    this.capaTronco = null;
    this.capaCopa = null;
    this.capasTronco = [];
    this.capasDelante = [];
    this.suelo = [];
    this.decorado = [];
    this.tronco = [];
    this.copa = [];
    this.agujero = [];
    this.camino = [];
    this.rio = [];
    this.puntoInicio = null;
    this.solidosAgua = [];
  }

  ruido(x, y, seed) {
    let n = Math.imul(x, 374761393);
    n = (n + Math.imul(y, 668265263)) | 0;
    n = (n + Math.imul(seed, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n = (n ^ (n >>> 16)) >>> 0;
    return n / 4294967295;
  }

  generar(mundo) {
    this.ancho = mundo.ancho;
    this.alto = mundo.alto;
    this.semilla = mundo.seed;
    this.margenBosque = mundo.margenBosque;

    console.log(`[Forest] Generando ${this.ancho} x ${this.alto}`);

    const vacio = () => Array.from({ length: this.alto }, () => Array(this.ancho).fill(-1));
    const falso = () => Array.from({ length: this.alto }, () => Array(this.ancho).fill(false));

    this.suelo = Array.from({ length: this.alto }, () => Array(this.ancho).fill(307));
    this.decorado = vacio();
    this.tronco = vacio();
    this.copa = vacio();
    this.agujero = falso();
    this.camino = falso();
    this.rio = falso();
    this.lago = falso();

    this.pintarSuelo();
    this.colocarAgujeros(mundo);
    this.trazarCaminos();
    this.trazarRios();
    this.crearLago();
    this.aplicarBorde(this.rio, RIO, DESFASE_AGUA);
    this.decorarLago();
    this.definirSolidos();
    this.pintarDecorado();
    this.plantarArboles();

    return this;
  }

  pintarSuelo() {
    const ocupado = Array.from({ length: this.alto }, () => Array(this.ancho).fill(false));

    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        if (ocupado[y][x]) continue;

        const suerte = this.ruido(x, y, this.semilla);
        const bloque = BLOQUES_SUELO.find(candidato => suerte < candidato.hasta);
        const mosaico = bloque.mosaico;

        if (mosaico.length === 1 && mosaico[0].length === 1) {
          this.suelo[y][x] = mosaico[0][0];
          ocupado[y][x] = true;
          continue;
        }

        if (!this.cabeBloque(x, y, mosaico, ocupado)) {
          this.suelo[y][x] = 307;
          ocupado[y][x] = true;
          continue;
        }

        this.estampar(this.suelo, x, y, mosaico, ocupado);
      }
    }
  }

  cabeBloque(x, y, mosaico, ocupado) {
    const alto = mosaico.length;
    const ancho = mosaico[0].length;
    if (x + ancho > this.ancho || y + alto > this.alto) return false;

    for (let dy = 0; dy < alto; dy++) {
      for (let dx = 0; dx < ancho; dx++) {
        if (ocupado[y + dy][x + dx]) return false;
      }
    }

    return true;
  }

  estampar(matriz, x, y, mosaico, ocupado) {
    for (let dy = 0; dy < mosaico.length; dy++) {
      for (let dx = 0; dx < mosaico[dy].length; dx++) {
        matriz[y + dy][x + dx] = mosaico[dy][dx];
        if (ocupado) ocupado[y + dy][x + dx] = true;
      }
    }
  }

  zonaOcupada(x, y, ancho, alto) {
    for (let dy = 0; dy < alto; dy++) {
      for (let dx = 0; dx < ancho; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= this.ancho || ty >= this.alto) return true;
        if (this.agujero[ty][tx] || this.camino[ty][tx] || this.rio[ty][tx]) return true;
      }
    }
    return false;
  }

  colocarAgujeros(mundo) {
    const x0 = mundo.margenBosque;
    const y0 = mundo.margenBosque;
    const interior = mundo.interior;
    const puestos = [
      ["central", 15, 15, 0.5, 0.5, 2],
      ["noroeste", 10, 10, 0.16, 0.16, 4],
      ["noreste", 10, 10, 0.84, 0.16, 4],
      ["suroeste", 10, 10, 0.16, 0.84, 4],
      ["sureste", 10, 10, 0.84, 0.84, 4],
      ["oeste", 5, 5, 0.16, 0.5, 3]
    ];

    this.aldeas = puestos.map(([nombre, ancho, alto, rx, ry, amplitud]) => {
      const bioma = BIOMAS[nombre];
      // La aldea oculta se ubica aparte mediante búsqueda aleatoria determinista.
      if (nombre === "oeste") {
        return { nombre, x: x0, y: y0, ancho, alto, oculta: true, bioma };
      }
      const idealX = x0 + Math.floor((interior - ancho) * rx);
      const idealY = y0 + Math.floor((interior - alto) * ry);
      return {
        ...this.proponerHoyo(nombre, idealX, idealY, ancho, alto, x0, y0, interior, amplitud),
        bioma
      };
    });

    this.separarAldeas(x0, y0, interior);
    this.colocarAldeaOculta(x0, y0, interior);
    this.pintarHoyos();

    const central = this.aldeas[0];
    this.puntoInicio = {
      x: central.x + Math.floor(central.ancho / 2),
      y: central.y + central.alto + 2
    };

    console.log(
      "[Forest] Hoyos:",
      this.aldeas.map(aldea => `${aldea.nombre} ${aldea.bioma} ${aldea.ancho}×${aldea.alto}`).join(", ")
    );
  }

  colocarAldeaOculta(x0, y0, interior) {
    const oculta = this.aldeas.find(aldea => aldea.oculta);
    if (!oculta) return;

    // Se prueba un conjunto determinista de posiciones. No depende del azar global.
    const maxX = x0 + interior - oculta.ancho;
    const maxY = y0 + interior - oculta.alto;
    let elegida = null;
    let mejorPuntaje = -1;

    for (let intento = 0; intento < 500; intento++) {
      const x = x0 + Math.floor(this.ruido(intento + 701, 17, this.semilla + 991) * (maxX - x0 + 1));
      const y = y0 + Math.floor(this.ruido(intento + 1301, 29, this.semilla + 991) * (maxY - y0 + 1));
      const candidata = { ...oculta, x, y };
      if (this.aldeas.some(aldea => aldea !== oculta && this.seSolapan(candidata, aldea, 8))) continue;

      const distanciaMinima = Math.min(...this.aldeas
        .filter(aldea => aldea !== oculta)
        .map(aldea => Math.hypot(this.centroDe(candidata).x - this.centroDe(aldea).x,
                                 this.centroDe(candidata).y - this.centroDe(aldea).y)));
      if (distanciaMinima > mejorPuntaje) {
        mejorPuntaje = distanciaMinima;
        elegida = candidata;
      }
    }

    if (elegida) {
      oculta.x = elegida.x;
      oculta.y = elegida.y;
    } else {
      console.warn("[Forest] No se encontró una posición ideal para la aldea oculta; se conserva una posición válida.");
    }
  }

  proponerHoyo(nombre, x, y, ancho, alto, x0, y0, interior, amplitud) {
    const jx = this.desvio(x, y, amplitud);
    const jy = this.desvio(x + 3, y + 7, amplitud);
    const maxX = x0 + interior - ancho;
    const maxY = y0 + interior - alto;

    return {
      nombre,
      x: Math.max(x0, Math.min(maxX, x + jx)),
      y: Math.max(y0, Math.min(maxY, y + jy)),
      ancho,
      alto
    };
  }

  separarAldeas(x0, y0, interior) {
    const margen = 8;

    for (let paso = 0; paso < 16; paso++) {
      let movio = false;

      for (let i = 0; i < this.aldeas.length; i++) {
        for (let j = i + 1; j < this.aldeas.length; j++) {
          if (!this.seSolapan(this.aldeas[i], this.aldeas[j], margen)) continue;
          this.empujar(this.aldeas[j], this.aldeas[i], x0, y0, interior, margen);
          movio = true;
        }
      }

      if (!movio) return;
    }
  }

  seSolapan(a, b, margen) {
    return a.x < b.x + b.ancho + margen &&
      a.x + a.ancho + margen > b.x &&
      a.y < b.y + b.alto + margen &&
      a.y + a.alto + margen > b.y;
  }

  empujar(movil, fijo, x0, y0, interior, margen) {
    const solapeX = Math.min(movil.x + movil.ancho, fijo.x + fijo.ancho) - Math.max(movil.x, fijo.x);
    const solapeY = Math.min(movil.y + movil.alto, fijo.y + fijo.alto) - Math.max(movil.y, fijo.y);
    const maxX = x0 + interior - movil.ancho;
    const maxY = y0 + interior - movil.alto;

    if (solapeX < solapeY) {
      const dir = movil.x + movil.ancho / 2 < fijo.x + fijo.ancho / 2 ? -1 : 1;
      movil.x = this.limitar(movil.x + dir * (solapeX + margen), x0, maxX);
    } else {
      const dir = movil.y + movil.alto / 2 < fijo.y + fijo.alto / 2 ? -1 : 1;
      movil.y = this.limitar(movil.y + dir * (solapeY + margen), y0, maxY);
    }
  }

  pintarHoyos() {
    for (const aldea of this.aldeas) {
      for (let dy = 0; dy < aldea.alto; dy++) {
        for (let dx = 0; dx < aldea.ancho; dx++) {
          this.agujero[aldea.y + dy][aldea.x + dx] = true;
          this.suelo[aldea.y + dy][aldea.x + dx] = DESFASE_AGUA + TILE_HOYO;
        }
      }
    }
  }

  limitar(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
  }

  desvio(x, y, amplitud) {
    if (amplitud <= 0) return 0;
    return Math.floor(this.ruido(x + 20, y + 20, this.semilla) * (amplitud * 2 + 1)) - amplitud;
  }

  trazarCaminos() {
    const central = this.aldeas[0];

    for (const aldea of this.aldeas.slice(1)) {
      if (aldea.oculta || aldea.nombre === "oeste") continue;
      const origen = this.centroDe(aldea);
      const destino = this.centroDe(central);
      for (const tramo of this.lineaEvitaOculta(origen, destino)) {
        this.marcarCamino(tramo);
      }
    }

    this.limpiarMascara(this.camino);
    this.aplicarBorde(this.camino, CAMINO, 0);
  }

  lineaEvitaOculta(origen, destino) {
    const recta = this.linea(origen.x, origen.y, destino.x, destino.y);
    const ancha = this.ensanchar(recta, GROSOR_CAMINO);
    const corta = ancha.some(([x, y]) => this.zonaProtegidaAldeaOculta(x, y));
    if (!corta) return [recta];

    const oculta = this.aldeas.find(aldea => aldea.oculta || aldea.nombre === "oeste");
    const margen = 8;
    const esquinas = [
      [oculta.x - margen, oculta.y - margen],
      [oculta.x + oculta.ancho + margen, oculta.y - margen],
      [oculta.x - margen, oculta.y + oculta.alto + margen],
      [oculta.x + oculta.ancho + margen, oculta.y + oculta.alto + margen]
    ].filter(([x, y]) => this.enMapa(x, y) && !this.agujero[y][x]);

    let mejor = esquinas[0];
    let mejorLargo = Infinity;
    for (const [x, y] of esquinas) {
      const largo = Math.hypot(origen.x - x, origen.y - y) + Math.hypot(destino.x - x, destino.y - y);
      if (largo < mejorLargo) {
        mejorLargo = largo;
        mejor = [x, y];
      }
    }

    if (!mejor) return [recta];
    return [
      this.linea(origen.x, origen.y, mejor[0], mejor[1]),
      this.linea(mejor[0], mejor[1], destino.x, destino.y)
    ];
  }

  marcarCamino(puntos) {
    for (const [x, y] of this.ensanchar(puntos, GROSOR_CAMINO)) {
      if (this.agujero[y][x] || this.zonaProtegidaAldeaOculta(x, y)) continue;
      this.camino[y][x] = true;
    }
  }

  zonaProtegidaAldeaOculta(x, y) {
    const oculta = this.aldeas?.find(aldea => aldea.oculta || aldea.nombre === "oeste");
    if (!oculta) return false;
    const margen = 4;
    return x >= oculta.x - margen && x < oculta.x + oculta.ancho + margen &&
      y >= oculta.y - margen && y < oculta.y + oculta.alto + margen;
  }

  enMapa(x, y) {
    return x >= 0 && y >= 0 && x < this.ancho && y < this.alto;
  }

  trazarRios() {
    this.intentarRios(4, false, 11);
    this.intentarRios(6, true, 80);
  }

  intentarRios(cantidad, soloPantano, salto) {
    const minimo = this.margenBosque + 8;
    const maximo = this.ancho - this.margenBosque - 9;
    let puestos = 0;

    for (let i = 0; i < 120 && puestos < cantidad; i++) {
      const n = i + salto;
      const x0 = minimo + Math.floor(this.ruido(n + 2, 11, this.semilla) * (maximo - minimo));
      const y0 = minimo + Math.floor(this.ruido(n + 5, 13, this.semilla) * (maximo - minimo));
      const largo = 12 + Math.floor(this.ruido(n + 4, 9, this.semilla) * 14);
      const angulo = this.ruido(n + 8, 3, this.semilla) * Math.PI * 2;
      const x1 = this.limitar(Math.round(x0 + Math.cos(angulo) * largo), minimo, maximo);
      const y1 = this.limitar(Math.round(y0 + Math.sin(angulo) * largo), minimo, maximo);
      const distancia = Math.hypot(x1 - x0, y1 - y0);
      if (distancia < 10 || distancia > 30) continue;

      const celdas = this.ensanchar(this.linea(x0, y0, x1, y1), GROSOR_RIO);
      if (!this.rioLibre(celdas)) continue;
      if (soloPantano) {
        const enPantano = celdas.filter(([x, y]) => this.biomaEn(x, y) === "pantano").length;
        if (enPantano < celdas.length * 0.55) continue;
      }
      for (const [x, y] of celdas) this.rio[y][x] = true;
      puestos++;
    }
  }

  crearLago() {
    const pantano = this.aldeas.find(aldea => aldea.bioma === "pantano");
    if (!pantano) return;

    const centro = this.centroDe(pantano);
    for (let i = 0; i < 48; i++) {
      const angulo = this.ruido(i + 3, 19, this.semilla + 23) * Math.PI * 2;
      const dist = 18 + Math.floor(this.ruido(i + 8, 21, this.semilla + 23) * 14);
      const cx = Math.round(centro.x + Math.cos(angulo) * dist);
      const cy = Math.round(centro.y + Math.sin(angulo) * dist);
      if (!this.enMapa(cx, cy) || this.biomaEn(cx, cy) !== "pantano") continue;

      const radio = 8 + Math.floor(this.ruido(i + 1, 27, this.semilla + 23) * 4);
      const celdas = this.formaLago(cx, cy, radio, i);
      if (celdas.length < 55) continue;
      for (const [x, y] of celdas) {
        this.rio[y][x] = true;
        this.lago[y][x] = true;
      }
      console.log(`[Forest] Lago del pantano: ${celdas.length} casillas en ${cx},${cy}`);
      return;
    }

    console.warn("[Forest] No hubo sitio para el lago del pantano.");
  }

  formaLago(cx, cy, radio, variante) {
    const celdas = [];
    for (let y = cy - radio; y <= cy + radio; y++) {
      for (let x = cx - radio; x <= cx + radio; x++) {
        if (!this.enMapa(x, y)) continue;
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > radio * radio) continue;
        if (this.ruido(x + variante, y, this.semilla + 41) > 0.72) continue;
        if (this.agujero[y][x] || this.camino[y][x] || this.rio[y][x]) continue;
        if (this.biomaEn(x, y) !== "pantano") continue;
        if (x < this.margenBosque || y < this.margenBosque) continue;
        if (x >= this.ancho - this.margenBosque || y >= this.alto - this.margenBosque) continue;
        celdas.push([x, y]);
      }
    }
    return celdas;
  }

  decorarLago() {
    this.sembrarEnLago(PIEDRA_LAGO, 4, 70);
    this.sembrarEnLago(VEGETACION_LAGO, 3, 90);
  }

  sembrarEnLago(mosaico, cantidad, salto) {
    const alto = mosaico.length;
    const ancho = mosaico[0].length;
    const celdas = [];

    for (let y = 0; y < this.alto - alto; y++) {
      for (let x = 0; x < this.ancho - ancho; x++) {
        if (this.cabeEnLago(x, y, ancho, alto)) celdas.push([x, y]);
      }
    }

    let puestos = 0;
    for (let i = 0; i < celdas.length && puestos < cantidad; i++) {
      const indice = Math.floor(this.ruido(i + salto, puestos + 3, this.semilla + 5) * celdas.length);
      const [x, y] = celdas[indice];
      if (!this.cabeEnLago(x, y, ancho, alto)) continue;
      for (let dy = 0; dy < alto; dy++) {
        for (let dx = 0; dx < ancho; dx++) {
          this.suelo[y + dy][x + dx] = DESFASE_AGUA + mosaico[dy][dx];
          this.lago[y + dy][x + dx] = false;
        }
      }
      puestos++;
    }
  }

  cabeEnLago(x, y, ancho, alto) {
    for (let dy = 0; dy < alto; dy++) {
      for (let dx = 0; dx < ancho; dx++) {
        if (!this.lago[y + dy][x + dx]) return false;
      }
    }
    return true;
  }

  definirSolidos() {
    const adornos = [...PIEDRA_LAGO.flat(), ...VEGETACION_LAGO.flat()];
    this.solidosAgua = [TILE_HOYO, ...Object.values(RIO), ...adornos]
      .map(id => DESFASE_AGUA + id);
  }

  biomaEn(x, y) {
    let mejor = this.aldeas[0];
    let distancia = Infinity;

    for (const aldea of this.aldeas) {
      const centro = this.centroDe(aldea);
      const actual = (centro.x - x) ** 2 + (centro.y - y) ** 2;
      if (actual < distancia) {
        distancia = actual;
        mejor = aldea;
      }
    }

    return mejor.bioma;
  }

  centroDe(aldea) {
    return {
      x: aldea.x + Math.floor(aldea.ancho / 2),
      y: aldea.y + Math.floor(aldea.alto / 2)
    };
  }

  linea(x0, y0, x1, y1) {
    const puntos = [];
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = Math.sign(x1 - x0);
    const sy = Math.sign(y1 - y0);
    let error = dx - dy;

    while (true) {
      puntos.push([x, y]);
      if (x === x1 && y === y1) break;
      const doble = error * 2;
      if (doble > -dy) {
        error -= dy;
        x += sx;
      }
      if (doble < dx) {
        error += dx;
        y += sy;
      }
    }

    return puntos;
  }

  ensanchar(puntos, grosor) {
    const celdas = [];
    if (puntos.length === 0) return celdas;

    const origen = puntos[0];
    const destino = puntos[puntos.length - 1];
    const horizontal = Math.abs(destino[0] - origen[0]) >= Math.abs(destino[1] - origen[1]);
    const base = -Math.floor(grosor / 2);

    for (const [x, y] of puntos) {
      for (let i = 0; i < grosor; i++) {
        const d = base + i;
        if (horizontal) this.agregarCelda(celdas, x, y + d);
        else this.agregarCelda(celdas, x + d, y);
      }
    }

    return celdas;
  }

  agregarCelda(celdas, x, y) {
    if (x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return;
    celdas.push([x, y]);
  }

  rioLibre(celdas) {
    if (celdas.length < 16) return false;

    for (const [x, y] of celdas) {
      if (x < this.margenBosque || y < this.margenBosque) return false;
      if (x >= this.ancho - this.margenBosque || y >= this.alto - this.margenBosque) return false;
      if (this.agujero[y][x] || this.camino[y][x] || this.rio[y][x]) return false;
      if (this.cercaDeHoyo(x, y, 4)) return false;
    }

    return true;
  }

  cercaDeHoyo(x, y, margen) {
    for (const aldea of this.aldeas) {
      if (x >= aldea.x - margen && x < aldea.x + aldea.ancho + margen &&
          y >= aldea.y - margen && y < aldea.y + aldea.alto + margen) {
        return true;
      }
    }
    return false;
  }

  limpiarMascara(mascara) {
    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        if (this.agujero[y][x]) mascara[y][x] = false;
      }
    }
  }

  aplicarBorde(mascara, piezas, desfase) {
    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        if (!mascara[y][x]) continue;
        const norte = this.enMascara(mascara, x, y - 1);
        const sur = this.enMascara(mascara, x, y + 1);
        const este = this.enMascara(mascara, x + 1, y);
        const oeste = this.enMascara(mascara, x - 1, y);
        let id = piezas.centro;

        if (!norte && !oeste) id = piezas.noroeste;
        else if (!norte && !este) id = piezas.noreste;
        else if (!sur && !oeste) id = piezas.suroeste;
        else if (!sur && !este) id = piezas.sureste;
        else if (!norte) id = piezas.norte;
        else if (!sur) id = piezas.sur;
        else if (!oeste) id = piezas.oeste;
        else if (!este) id = piezas.este;

        this.suelo[y][x] = id + desfase;
      }
    }
  }

  enMascara(mascara, x, y) {
    if (x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return false;
    return mascara[y][x];
  }

  pintarDecorado() {
    const ocupado = Array.from({ length: this.alto }, () => Array(this.ancho).fill(false));

    for (let y = 0; y < this.alto - 2; y++) {
      for (let x = 0; x < this.ancho - 2; x++) {
        if (this.ruido(x + 400, y + 400, this.semilla) < 0.975) continue;
        if (this.zonaOcupada(x, y, 3, 3)) continue;
        if (!this.cabeBloque(x, y, DECORADO, ocupado)) continue;
        this.estampar(this.decorado, x, y, DECORADO, ocupado);
      }
    }
  }

  plantarArboles() {
    const centroX = this.puntoInicio.x;
    const centroY = this.puntoInicio.y;
    const falso = () => Array.from({ length: this.alto }, () => Array(this.ancho).fill(false));

    this.troncoPuesto = falso();
    this.tocado = Array.from({ length: this.alto }, () => Array(this.ancho).fill(-1));
    this.arboles = [];
    this.delante = [];
    let plantados = 0;

    for (let y = 3; y < this.alto; y += 8) {
      for (let x = 2; x < this.ancho; x += 5) {
        const umbral = this.biomaEn(x, y) === "prado" ? 0.74 : 0.28;
        if (this.ruido(x, y, this.semilla + 17) < umbral) continue;

        const ox = x + Math.floor(this.ruido(x, y + 8, this.semilla) * 3) - 1;
        const oy = y + Math.floor(this.ruido(x + 8, y, this.semilla) * 3) - 1;
        if (!this.cabeArbol(ox, oy, centroX, centroY)) continue;

        const nivel = this.nivelDeArbol(ox, oy);
        this.colocarArbol(ox, oy, nivel);
        this.marcarArbol(ox, oy, this.arboles.length);
        this.arboles.push({ nivel });
        plantados++;
      }
    }

    const encima = this.arboles.filter(arbol => arbol.nivel > 0).length;
    const maximo = this.arboles.reduce((alto, arbol) => Math.max(alto, arbol.nivel), 0);
    console.log(`[Forest] Árboles plantados: ${plantados}. Por delante: ${encima}. Niveles: ${maximo}`);
  }

  cabeArbol(x, y, centroX, centroY) {
    for (const [dx, dy] of TRONCO) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= this.ancho || ty >= this.alto) return false;
      if (this.troncoPuesto[ty][tx]) return false;
      if (this.agujero[ty][tx] || this.camino[ty][tx] || this.rio[ty][tx]) return false;
      if (Math.abs(tx - centroX) <= 5 && Math.abs(ty - centroY) <= 5) return false;
    }

    return true;
  }

  // El árbol nuevo queda justo por encima del más alto que toca.
  nivelDeArbol(x, y) {
    let maximo = -1;

    for (const piezas of [SOMBRA, TRONCO, COPA]) {
      for (const [dx, dy] of piezas) {
        const tx = x + dx;
        const ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= this.ancho || ty >= this.alto) continue;
        const indice = this.tocado[ty][tx];
        if (indice < 0) continue;
        if (this.arboles[indice].nivel > maximo) maximo = this.arboles[indice].nivel;
      }
    }

    return maximo + 1;
  }

  colocarArbol(x, y, nivel) {
    if (nivel === 0) {
      this.estamparPiezas(this.decorado, x, y, SOMBRA, true);
      this.estamparPiezas(this.tronco, x, y, TRONCO, false);
      this.estamparPiezas(this.copa, x, y, COPA, false);
    } else {
      const extra = { nivel, sombra: [], tronco: [], copa: [] };
      this.anotarPiezas(extra.sombra, x, y, SOMBRA);
      this.anotarPiezas(extra.tronco, x, y, TRONCO);
      this.anotarPiezas(extra.copa, x, y, COPA);
      this.delante.push(extra);
    }

    for (const [dx, dy] of TRONCO) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= this.ancho || ty >= this.alto) continue;
      this.troncoPuesto[ty][tx] = true;
    }
  }

  anotarPiezas(lista, x, y, piezas) {
    for (const [dx, dy, id] of piezas) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= this.ancho || ty >= this.alto) continue;
      lista.push({ x: tx, y: ty, id });
    }
  }

  marcarArbol(x, y, indice) {
    for (const piezas of [SOMBRA, TRONCO, COPA]) {
      for (const [dx, dy] of piezas) {
        const tx = x + dx;
        const ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= this.ancho || ty >= this.alto) continue;
        this.tocado[ty][tx] = indice;
      }
    }
  }

  estamparPiezas(matriz, x, y, piezas, reemplazar = false) {
    for (const [dx, dy, id] of piezas) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= this.ancho || ty >= this.alto) continue;
      if (!reemplazar && matriz[ty][tx] !== -1) continue;
      matriz[ty][tx] = id;
    }
  }

  pintar() {
    console.log("[Forest] Pintando las cuatro capas...");

    const scene = this.scene;
    this.mapa = scene.make.tilemap({
      tileWidth: RECURSOS_TERRENO.tile,
      tileHeight: RECURSOS_TERRENO.tile,
      width: this.ancho,
      height: this.alto
    });

    const suelo = this.mapa.addTilesetImage(
      RECURSOS_TERRENO.suelo.clave,
      RECURSOS_TERRENO.suelo.clave,
      RECURSOS_TERRENO.tile,
      RECURSOS_TERRENO.tile
    );
    const agua = this.mapa.addTilesetImage(
      RECURSOS_TERRENO.agua.clave,
      RECURSOS_TERRENO.agua.clave,
      RECURSOS_TERRENO.tile,
      RECURSOS_TERRENO.tile,
      0,
      0,
      DESFASE_AGUA
    );
    const arboles = this.mapa.addTilesetImage(
      RECURSOS_TERRENO.arboles.clave,
      RECURSOS_TERRENO.arboles.clave,
      RECURSOS_TERRENO.tile,
      RECURSOS_TERRENO.tile,
      0,
      0,
      DESFASE_ARBOLES
    );

    if (!suelo || !agua || !arboles) {
      throw new Error("[Forest] No se pudieron conectar los tilesets.");
    }

    this.capaSuelo = this.crearCapa("suelo", [suelo, agua], this.suelo, 0);
    this.capaDecorado = this.crearCapa("decorado", [suelo, arboles], this.decorado, 1, DESFASE_ARBOLES);
    this.capaTronco = this.crearCapa("tronco", arboles, this.tronco, 2, DESFASE_ARBOLES);
    this.capaCopa = this.crearCapa("copa", arboles, this.copa, PROFUNDIDAD_COPA, DESFASE_ARBOLES);

    this.capaTronco.setCollisionByExclusion([-1]);
    this.capaSuelo.setCollision(this.solidosAgua);
    this.capasTronco = [this.capaTronco];
    this.capasDelante = [];
    this.pintarArbolesDelante(arboles);

    console.log("[Forest] Capas pintadas.");
    return this.capaSuelo;
  }

  crearCapa(nombre, tileset, matriz, profundidad, desfase = 0) {
    const capa = this.mapa.createBlankLayer(
      nombre,
      tileset,
      0,
      0,
      this.ancho,
      this.alto
    );

    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        const id = matriz[y][x];
        if (id < 0) continue;
        const indice = desfase && id > 400 ? id + desfase : id;
        capa.putTileAt(indice, x, y);
      }
    }

    capa.setDepth(profundidad);
    return capa;
  }

  // Cada árbol que toca a otro lleva sus tres capas un paso por delante.
  pintarArbolesDelante(tileset) {
    const tile = RECURSOS_TERRENO.tile;

    this.delante.forEach((extra, indice) => {
      const sombra = this.crearCapaParcial(
        `sombra-${indice}`,
        tileset,
        extra.sombra,
        1 + extra.nivel * 0.001,
        tile
      );
      const tronco = this.crearCapaParcial(
        `tronco-${indice}`,
        tileset,
        extra.tronco,
        2 + extra.nivel * 0.001,
        tile
      );
      const copa = this.crearCapaParcial(
        `copa-${indice}`,
        tileset,
        extra.copa,
        PROFUNDIDAD_COPA + extra.nivel,
        tile
      );

      if (sombra) this.capasDelante.push(sombra);
      if (tronco) {
        tronco.setCollisionByExclusion([-1]);
        this.capasTronco.push(tronco);
        this.capasDelante.push(tronco);
      }
      if (copa) this.capasDelante.push(copa);
    });
  }

  crearCapaParcial(nombre, tileset, piezas, profundidad, tile) {
    if (!piezas.length) return null;

    let minX = piezas[0].x;
    let minY = piezas[0].y;
    let maxX = piezas[0].x;
    let maxY = piezas[0].y;

    for (const pieza of piezas) {
      if (pieza.x < minX) minX = pieza.x;
      if (pieza.y < minY) minY = pieza.y;
      if (pieza.x > maxX) maxX = pieza.x;
      if (pieza.y > maxY) maxY = pieza.y;
    }

    const capa = this.mapa.createBlankLayer(
      nombre,
      tileset,
      minX * tile,
      minY * tile,
      maxX - minX + 1,
      maxY - minY + 1
    );

    for (const pieza of piezas) {
      const indice = pieza.id > 400 ? pieza.id + DESFASE_ARBOLES : pieza.id;
      capa.putTileAt(indice, pieza.x - minX, pieza.y - minY);
    }

    capa.setDepth(profundidad);
    return capa;
  }
}
