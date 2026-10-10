/**
 * UtilsTablero.js — Atajos para moverse por el array bidimensional.
 *
 * SPECT: docs/spects/spect003.md
 *
 * QUE SERA: el unico modulo que sabe como esta indexado el tablero por dentro.
 * Todo lo demas le pregunta a el.
 *
 * REGLA 4 DEL CONTRATO: el tablero es base 1 hacia afuera (igual que
 * `posicion: {x, y}` en los moldes) y base 0 por dentro. Nadie fuera de este
 * archivo escribe `array[y - 1][x - 1]`. El bug de calcularArea y calcularRayo
 * del codigo viejo nacio exactamente de romper esta regla.
 *
 * Estas funciones son de datos. Nada de dibujar: mover el sprite a la casilla
 * es trabajo de PotestadesTablero.
 *
 * Rescatado de: classes/battle/tablero.js (borrado).
 */

// ─── RESCATE: tablero.js lineas 49-63. Sirve tal cual. ───────────────────────
// Los ids llegan como numero o como texto segun vengan del JSON o de la red,
// asi que se normalizan antes de comparar.

export function normalizarId(id) {
  if (id == null || id === '') return null;
  const numero = Number(id);
  return Number.isNaN(numero) ? String(id) : numero;
}

export function obtenerIdEntidad(entidad) {
  if (!entidad || entidad === false) return null;
  return normalizarId(
    entidad?.data?.id ??
    entidad?.datos?.id ??
    entidad?.id ??
    entidad,
  );
}

// ─── RESCATE: tablero.js lineas 35-47. Sirve tal cual. ───────────────────────
// Devuelve coordenadas base 1, que es lo que espera el resto del sistema.

export function buscarPorId(id, tablero) {
  for (let y = 0; y < tablero.length; y++) {
    for (let x = 0; x < tablero[y].length; x++) {
      if (obtenerIdEntidad(tablero[y][x].entidad) === normalizarId(id)) {
        return { x: x + 1, y: y + 1 };
      }
    }
  }
  return null;
}

// ─── RESCATE: tablero.js lineas 114-121. Sirve tal cual. ─────────────────────

export function calcularDistancia(idInicio, idDestino, tablero) {
  const inicio = buscarPorId(idInicio, tablero);
  const destino = buscarPorId(idDestino, tablero);
  if (!inicio || !destino) return null;
  return Math.hypot(inicio.x - destino.x, inicio.y - destino.y);
}

// ─── RESCATE PARCIAL: tablero.js lineas 80-112. ──────────────────────────────
// Del moverEntidad viejo solo sobrevive la mitad de datos. La otra mitad
// llamaba a ubicarEnCasillaAsync y buscaba la escena por su cuenta: eso ahora
// es de PotestadesTablero. Aqui se mueve el dato y se devuelve si se pudo.

export function moverEnTablero(entidad, destino, tablero) {
  if (!entidad || !destino || !tablero) return false;

  const origen = buscarPorId(obtenerIdEntidad(entidad), tablero);
  if (!origen) return false;

  const casillaOrigen = tablero[origen.y - 1]?.[origen.x - 1];
  const casillaDestino = tablero[destino.y - 1]?.[destino.x - 1];
  if (!casillaOrigen || !casillaDestino || casillaDestino.id === 0) return false;

  const movida = casillaOrigen.entidad || entidad;
  const ocupante = casillaDestino.entidad && casillaDestino.entidad !== false
    ? casillaDestino.entidad
    : null;
  if (ocupante && obtenerIdEntidad(ocupante) === obtenerIdEntidad(entidad)) {
    return true;
  }
  // Destino ocupado por otra entidad: no intercambiar. La colision de
  // movimientos concurrentes se resuelve antes en resolverColisionesDeMovimiento.
  if (ocupante) return false;

  casillaOrigen.entidad = false;
  casillaDestino.entidad = movida;
  return true;
}

function claveCasilla(x, y) {
  return `${Number(x)},${Number(y)}`;
}

function esMovilidadNombre(nombre) {
  const n = String(nombre ?? '').trim().toLowerCase();
  return n === 'moverse' || n === 'movilidad rapida' || n === 'movilidad lenta';
}

/**
 * Casilla libre mas cercana al destino pretendido (finalidad).
 * Desempate: mas cercana al origen. No elige celdas en `prohibidas`.
 * `idsQueSalen`: entidades que liberan su casilla al moverse este grupo.
 */
