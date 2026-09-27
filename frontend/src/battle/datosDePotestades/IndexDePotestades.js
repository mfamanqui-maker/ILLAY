/**
 * IndexDePotestades.js — Registro de potestades.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE ES EN ESTA PARTE: lo que PhaserMaster pide para montar y pintar.
 *   1. Descriptores de spritesheet a partir de los equipos, sin instanciar.
 *   2. El registro de la partida: por id, por bando y completo.
 *   3. Cada potestad del registro ya sabe devolver su config de animacion
 *      estatica y sus definiciones para el AnimationManager.
 *
 * Entrega registro, adaptadores de panel/orbes, catalogo de acciones y
 * adaptarParaGuion / adaptarParaShow. No importa panel, orbes ni guion.
 *
 * REGLA 9 DEL CONTRATO: este archivo no importa panelEntidad, sistemaDeOrbes
 * ni guionSincrono. Expone los datos con la forma que piden; no los conoce.
 *
 * EL BANDO ES UN DATO, NO UNA CLASE. EL ARQUETIPO ES LA FAMILIA.
 * characterSelectScene.js manda 'Campesino', 'Mago', 'Realista',
 * 'Intelectual' y 'Sectario'. en cada familia solo hay clases con extenciones de phaser que generan animaciones
 */

import { POTESTADES_CAMPESINO } from './potestades/campesinos.js';
import { POTESTADES_REALISTA } from './potestades/realista.js';
import { POTESTADES_MAGO } from './potestades/mago.js';
import { POTESTADES_INTELECTUAL } from './potestades/intelectual.js';
import { POTESTADES_SECTARIO } from './potestades/sectario.js';
import { claveDeAccion, resolverAccion } from './acciones/catalogo.js';

export {
  ARCHIVOS_DE_ACCIONES,
  CATALOGO_DE_ACCIONES,
  claveDeAccion,
  resolverAccion,
} from './acciones/catalogo.js';

const TODAS_LAS_FAMILIAS = [
  ...POTESTADES_CAMPESINO,
  ...POTESTADES_REALISTA,
  ...POTESTADES_MAGO,
  ...POTESTADES_INTELECTUAL,
  ...POTESTADES_SECTARIO,
];

export const REGISTRO_POR_ARQUETIPO = Object.fromEntries(
  TODAS_LAS_FAMILIAS.map((Clase) => [String(Clase.arquetipo).toLowerCase(), Clase]),
);

// Molde001 sigue hablando de lumel/brunn/soldado1. El arquetipo es la familia;
// estos alias evitan tocar el molde (spect 009) y dejan arrancar vista.js.
const ALIAS_DE_ARQUETIPO = {
  lumel: 'campesino',
  brunn: 'campesino',
  soldado1: 'realista',
};

export function resolverClase(datos) {
  const crudo = String(datos?.arquetipo ?? '').trim().toLowerCase();
  const clave = ALIAS_DE_ARQUETIPO[crudo] ?? crudo;
  const Clase = REGISTRO_POR_ARQUETIPO[clave];
  if (!Clase) {
    throw new Error(
      `[IndexDePotestades] Arquetipo desconocido: "${datos?.arquetipo}". ` +
      `Registralo exportandolo en la lista de su familia (clave: ${clave || '(vacio)'}).`,
    );
  }
  return Clase;
}

/**
 * Peticion 1 de PhaserMaster.preload: que texturas hay que cargar.
 * Lee `Clase.spritesheet` sin hacer `new`. Los que se fabrican en memoria
 * traen `archivo: null` y quien precarga los salta.
 */
export function descriptoresDeSpritesheet(equipos) {
  const vistos = new Set();
  const descriptores = [];

  ['Aliados', 'Enemigos'].forEach((bando) => {
    (equipos?.[bando] ?? []).forEach((fila) => {
      const clave = String(fila?.arquetipo ?? '').trim().toLowerCase();
      if (!clave || vistos.has(clave)) return;
      vistos.add(clave);
      const Clase = resolverClase(fila);
      descriptores.push({ ...Clase.spritesheet });
    });
  });

  return descriptores;
}

const BANDOS = ['Aliados', 'Enemigos'];

function exigirIdUnico(fila, bando, indice, vistos) {
  const id = fila?.id;
  if (id == null) {
    throw new Error(
      `[IndexDePotestades] equipos.${bando}[${indice}] no trae id. Los ids los ` +
      'asigna quien monta la partida, no el cliente: si cada cliente se los ' +
      'inventase, los dos numerarian distinto y las configuraciones no casarian.',
    );
  }
  if (vistos.has(id)) {
    throw new Error(
      `[IndexDePotestades] id ${id} repetido en equipos.${bando}[${indice}]. ` +
      'Los ids son unicos entre los dos bandos, no por bando.',
    );
  }
  vistos.add(id);
}

