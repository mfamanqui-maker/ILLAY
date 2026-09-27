/**
 * Utilidades cortas sobre moldes JSON. Siempre copia; no muta el original.
 *
 * alterarMolde(molde, opciones) compone todo lo demas.
 */

export const MOLDES = {
  molde001: 'src/battle/AlmacenDeMoldes/Molde001.json',
  molde002: 'src/battle/AlmacenDeMoldes/Molde002.json',
  multiplayer: 'src/battle/AlmacenDeMoldes/Molde_Multiplayer.json',
};

const copiar = (v) => JSON.parse(JSON.stringify(v));
const clave = (x, y) => `${x},${y}`;

function barajar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function entero(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function celdas(molde) {
  const { filas, columnas } = molde.configTablero;
  const out = [];
  for (let y = 1; y <= filas; y++) for (let x = 1; x <= columnas; x++) out.push({ x, y });
  return out;
}

function esHueco(molde, x, y) {
  const esp = (molde.casillasEspeciales ?? []).find((c) => c.posicion?.x === x && c.posicion?.y === y);
  if (esp) return esp.arquetipo === 'vacio';
  return molde.configTablero?.casillaArquetipo === 'vacio';
}

function ocupadasPorUnidades(molde) {
  const set = new Set();
  for (const bando of ['Aliados', 'Enemigos']) {
    for (const u of molde.equipos?.[bando] ?? []) {
      const { x, y } = u.posicion ?? {};
      if (Number.isFinite(x) && Number.isFinite(y)) set.add(clave(x, y));
    }
  }
  return set;
}

function casillasLibres(molde, { permitirHueco = false } = {}) {
  const ocupadas = ocupadasPorUnidades(molde);
  return celdas(molde).filter(({ x, y }) => {
    if (ocupadas.has(clave(x, y))) return false;
    if (!permitirHueco && esHueco(molde, x, y)) return false;
    return true;
  });
}

function siguienteId(molde) {
  let max = 0;
  for (const bando of ['Aliados', 'Enemigos']) {
    for (const u of molde.equipos?.[bando] ?? []) {
      if (Number.isFinite(u.id)) max = Math.max(max, u.id);
    }
  }
  return max + 1;
}

/** { filas?, columnas?, casillaArquetipo?, tamaño? } */
export function cambiarTablero(molde, { filas, columnas, casillaArquetipo, tamaño } = {}) {
  const m = copiar(molde);
  if (Number.isInteger(filas) && filas > 0) m.configTablero.filas = filas;
  if (Number.isInteger(columnas) && columnas > 0) m.configTablero.columnas = columnas;
  if (typeof casillaArquetipo === 'string' && casillaArquetipo) m.configTablero.casillaArquetipo = casillaArquetipo;
  if (Number.isFinite(tamaño)) m.configTablero.tamaño = tamaño;

  const { filas: f, columnas: c } = m.configTablero;
  m.casillasEspeciales = (m.casillasEspeciales ?? []).filter(
    (cel) => cel.posicion.x >= 1 && cel.posicion.x <= c && cel.posicion.y >= 1 && cel.posicion.y <= f,
  );
  for (const bando of ['Aliados', 'Enemigos']) {
    for (const u of m.equipos?.[bando] ?? []) {
      const { x, y } = u.posicion ?? {};
      const fuera = !Number.isFinite(x) || !Number.isFinite(y) || x < 1 || y < 1 || x > c || y > f;
      if (fuera) u.posicion = null;
    }
  }
  return colocarSinPosicion(m);
}

function colocarSinPosicion(molde) {
  const m = molde;
  let libres = barajar(casillasLibres(m));
  for (const bando of ['Aliados', 'Enemigos']) {
    for (const u of m.equipos?.[bando] ?? []) {
      if (u.posicion != null) continue;
      const cel = libres.pop();
      if (!cel) throw new Error('[TabuladorDeMoldes] sin casillas para reubicar unidades.');
      u.posicion = { x: cel.x, y: cel.y };
    }
  }
  return m;
}

/** { nivel?, delta?, min?, max? } — solo bando Enemigos */
export function ajustarNivelesEnemigos(molde, { nivel, delta, min, max } = {}) {
  const m = copiar(molde);
  const enemigos = m.equipos?.Enemigos ?? [];
  for (const u of enemigos) {
    if (Number.isFinite(nivel)) u.nivel = Math.max(1, nivel);
    else if (Number.isFinite(delta)) u.nivel = Math.max(1, (u.nivel ?? 1) + delta);
    else if (Number.isFinite(min) && Number.isFinite(max)) {
      u.nivel = entero(Math.max(1, min), Math.max(min, max));
    }
  }
  return m;
}

/**
 * Cada entrada: { arquetipo, nivel?, invetario?, id?, posicion? }.
 * Sin posicion → casilla libre al azar.
 */
export function agregarEnemigos(molde, lista) {
  const m = copiar(molde);
  if (!Array.isArray(lista) || lista.length === 0) return m;
  m.equipos.Enemigos = m.equipos.Enemigos ?? [];
  let libres = barajar(casillasLibres(m));
  let nextId = siguienteId(m);
  for (const plantilla of lista) {
    const cel = plantilla.posicion ?? libres.pop();
    if (!cel) break;
    m.equipos.Enemigos.push({
      id: plantilla.id ?? nextId++,
      arquetipo: plantilla.arquetipo,
      invetario: plantilla.invetario ?? [],
      nivel: plantilla.nivel ?? 1,
      posicion: plantilla.posicion ? { ...plantilla.posicion } : { x: cel.x, y: cel.y },
    });
  }
  return m;
}

/** Reparte posiciones aleatorias solo entre Enemigos (Aliados no se mueven). */
export function reubicarEnemigosAlAzar(molde) {
  const m = copiar(molde);
  const enemigos = m.equipos?.Enemigos ?? [];
  if (enemigos.length === 0) return m;

  const sinEnemigos = copiar(m);
  sinEnemigos.equipos.Enemigos = [];
  const libres = barajar(casillasLibres(sinEnemigos));
  if (libres.length < enemigos.length) {
    throw new Error('[TabuladorDeMoldes] pocas casillas libres para reubicar enemigos.');
  }
  for (const u of enemigos) {
    const cel = libres.pop();
    u.posicion = { x: cel.x, y: cel.y };
  }
  return m;
}

/**
 * Casillas especiales.
 * - lista: [{ arquetipo, posicion }] reemplaza entradas en esas coords o anade.
 * - { arquetipos: string[], cantidad: n } — n celdas libres al azar con arquetipo aleatorio del array.
 */
export function modificarCasillas(molde, opciones) {
  const m = copiar(molde);
  m.casillasEspeciales = m.casillasEspeciales ?? [];

  if (Array.isArray(opciones)) {
    for (const cel of opciones) {
      const idx = m.casillasEspeciales.findIndex(
        (e) => e.posicion?.x === cel.posicion.x && e.posicion?.y === cel.posicion.y,
      );
      if (idx >= 0) m.casillasEspeciales[idx] = copiar(cel);
      else m.casillasEspeciales.push(copiar(cel));
    }
    return m;
  }

  const { arquetipos, cantidad } = opciones ?? {};
  if (!Array.isArray(arquetipos) || arquetipos.length === 0 || !Number.isFinite(cantidad)) return m;

  const usadas = new Set(m.casillasEspeciales.map((c) => clave(c.posicion.x, c.posicion.y)));
  const libres = barajar(
    celdas(m).filter(({ x, y }) => !usadas.has(clave(x, y)) && !ocupadasPorUnidades(m).has(clave(x, y))),
  );
  const n = Math.min(Math.max(0, Math.floor(cantidad)), libres.length);
  for (let i = 0; i < n; i++) {
    const { x, y } = libres[i];
    m.casillasEspeciales.push({
      arquetipo: arquetipos[entero(0, arquetipos.length - 1)],
      posicion: { x, y },
    });
  }
  return m;
}

/**
 * @param {object} opciones
 * @param {number} [opciones.filas] [opciones.columnas] [opciones.casillaArquetipo] [opciones.tamaño]
 * @param {number} [opciones.nivelEnemigos] [opciones.deltaNivel] [opciones.rangoNivel.min/max]
 * @param {object[]} [opciones.agregarEnemigos]
 * @param {boolean} [opciones.reubicarEnemigos]
 * @param {object} [opciones.casillas] — ver modificarCasillas
 */
export function alterarMolde(molde, opciones = {}) {
  let m = copiar(molde);
  if (opciones.filas || opciones.columnas || opciones.casillaArquetipo || opciones.tamaño != null) {
    m = cambiarTablero(m, opciones);
  }
  if (opciones.agregarEnemigos) m = agregarEnemigos(m, opciones.agregarEnemigos);
  const rango = opciones.rangoNivel;
  if (
    opciones.nivelEnemigos != null
    || opciones.deltaNivel != null
    || (rango && rango.min != null && rango.max != null)
  ) {
    m = ajustarNivelesEnemigos(m, {
      nivel: opciones.nivelEnemigos,
      delta: opciones.deltaNivel,
      min: rango?.min,
      max: rango?.max,
    });
  }
  if (opciones.reubicarEnemigos) m = reubicarEnemigosAlAzar(m);
  if (opciones.casillas) m = modificarCasillas(m, opciones.casillas);
  return m;
}

/** Comprobacion minima (dev); no sustituye revisar el JSON a mano. */
export function validarMolde(molde) {
  const errores = [];
  if (!molde?.configTablero?.filas || !molde?.configTablero?.columnas) errores.push('configTablero incompleto');
  if (!molde?.equipos?.Aliados || !molde?.equipos?.Enemigos) errores.push('equipos Aliados/Enemigos');
  return { valido: errores.length === 0, errores };
}

/** n variantes con las mismas opciones (util para pruebas rapidas). */
export function generarSerie(molde, cantidad, opciones = {}) {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new Error('[TabuladorDeMoldes] generarSerie: cantidad entera positiva.');
  }
  return Array.from({ length: cantidad }, () => alterarMolde(molde, opciones));
}