export function casillaLibreMasCercanaAlDestino(
  destino,
  origen,
  tablero,
  prohibidas = new Set(),
  idsQueSalen = null,
) {
  if (!destino || !tablero) return null;
  const sale = (entidad) => {
    if (!idsQueSalen || !entidad || entidad === false) return false;
    return idsQueSalen.has(String(obtenerIdEntidad(entidad)));
  };

  let mejor = null;
  let mejorScore = Infinity;

  for (let y = 0; y < tablero.length; y++) {
    for (let x = 0; x < (tablero[y]?.length ?? 0); x++) {
      const casilla = tablero[y][x];
      if (!casilla || casilla.id === 0) continue;
      const px = x + 1;
      const py = y + 1;
      const clave = claveCasilla(px, py);
      if (prohibidas.has(clave)) continue;
      if (casillaEstaOcupadaLocal(casilla) && !sale(casilla.entidad)) continue;

      const dDest = Math.max(
        Math.abs(px - Number(destino.x)),
        Math.abs(py - Number(destino.y)),
      );
      const dOrig = origen
        ? Math.max(
          Math.abs(px - Number(origen.x)),
          Math.abs(py - Number(origen.y)),
        )
        : 0;
      const score = dDest * 1000 + dOrig;
      if (score < mejorScore) {
        mejorScore = score;
        mejor = { x: px, y: py };
      }
    }
  }
  return mejor;
}

function casillaEstaOcupadaLocal(casilla) {
  return Boolean(casilla?.entidad && casilla.entidad !== false);
}

function compararIdEstable(a, b) {
  return String(obtenerIdEntidad(a) ?? '').localeCompare(
    String(obtenerIdEntidad(b) ?? ''),
    'en',
    { numeric: true },
  );
}

function esTareaMovilidad(tarea) {
  if (tarea?.anulada) return false;
  const nombre = tarea?.accion?.nombre ?? tarea?.nombreDeAccion;
  const o = tarea?.objetivo;
  return esMovilidadNombre(nombre)
    && o
    && Number.isFinite(Number(o.x))
    && Number.isFinite(Number(o.y));
}

/**
 * Varias entidades al mismo destino: ninguna lo conserva.
 * Cada una va a la casilla libre mas cercana al destino pretendido
 * (desempate: cercania al origen). El destino disputado queda prohibido.
 * Orden de reasignacion por id estable (mismo resultado en ambos clientes).
 */
