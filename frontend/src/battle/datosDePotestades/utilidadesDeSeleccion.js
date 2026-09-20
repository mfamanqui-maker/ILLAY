/**
 * utilidadesDeSeleccion.js — Que objetivos son validos para una accion.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE SERA: entra una accion y un estado de tablero, sale una lista de
 * objetivos validos. Si hay escena, pinta el brillo (accionismo, diana, casilla).
 *
 * REGLA 8 DEL CONTRATO: Phaser solo para marcas de seleccion. No importa
 * orbes, panel ni red. El clic se queda en las orbes.
 *
 * Phaser llega como global (app.html), igual que el resto de battle/.
 *
 * Rescatado de: ui/Entidades/Aliados.js lineas 563-667 (borrado).
 */

const COLOR_ESPERA = 0xfff2b0;
const COLOR_ROJO = 0xff6b6b;
const COLOR_CASILLA = 0xffe066;

/** sprite|overlay → { tween, alphaPrevio, tintePrevio, escena, destruir } */
const brillos = new Map();
/** Overlays de casilla creados en una diana de suelo. */
const overlaysCasilla = [];
/** ids de potestades que ya confirmaron accion este turno. */
const gastados = new Set();
/** Etiquetas de Recibir_Config_Acciones bajo enemigos. */
const etiquetasRival = [];

// ─── RESCATE: Aliados.js lineas 563-594. Sirve tal cual. ─────────────────────
// Traduce el `casoDeElección` de una accion a que tipo de seleccion hace falta.
// 'automatico' no pide nada, 'entidad' pide senalar a alguien, 'casilla' pide
// senalar suelo, y 'posterior' es la de tipo 1: no se puede decidir hasta
// saber que hizo el rival.

export function normalizarCasoSeleccion(casoDeEleccion) {
  if (casoDeEleccion == null || casoDeEleccion === false) return { tipo: 'automatico' };

  const valor = String(casoDeEleccion).toLowerCase().replace(/\s+/g, '');
  if (valor === 'directo') return { tipo: 'automatico' };
  if (valor === '0' || valor === 'diana') return { tipo: 'entidad', bandos: ['Aliados', 'Enemigos'] };
  if (valor === 'dianaenemigo') return { tipo: 'entidad', bandos: ['Enemigos'] };
  if (valor === 'dianaaliado') return { tipo: 'entidad', bandos: ['Aliados'] };
  if (valor === '1' || valor.startsWith('configtype1')) {
    const bandos = valor.endsWith('aliado')
      ? ['Aliados']
      : valor.endsWith('enemigo')
        ? ['Enemigos']
        : ['Aliados', 'Enemigos'];
    return { tipo: 'posterior', bandos };
  }
  if (valor.includes('casilla')) return { tipo: 'casilla' };

  return { tipo: 'entidad', bandos: normalizarBandosObjetivo(casoDeEleccion) };
}

export function normalizarBandosObjetivo(casoDeEleccion) {
  if (casoDeEleccion == null || casoDeEleccion === false) return [];
  if (Array.isArray(casoDeEleccion)) {
    return casoDeEleccion.flatMap((caso) => normalizarBandosObjetivo(caso));
  }
  const valor = String(casoDeEleccion).toLowerCase();
  if (valor.includes('ambos') || valor.includes('todos')) return ['Aliados', 'Enemigos'];
  if (valor.includes('aliad')) return ['Aliados'];
  if (valor.includes('enemig')) return ['Enemigos'];
  return [];
}

// ─── RESCATE: Aliados.js lineas 596-615. Sirve tal cual. ─────────────────────
// Chebyshev: la diagonal cuenta como un paso. rango 1 = 3x3, rango 2 = 5x5.
// Infinity (o cualquier no-numero) cubre todo el tablero.

export function obtenerRangoAccion(accion) {
  const crudo = accion?.rango;
  if (crudo === Infinity || crudo === -Infinity) return Infinity;
  if (typeof crudo === 'string' && crudo.trim().toLowerCase() === 'infinity') return Infinity;
  const rango = Number(crudo);
  return Number.isFinite(rango) && rango >= 0 ? rango : Infinity;
}

export function estaDentroDeRango(origen, destino, rango) {
  if (!Number.isFinite(rango)) return true;
  if (!origen || !destino) return false;
  const dx = Math.abs(Number(destino.x) - Number(origen.x));
  const dy = Math.abs(Number(destino.y) - Number(origen.y));
  return Math.max(dx, dy) <= rango;
}

