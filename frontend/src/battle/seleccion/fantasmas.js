/**
 * seleccion/fantasmas.js — Sprite translucido en el destino de la movilidad.
 *
 * SPECT: docs/spects/spect006.md
 *
 * Tambien fija `potestad.posicionPlanificada`, que usan rango y tipo 1.
 */

/** id potestad → sprite fantasma de movilidad. */
const fantasmasMovilidad = new Map();

export function colocarFantasmaMovilidad(potestad, destino, escena, tamanoCasilla = 400) {
  if (!potestad || !destino || !escena?.add) return null;
  quitarFantasmaMovilidad(potestad.id);
  const src = potestad.sprite;
  if (!src?.texture) return null;
  const t = Number(tamanoCasilla) || 400;
  const x = (Number(destino.x) - 1) * t + t / 2;
  const y = (Number(destino.y) - 1) * t + t / 2 - 40;
  const ghost = escena.add.sprite(x, y, src.texture.key, src.frame?.name ?? 0);
  ghost.setOrigin(src.originX ?? 0.5, src.originY ?? 0.5);
  ghost.setFlipX(Boolean(src.flipX));
  ghost.setScale(src.scaleX ?? 1, src.scaleY ?? 1);
  ghost.setAlpha(0.35);
  ghost.setDepth((src.depth ?? 8) + 1);
  ghost.disableInteractive?.();
  fantasmasMovilidad.set(String(potestad.id), ghost);
  potestad.posicionPlanificada = { x: Number(destino.x), y: Number(destino.y) };
  return ghost;
}

export function quitarFantasmaMovilidad(id) {
  if (id == null) return;
  const ghost = fantasmasMovilidad.get(String(id));
  ghost?.destroy?.();
  fantasmasMovilidad.delete(String(id));
}

export function limpiarFantasmasMovilidad(potestades) {
  fantasmasMovilidad.forEach((ghost) => ghost.destroy?.());
  fantasmasMovilidad.clear();
  (potestades ?? []).forEach((entrada) => {
    const potestad = entrada?.potestad ?? entrada;
    if (potestad) potestad.posicionPlanificada = null;
  });
}
