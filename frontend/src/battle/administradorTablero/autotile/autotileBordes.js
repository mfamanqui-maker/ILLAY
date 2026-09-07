let config = null;

/** Máscara numérica interna → clave legible del JSON (porVecinosVacios) */
const MASCARA_A_CASO = {
  0: 'sinVaciosAlrededor',
  1: 'vacioArriba',
  2: 'vacioDerecha',
  4: 'vacioAbajo',
  8: 'vacioIzquierda',
  3: 'vacioArribaYDerecha',
  5: 'vacioArribaYAbajo',
  6: 'vacioAbajoYDerecha',
  9: 'vacioArribaEizquierda',
  10: 'vacioIzquierdaYDerecha',
  12: 'vacioAbajoEizquierda',
  7: 'vacioArribaDerechaAbajo_faltaIzquierda',
  11: 'vacioArribaDerechaIzquierda_faltaAbajo',
  13: 'vacioArribaAbajoIzquierda_faltaDerecha',
  14: 'vacioDerechaAbajoIzquierda_faltaArriba',
  15: 'vacioLosCuatroLados',
};

const MASCARA_A_ESQUINA = {
  3: 'norteEste',
  6: 'surEste',
  9: 'norteOeste',
  12: 'surOeste',
};

const DIAG_A_HUECO = {
  ne: 'diagonalNoreste',
  nw: 'diagonalNoroeste',
  se: 'diagonalSureste',
  sw: 'diagonalSuroeste',
};

export function initAutotileConfig(json) {
  config = json;
}

function cfg() {
  if (!config) {
    throw new Error('Autotile: llama initAutotileConfig() con bordesFrames.json antes de usar el sistema.');
  }
  return config;
}

export function esCasillaRelleno(tablero, x, y, idRelleno = (id) => id !== 0) {
  const celda = tablero?.[y]?.[x];
  if (!celda) return false;
  return idRelleno(celda.id);
}

function esDistinto(tablero, x, y, idRelleno) {
  return !esCasillaRelleno(tablero, x, y, idRelleno);
}

/** N=1, E=2, S=4, W=8 (vecino distinto / vacío) */
export function bitmaskCardinales(tablero, x, y, idRelleno = (id) => id !== 0) {
  const n = esDistinto(tablero, x, y - 1, idRelleno);
  const s = esDistinto(tablero, x, y + 1, idRelleno);
  const e = esDistinto(tablero, x + 1, y, idRelleno);
  const w = esDistinto(tablero, x - 1, y, idRelleno);

  const mask =
    (n ? 1 : 0) |
    (e ? 2 : 0) |
    (s ? 4 : 0) |
    (w ? 8 : 0);

  return { n, s, e, w, mask };
}

function claveTexturaDesdeArchivo(archivo) {
  if (!archivo) return null;
  return `borde_${archivo.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

function archivoPorCaso(caso) {
  if (!caso) return null;
  return cfg().porVecinosVacios[caso] ?? null;
}

function archivoDesdeMascara(mask) {
  const caso = MASCARA_A_CASO[mask];
  return archivoPorCaso(caso);
}

function recolectarArchivos(obj, set) {
  if (obj == null) return;
  if (typeof obj === 'string') {
    set.add(obj);
    return;
  }
  if (typeof obj === 'object') {
    Object.values(obj).forEach((v) => recolectarArchivos(v, set));
  }
}

export function getTexturasBorde() {
  const { rutaBase } = cfg();
  const archivos = new Set();

  recolectarArchivos(cfg().porVecinosVacios, archivos);
  recolectarArchivos(cfg().esquinasEnL, archivos);
  recolectarArchivos(cfg().huecoSoloEnDiagonal, archivos);
  recolectarArchivos(cfg().reservaOpcional, archivos);

  const texturas = {};
  for (const archivo of archivos) {
    const clave = claveTexturaDesdeArchivo(archivo);
    texturas[clave] = `${rutaBase}/${archivo}`;
  }
  return texturas;
}

function esquinaConDiagonal(tablero, x, y, mask, idRelleno) {
  const nombreEsquina = MASCARA_A_ESQUINA[mask];
  if (!nombreEsquina) return archivoDesdeMascara(mask);

  const diag = {
    3: [x + 1, y - 1],
    6: [x + 1, y + 1],
    9: [x - 1, y - 1],
    12: [x - 1, y + 1],
  }[mask];

  const [dx, dy] = diag;
  const grupo = cfg().esquinasEnL[nombreEsquina];
  return esDistinto(tablero, dx, dy, idRelleno) ? grupo.exterior : grupo.interior;
}

export function varianteBordeEn(tablero, x, y, idRelleno = (id) => id !== 0) {
  if (!esCasillaRelleno(tablero, x, y, idRelleno)) return null;

  const { mask } = bitmaskCardinales(tablero, x, y, idRelleno);

  if (mask === 0) {
    const ne = esDistinto(tablero, x + 1, y - 1, idRelleno);
    const nw = esDistinto(tablero, x - 1, y - 1, idRelleno);
    const se = esDistinto(tablero, x + 1, y + 1, idRelleno);
    const sw = esDistinto(tablero, x - 1, y + 1, idRelleno);
    const huecos = cfg().huecoSoloEnDiagonal;

    if (ne) return claveTexturaDesdeArchivo(huecos[DIAG_A_HUECO.ne]);
    if (nw) return claveTexturaDesdeArchivo(huecos[DIAG_A_HUECO.nw]);
    if (se) return claveTexturaDesdeArchivo(huecos[DIAG_A_HUECO.se]);
    if (sw) return claveTexturaDesdeArchivo(huecos[DIAG_A_HUECO.sw]);
    return null;
  }

  if (MASCARA_A_ESQUINA[mask]) {
    const archivo = esquinaConDiagonal(tablero, x, y, mask, idRelleno);
    return claveTexturaDesdeArchivo(archivo);
  }

  return claveTexturaDesdeArchivo(archivoDesdeMascara(mask));
}

export function claveBordeEn(tablero, x, y, idRelleno = (id) => id !== 0) {
  return varianteBordeEn(tablero, x, y, idRelleno);
}

export function celdasAfectadas(tablero, x, y) {
  const lista = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = x + dx;
      const cy = y + dy;
      if (tablero?.[cy]?.[cx] != null) lista.push({ x: cx, y: cy });
    }
  }
  return lista;
}

export function iterarCeldasRelleno(tablero, idRelleno = (id) => id !== 0) {
  const celdas = [];
  for (let y = 0; y < tablero.length; y++) {
    for (let x = 0; x < tablero[y].length; x++) {
      if (esCasillaRelleno(tablero, x, y, idRelleno)) celdas.push({ x, y });
    }
  }
  return celdas;
}

export function iterarCeldasARefrescar(tablero, region = null, idRelleno = (id) => id !== 0) {
  if (!region) return iterarCeldasRelleno(tablero, idRelleno);

  const visto = new Set();
  const lista = [];
  for (const { x, y } of region) {
    for (const c of celdasAfectadas(tablero, x, y)) {
      const key = `${c.x},${c.y}`;
      if (visto.has(key)) continue;
      visto.add(key);
      if (esCasillaRelleno(tablero, c.x, c.y, idRelleno)) lista.push(c);
    }
  }
  return lista;
}

export function calcularBordesTablero(tablero, region = null, idRelleno = (id) => id !== 0) {
  const celdas = iterarCeldasARefrescar(tablero, region, idRelleno);
  return celdas.map(({ x, y }) => ({
    x,
    y,
    clave: claveBordeEn(tablero, x, y, idRelleno),
  }));
}