// ─── RESCATE ADAPTADO: Aliados.js lineas 617-643. ────────────────────────────
// El original leia las listas de vivos de la escena `entidad`. Ahora las
// recibe: es lo que lo convierte en funcion pura.

export function candidatosPorBando(potestades, bandos, origen, rango) {
  return (potestades ?? [])
    .filter((entrada) => bandos.includes(entrada.bando))
    .filter((entrada) => Number(entrada.potestad?.estadisticas?.hp) > 0)
    .filter((entrada) => estaDentroDeRango(origen, entrada.potestad?.datos?.posicion, rango));
}

// ─── RESCATE ADAPTADO: Aliados.js lineas 645-666. ────────────────────────────
// El original comprobaba `casilla.casillaPhaser` para saber si la casilla
// existia, o sea preguntaba por un objeto de Phaser dentro de una decision de
// reglas. Aqui se usa `id === 0`, que es el dato que ya marca casilla nula.

export function casillaEstaOcupada(casilla) {
  return Boolean(casilla?.entidad && casilla.entidad !== false);
}

export function candidatosCasilla(tablero, origen, rango, permitirOcupada = false) {
  const candidatos = [];
  (tablero ?? []).forEach((fila, y) => {
    fila.forEach((casilla, x) => {
      if (!casilla || casilla.id === 0) return;
      if (!permitirOcupada && casillaEstaOcupada(casilla)) return;
      const posicion = { x: x + 1, y: y + 1 };
      if (!estaDentroDeRango(origen, posicion, rango)) return;
      candidatos.push({ casilla, ...posicion });
    });
  });
  return candidatos;
}

// ─── Brillo: iniciar / frenar ────────────────────────────────────────────────

export function potestadTieneEspera(potestad) {
  if (!potestad) return false;
  if (potestad.id != null && gastados.has(potestad.id)) return false;
  return Number(potestad.constantes?.accionismo ?? 1) > 0 && Boolean(potestad.sprite?.active);
}

