/**
 * ejecucion/foto.js — Estado al inicio del grupo y delta de cada tarea.
 *
 * SPECT: docs/spects/spect007.md
 *
 * La foto es la copia plana de estadisticas + posicion (regla 10). El delta
 * contra ella es lo que el registro de jugadas guarda como `efecto`.
 */

export function tomarFoto(potestades) {
  return (potestades ?? []).map((p) => ({
    id: p?.id,
    hp: Number(p?.estadisticas?.hp ?? 0),
    estadisticas: { ...(p?.estadisticas ?? {}) },
    posicion: p?.datos?.posicion
      ? { x: Number(p.datos.posicion.x), y: Number(p.datos.posicion.y) }
      : null,
  }));
}

function fotoDe(foto, id) {
  return (foto ?? []).find((f) => String(f.id) === String(id)) ?? null;
}

export function efectoDeTarea(tarea, foto) {
  const efecto = {};
  const obj = typeof tarea.objetivo === 'object' && tarea.objetivo?.estadisticas
    ? tarea.objetivo
    : null;
  if (obj) {
    const prevObj = fotoDe(foto, obj.id);
    if (prevObj) {
      const dHp = Number(obj.estadisticas.hp) - Number(prevObj.hp);
      if (dHp) efecto.hp = dHp;
    }
  }
  const lanzador = tarea.potestad;
  if (!lanzador?.estadisticas) return Object.keys(efecto).length ? efecto : null;
  const prev = fotoDe(foto, lanzador.id);
  if (!prev) return Object.keys(efecto).length ? efecto : null;
  if (efecto.hp == null) {
    const dHp = Number(lanzador.estadisticas.hp) - Number(prev.hp);
    if (dHp) efecto.hp = dHp;
  }
  const pos = lanzador.datos?.posicion;
  if (pos && prev.posicion && (Number(pos.x) !== prev.posicion.x || Number(pos.y) !== prev.posicion.y)) {
    efecto.posicion = { x: Number(pos.x), y: Number(pos.y) };
  }
  const statsPrev = prev.estadisticas ?? {};
  ['magia', 'conocimiento'].forEach((clave) => {
    const d = Number(lanzador.estadisticas[clave] ?? 0) - Number(statsPrev[clave] ?? 0);
    if (d) efecto[clave] = d;
  });
  return Object.keys(efecto).length ? efecto : null;
}