export function resolverColisionesDeMovimiento(tareas, tablero) {
  const movers = (tareas ?? []).filter(esTareaMovilidad);
  if (movers.length < 2) return;

  const porDest = new Map();
  movers.forEach((tarea) => {
    const k = claveCasilla(tarea.objetivo.x, tarea.objetivo.y);
    if (!porDest.has(k)) porDest.set(k, []);
    porDest.get(k).push(tarea);
  });

  const idsQueSalen = new Set(
    movers.map((t) => String(obtenerIdEntidad(t.potestad))).filter((id) => id != null && id !== 'null'),
  );
  const reservadas = new Set();
  const destinosOrdenados = [...porDest.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'));

  destinosOrdenados.forEach(([kDest, lista]) => {
    if (lista.length === 1) reservadas.add(kDest);
  });

  destinosOrdenados.forEach(([, lista]) => {
    if (lista.length < 2) return;
    const pretendido = {
      x: Number(lista[0].objetivo.x),
      y: Number(lista[0].objetivo.y),
    };
    reservadas.add(claveCasilla(pretendido.x, pretendido.y));
    const ordenadas = [...lista].sort((a, b) => compararIdEstable(a.potestad, b.potestad));
    ordenadas.forEach((tarea) => {
      if (tarea.azar?.rebote && Number.isFinite(Number(tarea.azar.rebote.x))) {
        tarea.destinoPretendido = tarea.azar.pretendido
          ? { x: Number(tarea.azar.pretendido.x), y: Number(tarea.azar.pretendido.y) }
          : { ...pretendido };
        tarea.colisionMovimiento = true;
        tarea.objetivo = {
          x: Number(tarea.azar.rebote.x),
          y: Number(tarea.azar.rebote.y),
        };
        reservadas.add(claveCasilla(tarea.objetivo.x, tarea.objetivo.y));
        return;
      }
      const origen = tarea.potestad?.datos?.posicion
        ? {
          x: Number(tarea.potestad.datos.posicion.x),
          y: Number(tarea.potestad.datos.posicion.y),
        }
        : { ...pretendido };
      tarea.destinoPretendido = { ...pretendido };
      tarea.colisionMovimiento = true;
      const alt = casillaLibreMasCercanaAlDestino(
        pretendido,
        origen,
        tablero,
        reservadas,
        idsQueSalen,
      );
      if (alt) {
        tarea.objetivo = { x: alt.x, y: alt.y };
        tarea.azar = {
          ...(tarea.azar && typeof tarea.azar === 'object' ? tarea.azar : {}),
          rebote: { x: alt.x, y: alt.y },
          pretendido: { ...pretendido },
        };
        reservadas.add(claveCasilla(alt.x, alt.y));
      } else {
        tarea.objetivo = { x: Number(origen.x), y: Number(origen.y) };
      }
    });
  });
}

/**
 * Asegura que cada potestad aparezca solo en la casilla de `datos.posicion`.
 * Limpia fantasmas que dejan movimientos fallidos o desfase entre clientes.
 */
export function reconciliarPosicionesEnTablero(potestades, tablero) {
  if (!tablero) return;

  for (let y = 0; y < tablero.length; y++) {
    for (let x = 0; x < (tablero[y]?.length ?? 0); x++) {
      const casilla = tablero[y][x];
      if (casilla && casilla.entidad) casilla.entidad = false;
    }
  }

  (potestades ?? []).forEach((potestad) => {
    if (!potestad) return;
    const pos = potestad.datos?.posicion;
    if (!pos) return;
    const casilla = casillaEn(tablero, Number(pos.x), Number(pos.y));
    if (!casilla || casilla.id === 0) return;
    casilla.entidad = potestad;
  });
}

/**
 * Aplica todos los movimientos del grupo a la vez: levanta a los movers,
 * luego los coloca en sus destinos (ya post-colision). Asi no hay fallos
 * por ocupar el origen de otro que aun no se ha movido.
 * Si pisan trampa, aplica el dano y marca `tarea.trampaPisada`.
 */
export function aplicarMovimientosSimultaneos(tareas, tablero) {
  const movers = (tareas ?? []).filter(esTareaMovilidad);
  if (movers.length === 0 || !tablero) return [];

  const planes = movers.map((tarea) => {
    const entidad = tarea.potestad;
    const id = obtenerIdEntidad(entidad);
    const enTablero = id != null ? buscarPorId(id, tablero) : null;
    const origen = enTablero ?? (
      entidad?.datos?.posicion
        ? { x: Number(entidad.datos.posicion.x), y: Number(entidad.datos.posicion.y) }
        : null
    );
    return {
      tarea,
      entidad,
      origen,
      destino: { x: Number(tarea.objetivo.x), y: Number(tarea.objetivo.y) },
    };
  }).filter((p) => p.entidad && p.origen);

  const idsMovers = new Set(
    planes.map((p) => String(obtenerIdEntidad(p.entidad))),
  );

  planes.forEach((p) => {
    const casilla = casillaEn(tablero, p.origen.x, p.origen.y);
    if (!casilla) return;
    if (obtenerIdEntidad(casilla.entidad) === obtenerIdEntidad(p.entidad)) {
      casilla.entidad = false;
    }
  });

  const ocupadas = new Set();
  for (let y = 0; y < tablero.length; y++) {
    for (let x = 0; x < (tablero[y]?.length ?? 0); x++) {
      const casilla = tablero[y][x];
      const id = obtenerIdEntidad(casilla?.entidad);
      if (id == null) continue;
      if (idsMovers.has(String(id))) continue;
      ocupadas.add(claveCasilla(x + 1, y + 1));
    }
  }

  planes.sort((a, b) => compararIdEstable(a.entidad, b.entidad));

  planes.forEach((p) => {
    const azar = p.tarea?.azar;
    // Rebote ya decidido al elegir (compartido en la config): no recalcular.
    if (azar?.rebote && Number.isFinite(Number(azar.rebote.x))) {
      p.tarea.destinoPretendido = azar.pretendido
        ? { x: Number(azar.pretendido.x), y: Number(azar.pretendido.y) }
        : { x: Number(p.destino.x), y: Number(p.destino.y) };
      p.tarea.colisionMovimiento = true;
      p.destino = { x: Number(azar.rebote.x), y: Number(azar.rebote.y) };
    }

    let dest = p.destino;
    let clave = claveCasilla(dest.x, dest.y);
    const casillaDest = casillaEn(tablero, dest.x, dest.y);
    const destInvalido = !casillaDest
      || casillaDest.id === 0
      || ocupadas.has(clave)
      || casillaEstaOcupadaLocal(casillaDest);

    if (destInvalido && !(azar?.rebote)) {
      const pretendido = { x: Number(dest.x), y: Number(dest.y) };
      const alt = casillaLibreMasCercanaAlDestino(
        dest,
        p.origen,
        tablero,
        ocupadas,
        null,
      );
      dest = alt ?? { x: Number(p.origen.x), y: Number(p.origen.y) };
      clave = claveCasilla(dest.x, dest.y);
      p.tarea.destinoPretendido = pretendido;
      p.tarea.colisionMovimiento = true;
    }

    const casilla = casillaEn(tablero, dest.x, dest.y);
    if (!casilla) return;

    casilla.entidad = p.entidad;
    p.entidad.datos = p.entidad.datos ?? {};
    p.entidad.datos.posicion = { x: dest.x, y: dest.y };
    p.tarea.objetivo = { x: dest.x, y: dest.y };
    p.tarea._movimientoAplicado = true;
    p.destino = dest;
    ocupadas.add(clave);

    if (casilla.trampa && p.entidad.estadisticas) {
      const dano = Number(casilla.trampa.dano ?? 3);
      p.entidad.estadisticas.hp = Number(p.entidad.estadisticas.hp ?? 0) - dano;
      p.tarea.trampaPisada = { x: dest.x, y: dest.y };
      casilla.trampa?.marca?.destroy?.();
      casilla.trampa = null;
    }
  });

  return planes;
}

// Solo este archivo baja a base 0. El resto del sistema pregunta en base 1.
function casillaEn(tablero, x, y) {
  if (!tablero || x < 1 || y < 1) return null;
  return tablero[y - 1]?.[x - 1] ?? null;
}

function existeCasilla(tablero, x, y) {
  const casilla = casillaEn(tablero, x, y);
  return Boolean(casilla && casilla.id !== 0);
}

/**
 * Casillas existentes a distancia Chebyshev <= radio, incluida el centro.
 * Radio 1 en el borde no produce negativas ni se sale del array.
 */
export function calcularArea(centro, radio, tablero) {
  if (!centro || !tablero || !Number.isFinite(radio) || radio < 0) return [];

  const area = [];
  const minX = centro.x - radio;
  const maxX = centro.x + radio;
  const minY = centro.y - radio;
  const maxY = centro.y + radio;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!existeCasilla(tablero, x, y)) continue;
      if (Math.max(Math.abs(x - centro.x), Math.abs(y - centro.y)) > radio) continue;
      area.push({ x, y });
    }
  }
  return area;
}