export function iniciarBrillo(objetivo, opciones = {}) {
  const escena = opciones.escena ?? objetivo?.scene;
  if (!objetivo || !escena) return;
  frenarBrillo(objetivo);

  const alphaPrevio = objetivo.alpha;
  const tintePrevio = objetivo.tintTopLeft;
  if (opciones.color === 'rojo' && objetivo.setTint) objetivo.setTint(COLOR_ROJO);
  else if (opciones.color !== 'casilla' && objetivo.setTint) objetivo.setTint(COLOR_ESPERA);

  const tween = escena.tweens.add({
    targets: objetivo,
    alpha: opciones.alphaDestino ?? 0.5,
    duration: opciones.duracion ?? 520,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
  brillos.set(objetivo, {
    tween,
    alphaPrevio,
    tintePrevio,
    escena,
    destruir: opciones.destruir === true,
  });
}

export function frenarBrillo(objetivo) {
  const estado = brillos.get(objetivo);
  if (!estado) return;
  estado.escena?.tweens?.killTweensOf(objetivo);
  brillos.delete(objetivo);
  if (estado.destruir) {
    objetivo.destroy?.();
    return;
  }
  if (objetivo.active === false) return;
  objetivo.setAlpha?.(estado.alphaPrevio ?? 1);
  if (!objetivo.clearTint) return;
  if (estado.tintePrevio != null && estado.tintePrevio !== 0xffffff) {
    objetivo.setTint(estado.tintePrevio);
  } else {
    objetivo.clearTint();
  }
}

export function iniciarBrilloAccionismo(potestad, escena, bando) {
  if (bando !== 'Aliados' || !potestadTieneEspera(potestad)) return;
  iniciarBrillo(potestad.sprite, { escena });
}

export function marcarAccionismoGastado(potestad) {
  if (potestad?.id != null) gastados.add(potestad.id);
  frenarBrillo(potestad?.sprite);
}

/** Sin ids: turno nuevo. Con ids: solo esas vuelven a esperar (ronda tipo 1). */
export function reiniciarAccionismo(ids) {
  if (ids == null) gastados.clear();
  else ids.forEach((id) => gastados.delete(id));
}

export function iniciarBrilloCasilla(casilla, escena) {
  const base = casilla?.casillaPhaser;
  if (!base?.active || !escena) return null;

  const ancho = base.displayWidth || (base.width * (base.scaleX ?? 1)) || 1;
  const alto = base.displayHeight || (base.height * (base.scaleY ?? 1)) || 1;
  const cx = base.x + ancho * (0.5 - (base.originX ?? 0));
  const cy = base.y + alto * (0.5 - (base.originY ?? 0));

  const overlay = escena.add.rectangle(cx, cy, ancho, alto, COLOR_CASILLA);
  overlay.setDepth((base.depth ?? 0) + 1);
  overlay.setAlpha(0.25);
  overlay.setInteractive({ useHandCursor: true });
  const blend = globalThis.Phaser?.BlendModes?.ADD;
  if (blend != null) overlay.setBlendMode(blend);

  iniciarBrillo(overlay, { escena, color: 'casilla', alphaDestino: 0.7, duracion: 620, destruir: true });
  overlaysCasilla.push(overlay);
  return overlay;
}

export function frenarBrillosCasilla() {
  const copia = overlaysCasilla.splice(0, overlaysCasilla.length);
  copia.forEach((overlay) => frenarBrillo(overlay));
}

export function restaurarBrillosAccionismo(contexto) {
  const escena = contexto?.escena;
  if (!escena) return;
  (contexto.potestades ?? []).forEach(({ bando, potestad }) => {
    iniciarBrilloAccionismo(potestad, escena, bando);
  });
}

export function pausarBrillosExcepto(origenSprite, contexto) {
  (contexto?.potestades ?? []).forEach(({ potestad }) => {
    const sprite = potestad?.sprite;
    if (!sprite || sprite === origenSprite) return;
    frenarBrillo(sprite);
  });
}

export function limpiarMarcasSeleccion(contexto, { restaurar = true } = {}) {
  quitarEtiquetasConfigRival();
  frenarBrillosCasilla();
  [...brillos.keys()].forEach((objetivo) => frenarBrillo(objetivo));
  if (restaurar) restaurarBrillosAccionismo(contexto);
}

export function aplicarMarcasSeleccion(resultado, contexto) {
  if (!contexto?.escena || !resultado) return resultado;
  if (resultado.esperaRival || resultado.tipo === 'automatico') return resultado;
  if (!resultado.candidatos?.length) return resultado;

  const lanzador = contexto.origenPotestad?.sprite;
  pausarBrillosExcepto(lanzador, contexto);
  if (lanzador?.active) iniciarBrillo(lanzador, { escena: contexto.escena });

  if (resultado.tipo === 'casilla') {
    frenarBrillosCasilla();
    resultado.candidatos.forEach((candidato) => {
      candidato.marca = iniciarBrilloCasilla(candidato.casilla, contexto.escena);
    });
    return resultado;
  }

  resultado.candidatos.forEach((entrada) => {
    const sprite = entrada.potestad?.sprite;
    if (!sprite?.active || sprite === lanzador) return;
    iniciarBrillo(sprite, { escena: contexto.escena, color: 'rojo' });
  });
  if (resultado.etiquetasRival) {
    mostrarEtiquetasConfigRival(contexto.configuracionRival, contexto);
  }
  return resultado;
}

// ─── Etiquetas de Recibir_Config_Acciones ────────────────────────────────────

function filasDeConfigRival(configuracionRival) {
  if (Array.isArray(configuracionRival)) return configuracionRival;
  if (Array.isArray(configuracionRival?.configuracion)) return configuracionRival.configuracion;
  return [];
}

function entradaPorId(potestades, id) {
  return (potestades ?? []).find((entrada) => (
    entrada.potestad?.id === id || entrada.potestad?.datos?.id === id
  )) ?? null;
}

function buscarAccionPotestad(potestad, nombre) {
  return Object.values(potestad?.listaDeAcciones ?? {})
    .flat()
    .find((accion) => accion?.nombre === nombre) ?? null;
}

function esTypeDiana(type) {
  const valor = String(type ?? '').toLowerCase().replace(/\s+/g, '');
  return valor.startsWith('diana') || valor.includes('casilla') || valor === '0';
}

function textoObjetivo(objetivo, potestades) {
  if (objetivo == null) return '';
  if (typeof objetivo === 'object' && Number.isFinite(Number(objetivo.x))) {
    return `${Number(objetivo.x)},${Number(objetivo.y)}`;
  }
  const entrada = entradaPorId(potestades, objetivo);
  return entrada?.potestad?.arquetipo ?? String(objetivo);
}

function textoEtiquetaRival(fila, potestad, potestades) {
  const nombre = fila.nombreDeAccion ?? fila.nombre ?? '';
  const accion = buscarAccionPotestad(potestad, nombre);
  if (!esTypeDiana(accion?.type ?? accion?.tipo) || fila.objetivo == null) return nombre;
  return `${nombre}: ${textoObjetivo(fila.objetivo, potestades)}`;
}

export function quitarEtiquetasConfigRival() {
  etiquetasRival.splice(0, etiquetasRival.length).forEach((nodo) => nodo.destroy?.());
}

export function mostrarEtiquetasConfigRival(configuracionRival, contexto) {
  const escena = contexto?.escena;
  if (!escena) return;
  quitarEtiquetasConfigRival();

  filasDeConfigRival(configuracionRival).forEach((fila) => {
    const entrada = entradaPorId(contexto.potestades, fila.id);
    if (entrada?.bando !== 'Enemigos') return;
    const sprite = entrada.potestad?.sprite;
    if (!sprite?.active) return;

    const texto = textoEtiquetaRival(fila, entrada.potestad, contexto.potestades);
    if (!texto) return;

    const etiqueta = escena.add.text(
      sprite.x,
      sprite.y + (sprite.displayHeight ?? sprite.height ?? 0) * 0.5 + 8,
      texto,
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 },
        align: 'center',
      },
    );
    etiqueta.setOrigin(0.5, 0);
    etiqueta.setDepth((sprite.depth ?? 0) + 5);
    etiquetasRival.push(etiqueta);
  });
}

