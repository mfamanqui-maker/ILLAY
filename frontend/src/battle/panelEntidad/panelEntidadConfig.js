/**
 * Configuración central del panel de detalle de entidad.
 * Todas las medidas son fracciones de la cámara cuando es posible,
 * o píxeles fijos para tamaños pequeños (íconos, padding, etc.).
 *
 * El módulo es Phaser puro; el modal se dibuja sobre la escena `entidad`
 * para no ser afectado por zoom/pan del tablero.
 */

export const DEPTHS = {
  velo: 950,
  fondo: 1000,
  contenido: 1010,
  scroll: 1015,
  mask: 1020,
  tooltip: 1030,
  header: 1040,
  botones: 1050,
};

export const COLORES = {
  velo: 0x000000,
  veloAlpha: 0.55,
  fondo: 0x2b1d0e,
  fondoAlpha: 0.96,
  borde: 0xf5d68a,
  bordeGrosor: 4,
  separador: 0xf5d68a,
  separadorAlpha: 0.55,
  bandaTitulo: 0x3d2817,
  bandaSeccion: 0x1f1408,
  tooltipFondo: 0x6E605E,
  tooltipBorde: 0xf5d68a,
  botonFondo: 0x3d2817,
  botonHover: 0x5a3a1f,
  botonBorde: 0xf5d68a,
  iconoMarcoVacio: 0x140d05,
  flechaFondo: 0x3d2817,
  flechaHover: 0x5a3a1f,
  cerrarFondo: 0x4a1414,
  cerrarHover: 0x7a1f1f,
};

export const PANEL = {
  fraccionAncho: 0.92,
  fraccionAlto: 0.88,
  padding: 18,
};

/**
 * Texturas del nuevo skin del panel.
 * `panel.png` es 1700×900 (mismo tamaño nativo que el juego) y ya trae las
 * vendas rojas, la banda de nombre, el recuadro de la imagen de referencia y
 * el divisor central. Se usa como fondo y el contenido se superpone encima.
 */
export const ASSETS = {
  fondo: { clave: 'panelFondo', archivo: 'assets/images/battle/panel/panel.png' },
  fuente: { clave: 'panelText', archivo: 'assets/images/battle/panel/text.png' },
  barraLlena: { clave: 'panelBarraLlena', archivo: 'assets/images/battle/panel/barraDeVida.png' },
  barraVacia: { clave: 'panelBarraVacia', archivo: 'assets/images/battle/panel/Barra_de_vida2.png' },
  venda: { clave: 'panelVenda', archivo: 'assets/images/battle/panel/Next.png' },
  vendaSel: { clave: 'panelVendaSel', archivo: 'assets/images/battle/panel/NextSeleccion.png' },
  base: {
    clave: 'panelBase',
    archivo: 'assets/images/battle/panel/Base.png',
    frameWidth: 16,
    frameHeight: 16,
    margin: 0,
    spacing: 2,
    columnas: 30,
  },
};

/** Nine-patch marrón [TL,T,TR, L,C,R, BL,B,BR] del bloque que empieza en 396. */
export const NINE_PATCH_MARRON = {
  textura: ASSETS.base.clave,
  frames: [396, 397, 398, 426, 427, 428, 456, 457, 458],
  celda: 16,
};

/** Frame del orbe redondo marrón (base de las subacciones). */
export const ORBE_BASE_FRAME = 667;

/**
 * Distribución del contenido como fracciones de panel.png (1700×900).
 * Medidas tomadas de la propia imagen (banda de nombre, recuadro gris, vendas,
 * divisor central) para que los overlays caigan sobre el dibujo del fondo.
 */
export const LAYOUT = {
  vendaIzq: { x: 0.013, y: 0.0, w: 0.060, h: 0.150 },
  vendaDer: { x: 0.927, y: 0.0, w: 0.060, h: 0.150 },
  nombre: { x: 0.127, y: 0.058, w: 0.262, h: 0.078 },
  foto: { x: 0.047, y: 0.209, w: 0.159, h: 0.351 },
  barraVida: { x: 0.225, y: 0.235, w: 0.250, h: 0.060 },
  textoVida: { x: 0.225, y: 0.300, w: 0.250, h: 0.045 },
  botones: { x: 0.225, y: 0.360, w: 0.250, h: 0.150 },
  tooltip: { x: 0.047, y: 0.600, w: 0.430, h: 0.330 },
  statsEfectos: { x: 0.520, y: 0.150, w: 0.215, h: 0.800 },
  acciones: { x: 0.752, y: 0.150, w: 0.230, h: 0.800 },
};

export const HEADER = {
  altoFraccion: 0.12,
  flechaAncho: 90,
  flechaAlto: 64,
  cerrarTam: 56,
  nombreEscala: 3,
  nombreEstilo: 'panel',
};

export const LADO_IZQUIERDO = {
  anchoFraccion: 0.32,
  paddingInterno: 16,
  fotoFraccionAlto: 0.5,
  barraVidaAlto: 28,
  gapVerticalEntreBloques: 14,
  textoVidaEscala: 2,
  textoVidaEstilo: 'panel',
  tooltipAlto: 132,
  tooltipPadding: 14,
  tooltipTextoEscala: 1.5,
  tooltipTextoEstilo: 'panel',
  tooltipTitulo: 'PASA EL MOUSE SOBRE UNA CUALIDAD',
  botonAlto: 44,
  botonGap: 10,
  botonTextoEscala: 1.5,
  botonTextoEstilo: 'panel',
};

export const LISTAS = {
  filaAlto: 56,
  filaPaddingX: 10,
  iconoTam: 40,
  iconoMarcoTam: 48,
  gapIconoTexto: 10,
  gapNombreCantidad: 14,
  textoEscala: 1.5,
  textoEstilo: 'panel',
  tituloEscala: 2,
  tituloEstilo: 'panel',
  tituloAlto: 36,
  separadorFilasAlpha: 0.18,
  scrollVelocidad: 0.6,
};

export const LADO_DERECHO = {
  paddingInterno: 12,
  splitFraccion: 0.5,
  gapColumnaInterna: 8,
};

export const DESCRIPCIONES = {
  estadisticas: {
    clave: 'panelEntidad_desc_estadisticas',
    ruta: 'src/battle/panelEntidad/descripciones/estadisticas.json',
  },
  efectos: {
    clave: 'panelEntidad_desc_efectos',
    ruta: 'src/battle/panelEntidad/descripciones/efectos.json',
  },
  acciones: {
    clave: 'panelEntidad_desc_acciones',
    ruta: 'src/battle/panelEntidad/descripciones/acciones.json',
  },
  objetos: {
    clave: 'panelEntidad_desc_objetos',
    ruta: 'src/battle/panelEntidad/descripciones/objetos.json',
  },
  movimiento: {
    clave: 'panelEntidad_desc_movimiento',
    ruta: 'src/battle/panelEntidad/descripciones/movimiento.json',
  },
};

export const ICONO_FALLBACK = 'assets/images/system/candle.png';

export function claveTexturaImagen(ruta) {
  return `panelEntidad_img_${String(ruta).replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

export function obtenerDescripcion(scene, clave, nombreItem) {
  const meta = DESCRIPCIONES[clave];
  if (!meta) return null;
  const cache = scene.cache?.json;
  if (!cache?.exists(meta.clave)) return null;
  const tabla = cache.get(meta.clave);
  if (!tabla || typeof tabla !== 'object') return null;
  const key = String(nombreItem ?? '').toUpperCase();
  return tabla[key] ?? tabla[nombreItem] ?? null;
}