/**
 * Peticion 2 de PhaserMaster.create. Solo instancia datos y el mapa de
 * animaciones. No fabrica texturas ni coloca sprites: eso es del tablero.
 */
export function crearRegistro(equipos, escena = null) {
  const porId = new Map();
  const vistos = new Set();

  BANDOS.forEach((bando) => {
    (equipos?.[bando] ?? []).forEach((fila, indice) => {
      exigirIdUnico(fila, bando, indice, vistos);
      const Clase = resolverClase(fila);
      const potestad = new Clase(fila, bando);
      potestad.prepararAnimaciones(escena);
      // La barra se llena contra el HP de salida, no contra hpMax.
      if (potestad.hpInicial == null) potestad.hpInicial = potestad.estadisticas?.hp ?? 0;
      porId.set(fila.id, { bando, potestad });
    });
  });

  return {
    porId,
    obtenerPorId: (id) => {
      if (id == null || id === '') return undefined;
      return porId.get(id)
        ?? porId.get(Number(id))
        ?? porId.get(String(id));
    },
    todos: () => [...porId.values()],
    porBando: (bando) => [...porId.values()].filter((e) => e.bando === bando),
  };
}

function copiarAccion(accion) {
  if (!accion) return null;
  return {
    nombre: accion.nombre,
    rango: accion.rango,
    velocidad: accion.velocidad,
    condicional: accion.condicional,
    frame: accion.frame ?? null,
    type: accion.type ?? accion.tipo ?? null,
    casoDeEleccion: accion.casoDeEleccion ?? accion.casoDeElección ?? null,
    permiteCasillaOcupada: accion.permiteCasillaOcupada === true,
    coste: accion.coste && typeof accion.coste === 'object' ? { ...accion.coste } : null,
  };
}

const TINTES = {
  estadisticas: 0xf5d68a,
  efectos: 0xc084fc,
  movimiento: 0x8be66f,
  habilidades: 0x7ed4ff,
  objetos: 0xf5d36a,
};

function esEscalarDeFicha(nombre, valor) {
  if (nombre === 'apuntando') return false;
  return typeof valor === 'number' || typeof valor === 'boolean';
}