/**
 * Avance en `{x, y}` con pasos -1|0|1. Se detiene en hueco o borde.
 * La diagonal deja de devolver vacio: ya no se multiplica un objeto por un numero.
 */
export function calcularRayo(origen, direccion, alcance, tablero) {
  if (!origen || !direccion || !tablero) return [];

  const dx = Math.sign(Number(direccion.x) || 0);
  const dy = Math.sign(Number(direccion.y) || 0);
  if (dx === 0 && dy === 0) return [];

  const hastaBorde = !Number.isFinite(alcance) || alcance < 0;
  const maximo = hastaBorde ? 64 : alcance;
  const rayo = [];
  for (let paso = 1; paso <= maximo; paso++) {
    const x = origen.x + dx * paso;
    const y = origen.y + dy * paso;
    if (!existeCasilla(tablero, x, y)) break;
    rayo.push({ x, y });
  }
  return rayo;
}

/** Direccion = signo(destino - origen). Avanza hasta el borde del tablero. */
export function calcularRayoHastaBorde(origen, destino, tablero) {
  if (!origen || !destino || !tablero) return [];
  return calcularRayo(
    origen,
    {
      x: Number(destino.x) - Number(origen.x),
      y: Number(destino.y) - Number(origen.y),
    },
    Infinity,
    tablero,
  );
}

/** Quienes estan en la linea del rayo (excepto el lanzador). */
export function afectadosPorRayo(origen, destinoCasilla, tablero, idLanzador = null) {
  if (!origen || !destinoCasilla || !tablero) return [];
  const celdas = calcularRayoHastaBorde(origen, destinoCasilla, tablero);
  const vistos = new Set();
  const skip = idLanzador != null ? String(idLanzador) : null;
  const out = [];
  celdas.forEach((celda, indiceRayo) => {
    const entidad = tablero[Number(celda.y) - 1]?.[Number(celda.x) - 1]?.entidad;
    if (!entidad?.estadisticas || entidad.id == null) return;
    const clave = String(entidad.id);
    if (vistos.has(clave) || clave === skip) return;
    vistos.add(clave);
    out.push({ id: entidad.id, indiceRayo, celda });
  });
  return out;
}

/** Aliados alcanzados por el rayo (ids + celda + orden en la línea). */
export function objetivosRayoDeMagia(origen, destinoCasilla, tablero, registro) {
  return afectadosPorRayo(origen, destinoCasilla, tablero)
    .filter((a) => registro?.obtenerPorId?.(a.id)?.bando === 'Aliados')
    .map((a) => ({ idObjetivo: a.id, indiceRayo: a.indiceRayo, celda: a.celda }));
}
