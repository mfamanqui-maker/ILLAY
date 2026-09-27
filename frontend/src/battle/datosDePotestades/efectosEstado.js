/**
 * efectosEstado.js — Efectos de ficha y como se ponen/quitan.
 *
 * cristianismo: hoja 2 frame 3.
 * dominio: el icono que tenia cristianismo (hoja 1 frame 114).
 * muerto: hoja 2 frame 13.
 * caza: hoja 2 frame 5 (Intelectual esperando a que el marcado actue).
 */

export const ICONO_EFECTO = {
  cristianismo: { frame: 3, hoja: 1 },
  dominio: { frame: 114, hoja: 1 },
  muerto: { frame: 13, hoja: 2 },
  caza: { frame: 5, hoja: 2 },
};

function mapaDe(potestad) {
  if (!potestad) return null;
  if (!potestad.efectos || Array.isArray(potestad.efectos)) {
    potestad.efectos = {};
  }
  return potestad.efectos;
}

export function ponerEfecto(potestad, nombre) {
  const icono = ICONO_EFECTO[nombre];
  const mapa = mapaDe(potestad);
  if (!icono || !mapa) return;
  mapa[nombre] = { ...icono };
}

export function quitarEfecto(potestad, nombre) {
  if (!potestad?.efectos || Array.isArray(potestad.efectos)) return;
  delete potestad.efectos[nombre];
}

function entradaDe(registro, id) {
  if (id == null || !registro?.obtenerPorId) return null;
  return registro.obtenerPorId(id) ?? registro.obtenerPorId(Number(id)) ?? null;
}

function soltarMarcaDeBlanco(registro, idBlanco) {
  const blanco = entradaDe(registro, idBlanco)?.potestad;
  if (blanco) blanco.marcadoApuntar = null;
}

export function caducarCazasActivas(registro) {
  (registro?.todos?.() ?? []).forEach(({ potestad }) => {
    if (!potestad?.cazaActiva) return;
    soltarMarcaDeBlanco(registro, potestad.estadisticas?.apuntando);
    potestad.cazaActiva = false;
    if (potestad.estadisticas) potestad.estadisticas.apuntando = null;
    quitarEfecto(potestad, 'caza');
  });
}

export function promoverCazasPendientes(registro) {
  (registro?.todos?.() ?? []).forEach(({ potestad }) => {
    const pend = potestad?.cazaPendiente;
    if (!pend || pend.idBlanco == null) return;
    potestad.cazaPendiente = null;
    if (potestad.muerta || Number(potestad.estadisticas?.hp) <= 0) return;
    const blanco = entradaDe(registro, pend.idBlanco)?.potestad;
    if (!blanco || blanco.muerta || Number(blanco.estadisticas?.hp) <= 0) return;
    potestad.cazaActiva = true;
    if (potestad.estadisticas) potestad.estadisticas.apuntando = blanco.id;
    blanco.marcadoApuntar = {
      dano: Number(pend.dano ?? 3),
      idCazador: potestad.id,
    };
    ponerEfecto(potestad, 'caza');
  });
}

/** Tras el combate: se va la caza de este turno y entra la que se apunto el anterior. */
export function avanzarCicloCaza(registro) {
  caducarCazasActivas(registro);
  promoverCazasPendientes(registro);
}