function hpVisible(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function filasDeMapa(mapa, tinte) {
  return Object.entries(mapa ?? {})
    .filter(([nombre, cantidad]) => esEscalarDeFicha(nombre, cantidad))
    .map(([nombre, cantidad]) => ({ nombre, cantidad, tinte }));
}

function cantidadVisible(valor) {
  if (valor && typeof valor === 'object') return cantidadVisible(valor.cantidad);
  if (valor === true || valor === false || valor == null || valor === '') return '';
  return valor;
}

function extraIcono(valor) {
  if (!valor || typeof valor !== 'object') return {};
  const extra = {};
  if (valor.frame != null) extra.frame = valor.frame;
  if (valor.hoja != null) extra.hoja = valor.hoja;
  return extra;
}

function efectoSeMuestra(valor) {
  return valor !== false && valor != null;
}

/** Array `['cristianismo']` u objeto `{ cristianismo: { frame, hoja } }`. */
function filasDeEfectos(efectos, tinte) {
  if (Array.isArray(efectos)) {
    return efectos.filter(Boolean).map((entrada) => {
      if (typeof entrada === 'string') return { nombre: entrada, cantidad: '', tinte };
      return {
        nombre: entrada.nombre,
        cantidad: cantidadVisible(entrada.cantidad),
        tinte,
        ...extraIcono(entrada),
      };
    });
  }
  return Object.entries(efectos ?? {})
    .filter(([, valor]) => efectoSeMuestra(valor))
    .map(([nombre, valor]) => ({
      nombre,
      cantidad: cantidadVisible(valor),
      tinte,
      ...extraIcono(valor),
    }));
}

function copiarEfectos(efectos) {
  if (Array.isArray(efectos)) return [...efectos];
  return { ...(efectos ?? {}) };
}

function idsPorBando(registro) {
  return {
    Aliados: (registro?.porBando?.('Aliados') ?? []).map(({ potestad }) => ({ id: potestad.id })),
    Enemigos: (registro?.porBando?.('Enemigos') ?? []).map(({ potestad }) => ({ id: potestad.id })),
  };
}

/**
 * Forma que espera abrirPanelEntidad. No importa el panel (regla 9).
 * Acciones llevan `frame` de la hoja; efectos, `frame` + `hoja` (1 o 2).
 * Sin frame, el panel usa la vela tintada.
 */
export function adaptarParaPanel(potestad, bando, registro) {
  const datos = datosDeEntidad(potestad);
  if (!datos) return null;
  const stats = datos.estadisticas ?? {};
  const constantes = datos.constantes ?? {};
  const filaAccion = (accion, tinte) => ({
    nombre: accion.nombre,
    frame: accion.frame,
    tinte: accion.frame == null ? tinte : undefined,
  });
  return {
    nombre: datos.arquetipo ?? '',
    bando: bando ?? datos.bando ?? 'Aliados',
    idActual: datos.id,
    idInicial: datos.id,
    vida: {
      vidaActual: hpVisible(stats.hp),
      vidaMaxima: Math.max(1, hpVisible(datos.hpInicial ?? potestad.hpInicial ?? stats.hp)),
    },
    estadisticas: [...filasDeMapa(stats, TINTES.estadisticas), ...filasDeMapa(constantes, TINTES.estadisticas)],
    efectos: filasDeEfectos(datos.efectos, TINTES.efectos),
    acciones: (datos.listaDeAcciones.habilidades ?? []).map((accion) => filaAccion(accion)),
    objetos: (datos.listaDeAcciones.objetos ?? []).map((accion) => filaAccion(accion, TINTES.objetos)),
    movimiento: (datos.listaDeAcciones.movimiento ?? []).map((accion) => filaAccion(accion, TINTES.movimiento)),
    equipos: idsPorBando(registro),
  };
}

function copiarCadena(acciones) {
  return (acciones ?? []).map((accion) => ({
    nombre: accion.nombre,
    rango: accion.rango,
    velocidad: accion.velocidad,
    condicional: accion.condicional,
    frame: accion.frame ?? null,
    type: accion.type ?? accion.tipo ?? null,
    permiteCasillaOcupada: accion.permiteCasillaOcupada === true,
    coste: accion.coste && typeof accion.coste === 'object' ? { ...accion.coste } : null,
  }));
}

/** Tres cadenas navegables. Copia desde la lista viva, no desde datosDeEntidad. */
export function adaptarParaOrbes(potestad) {
  const origen = potestad?.listaDeAcciones;
  const vacia = { habilidades: [], objetos: [], movimiento: [] };
  if (!origen) return vacia;
  return {
    habilidades: copiarCadena(origen.habilidades),
    objetos: copiarCadena(origen.objetos),
    movimiento: copiarCadena(origen.movimiento),
  };
}

/**
 * Vista consultable de la potestad: numeros y nombres, sin sprite ni closures.
 * `casilla.entidad` sigue siendo la potestad; esto es lo que se puede loguear.
 */
export function datosDeEntidad(potestad) {
  if (!potestad || potestad === false) return null;
  const acciones = potestad.listaDeAcciones ?? {};
  return {
    id: potestad.id ?? potestad.datos?.id ?? null,
    arquetipo: potestad.arquetipo ?? null,
    bando: potestad.bando ?? null,
    nivel: potestad.nivel ?? potestad.datos?.nivel ?? null,
    inventario: [...(potestad.inventario ?? potestad.datos?.invetario ?? [])],
    posicion: potestad.datos?.posicion ? { ...potestad.datos.posicion } : null,
    hpInicial: potestad.hpInicial ?? potestad.estadisticas?.hp ?? null,
    estadisticas: { ...(potestad.estadisticas ?? {}) },
    constantes: { ...(potestad.constantes ?? {}) },
    efectos: copiarEfectos(potestad.efectos),
    listaDeAcciones: {
      habilidades: (acciones.habilidades ?? []).map(copiarAccion),
      objetos: (acciones.objetos ?? []).map(copiarAccion),
      movimiento: (acciones.movimiento ?? []).map(copiarAccion),
    },
  };
}

function buscarDeclarada(potestad, nombre) {
  return Object.values(potestad?.listaDeAcciones ?? {})
    .flat()
    .find((accion) => accion?.nombre === nombre) ?? null;
}

function obtenerDeRegistro(registro, id) {
  if (id == null || !registro?.obtenerPorId) return undefined;
  return registro.obtenerPorId(id) ?? registro.obtenerPorId(Number(id));
}

function esTipoCasilla(tipo) {
  return String(tipo ?? '').toLowerCase().includes('casilla');
}

function resolverObjetivoTarea(tipo, objetivo, registro) {
  if (objetivo == null) return { objetivo: null, bandoObjetivo: null };
  if (esTipoCasilla(tipo)) {
    return { objetivo: { x: Number(objetivo.x), y: Number(objetivo.y) }, bandoObjetivo: null };
  }
  const entrada = obtenerDeRegistro(registro, objetivo);
  return { objetivo: entrada?.potestad ?? null, bandoObjetivo: entrada?.bando ?? null };
}

/** JSON plano `{ id, nombreDeAccion, objetivo, azar }` → tareas ejecutables. */
export function normalizarConfiguracion(configuracion, registro) {
  const filas = configuracion?.configuracion ?? configuracion ?? [];
  if (!Array.isArray(filas)) {
    console.warn('[IndexDePotestades] La configuracion debe ser un array.');
    return [];
  }

  return filas
    .map((fila) => {
      const entrada = obtenerDeRegistro(registro, fila?.id);
      if (!entrada) {
        console.warn('[IndexDePotestades] Potestad desconocida en la configuracion', fila?.id);
        return null;
      }
      const enCatalogo = resolverAccion(fila?.nombreDeAccion);
      const declarada = buscarDeclarada(entrada.potestad, fila?.nombreDeAccion);
      if (!enCatalogo || !declarada) {
        console.warn('[IndexDePotestades] Accion desconocida', fila?.nombreDeAccion, fila?.id);
        return null;
      }
      return {
        id: entrada.potestad.id,
        potestad: entrada.potestad,
        bando: entrada.bando,
        accion: {
          ...enCatalogo,
          ...declarada,
          tipo: enCatalogo.tipo,
          fase: enCatalogo.fase,
          porGolpe: enCatalogo.porGolpe,
          fabricar: enCatalogo.fabricar,
        },
        ...resolverObjetivoTarea(enCatalogo.tipo, fila?.objetivo, registro),
        azar: fila?.azar ?? null,
      };
    })
    .filter(Boolean);
}

const CLAVES_DE_ANIMACION = {
  moverse: 'movimiento',
  movilidadRapida: 'movimiento',
  movilidadLenta: 'movimiento',
  'movilidad rapida': 'movimiento',
  'movilidad lenta': 'movimiento',
  ponerTrampa: 'trampaEstatica',
  'poner trampa': 'trampaEstatica',
  generarMagia: 'generarMagia',
  'generar magia': 'generarMagia',
  rayoDeMagia: 'rayo',
  'rayo de magia': 'rayo',
  descansar: 'descansar',
  descansa: 'descansar',
  pacto: 'proteccion',
  zombiosis: 'revivir',
};

function resolverAnimacion(potestad, nombre) {
  const claveCanon = claveDeAccion(nombre);
  if (claveCanon === 'ritual') {
    return async (ctx) => {
      await potestad.animaciones?.ritual?.(ctx);
      if (potestad._transformarEsteShow) {
        await potestad.animaciones?.transformacion?.(ctx);
        potestad._transformarEsteShow = false;
      }
    };
  }
  if (potestad?.transformado && claveCanon === 'atacar') {
    return potestad.animaciones?.atacarTransformado ?? potestad.animaciones?.atacar ?? null;
  }
  if (potestad?.transformado && claveCanon === 'maldicion') {
    return potestad.animaciones?.maldecirTransformado ?? potestad.animaciones?.maldicion ?? null;
  }
  const clave = CLAVES_DE_ANIMACION[nombre] ?? CLAVES_DE_ANIMACION[claveCanon] ?? nombre ?? claveCanon;
  return potestad?.animaciones?.[clave] ?? null;
}

/** Velocidad + funcion viva + animacion. Guion no importa este archivo. */
export function adaptarParaGuion(tarea) {
  const nombre = tarea?.accion?.nombre ?? tarea?.nombreDeAccion;
  const entrada = resolverAccion(nombre);
  const ejecucion = entrada?.fabricar?.() ?? (() => {});
  const animacion = resolverAnimacion(tarea?.potestad, nombre);
  return {
    velocidad: Number(tarea?.accion?.velocidad ?? 0),
    ejecutar: (contexto) => {
      const resultado = ejecucion(tarea.objetivo, { ...contexto, tarea });
      if (resultado?.efectoPasivo) tarea.efectoPasivo = resultado.efectoPasivo;
      return resultado;
    },
    animacion,
  };
}

/** Solo la reproduccion. Show no mira dentro de la potestad. */
export function adaptarParaShow(tarea) {
  const nombre = tarea?.accion?.nombre ?? tarea?.nombreDeAccion;
  const animacion = tarea?.animacion ?? resolverAnimacion(tarea?.potestad, nombre);
  return {
    reproducir: (contexto) => animacion?.(contexto) ?? Promise.resolve(),
  };
}

/**
 * Config serializable → tareas listas para guion/show.
 * PhaserMaster llama esto; guion no importa este archivo (regla 9).
 */
export function prepararTareasDeTurno(configuracion, registro) {
  return normalizarConfiguracion(configuracion, registro).map((tarea) => {
    const paquete = adaptarParaGuion(tarea);
    const show = adaptarParaShow({ ...tarea, animacion: paquete.animacion });
    return {
      ...tarea,
      ...paquete,
      nombreDeAccion: tarea.accion?.nombre ?? null,
      accionPasiva: null,
      anulada: false,
      reproducir: show.reproducir,
      _velocidad: paquete.velocidad,
    };
  });
}