// ─── Una funcion por type de accion, menos directo ───────────────────────────

function resultadoEntidad(bandos, contexto, accion) {
  const rango = obtenerRangoAccion(accion);
  const resultado = {
    tipo: 'entidad',
    bandos,
    candidatos: candidatosPorBando(contexto?.potestades, bandos, contexto?.origen, rango),
    esperaRival: false,
  };
  return aplicarMarcasSeleccion(resultado, contexto);
}

function resultadoPosterior(bandos, contexto, accion) {
  if (contexto?.configuracionRival == null) {
    return { tipo: 'posterior', bandos, candidatos: [], esperaRival: true };
  }
  const resultado = {
    ...resultadoEntidad(bandos, contexto, accion),
    tipo: 'entidad',
    esperaRival: false,
    etiquetasRival: true,
  };
  mostrarEtiquetasConfigRival(contexto.configuracionRival, contexto);
  return resultado;
}

export function seleccionarDiana(accion, contexto) {
  return resultadoEntidad(['Aliados', 'Enemigos'], contexto, accion);
}

export function seleccionarDianaEnemigo(accion, contexto) {
  return resultadoEntidad(['Enemigos'], contexto, accion);
}

export function seleccionarDianaAliado(accion, contexto) {
  return resultadoEntidad(['Aliados'], contexto, accion);
}

export function seleccionarConfigType1(accion, contexto) {
  return resultadoPosterior(['Aliados', 'Enemigos'], contexto, accion);
}

export function seleccionarConfigType1Aliado(accion, contexto) {
  return resultadoPosterior(['Aliados'], contexto, accion);
}

export function seleccionarConfigType1Enemigo(accion, contexto) {
  return resultadoPosterior(['Enemigos'], contexto, accion);
}

export function seleccionarCasilla(accion, contexto) {
  const rango = obtenerRangoAccion(accion);
  const resultado = {
    tipo: 'casilla',
    bandos: [],
    candidatos: candidatosCasilla(
      contexto?.tablero,
      contexto?.origen,
      rango,
      accion?.permiteCasillaOcupada === true,
    ),
    esperaRival: false,
  };
  return aplicarMarcasSeleccion(resultado, contexto);
}

const POR_TIPO = {
  diana: seleccionarDiana,
  dianaenemigo: seleccionarDianaEnemigo,
  dianaaliado: seleccionarDianaAliado,
  casilla: seleccionarCasilla,
  dianacasilla: seleccionarCasilla,
  configtype1: seleccionarConfigType1,
  configtype1aliado: seleccionarConfigType1Aliado,
  configtype1enemigo: seleccionarConfigType1Enemigo,
};

/** Puerta: lee accion.type y delega. directo y lo desconocido no piden nada. */
export function seleccionarObjetivos(accion, contexto) {
  const clave = String(accion?.type ?? accion?.tipo ?? '').toLowerCase().replace(/\s+/g, '');
  const fn = POR_TIPO[clave];
  if (!fn) return { tipo: 'automatico', bandos: [], candidatos: [], esperaRival: false };
  return fn(accion, contexto);
}
