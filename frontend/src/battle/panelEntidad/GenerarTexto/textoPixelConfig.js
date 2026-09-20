/**
 * Estilos de texto pixel.
 *
 * Solo se usa la fuente ASCII de `text.png` (panel). Cada carácter ocupa una
 * celda fija en una rejilla de 16 columnas; el frame se calcula por código ASCII.
 *
 * `tint` se cuece en el canvas (source-atop): el PNG es un único color sobre
 * transparente, teñir a negro lo oscurece por completo. No se usa setOrigin
 * fraccionario sobre la imagen: el ancla se aplica desplazando en píxeles.
 */
export const ESTILOS_TEXTO = {
  panel: {
    textura: 'panelText',
    archivo: 'assets/images/battle/panel/text.png',
    modo: 'ascii',
    columnas: 16,
    anchoCelda: 10,
    altoCelda: 12,
    tint: 0x000000,
  },
};
