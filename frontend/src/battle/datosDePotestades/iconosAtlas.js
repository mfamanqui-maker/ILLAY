/**
 * Hojas de iconos del panel y las orbes.
 *
 * Acciones/objetos/movimiento: `frame` en acciones.png (16×16 celdas de 128px).
 * Efectos: `frame` + `hoja` 1 (efectos01) o 2 (efectos02).
 *
 * IndexDePotestades no importa este archivo (regla 9): solo transporta los
 * numeros. Aqui vive la textura.
 */

export const ATLAS_ACCIONES = {
  clave: 'iconosAcciones',
  archivo: 'assets/images/battle/Iconos/acciones.png',
  frameWidth: 128,
  frameHeight: 128,
};

export const ATLAS_EFECTOS = {
  1: {
    clave: 'iconosEfectos01',
    archivo: 'assets/images/battle/Iconos/efectos01.png',
    frameWidth: 400,
    frameHeight: 400,
  },
  2: {
    clave: 'iconosEfectos02',
    archivo: 'assets/images/battle/Iconos/efectos02.png',
    frameWidth: 400,
    frameHeight: 400,
  },
};

/** Indices 0-based, 16 columnas: frame = fila * 16 + columna. */
export const FRAME = {
  curar: 33,
  escudar: 95,
  atacar: 176,
  descansar: 200,
  trampa: 1,
  moverseNormal: 217,
  moverseRápido: 186,
  ritual: 130,
  pacto: 131,
  maldicion: 160,
  estudiar: 126,
  apuntar: 223,
  disparar: 68,
  generarMagia: 146,
  rayoDeMagia: 194,
  zombiosis: 99,
};

function cargarHoja(scene, atlas) {
  if (!scene?.load || !atlas?.clave) return;
  if (scene.textures.exists(atlas.clave)) return;
  scene.load.spritesheet(atlas.clave, atlas.archivo, {
    frameWidth: atlas.frameWidth,
    frameHeight: atlas.frameHeight,
  });
}

export function precargarAtlasIconos(scene, opciones = {}) {
  cargarHoja(scene, ATLAS_ACCIONES);
  if (opciones.efectos === false) return;
  Object.values(ATLAS_EFECTOS).forEach((atlas) => cargarHoja(scene, atlas));
}

/**
 * { clave, frame, tipo } o null si el item no trae icono de hoja.
 * `tipo` es 'accion' | 'efecto' para que el pintor sepa si teñir.
 */
export function resolverIcono(item) {
  if (item == null) return null;
  const frame = item.frame;
  if (frame == null || Number.isNaN(Number(frame))) return null;
  const hoja = item.hoja ?? item.atlas;
  if (hoja != null) {
    const atlas = ATLAS_EFECTOS[Number(hoja)];
    if (!atlas) return null;
    return { clave: atlas.clave, frame: Number(frame), tipo: 'efecto' };
  }
  return { clave: ATLAS_ACCIONES.clave, frame: Number(frame), tipo: 'accion' };
}
