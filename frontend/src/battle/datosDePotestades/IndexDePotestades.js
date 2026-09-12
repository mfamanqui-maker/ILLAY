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
 * Esta parte ya entrega adaptarParaPanel y adaptarParaOrbes (peticion 4).
 * El catalogo de funciones de acciones y adaptarParaGuion siguen pendientes.
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
      porId.set(fila.id, { bando, potestad });
    });
  });

  return {
    porId,
    obtenerPorId: (id) => porId.get(id),
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
    ruta: accion.ruta,
    casoDeEleccion: accion.casoDeEleccion ?? accion.casoDeElección ?? null,
  };
}

const TINTES = {
  estadisticas: 0xf5d68a,
  efectos: 0xc084fc,
  movimiento: 0x8be66f,
  habilidades: 0x7ed4ff,
  objetos: 0xf5d36a,
};

// Si la potestad no declara caso, el nombre y la cadena dicen qué hay que pedir.
const CASO_POR_NOMBRE = {
  moverse: 'casilla',
  retirada: 'casilla',
  ponertrampa: 'casilla',
  atacar: 'Enemigos',
  maldicion: 'Enemigos',
  rayodemagia: 'Enemigos',
  disparar: 'Enemigos',
  apuntar: 'Enemigos',
  curar: 'Aliados',
  zombiosis: 'Aliados',
  escudar: 'Aliados',
};

function claveDeNombre(nombre) {
  return String(nombre ?? '').toLowerCase().replace(/\s+/g, '');
}

function resolverCaso(accion, cadena) {
  if (accion?.casoDeEleccion != null) return accion.casoDeEleccion;
  if (cadena === 'movimiento') return 'casilla';
  return CASO_POR_NOMBRE[claveDeNombre(accion?.nombre)] ?? false;
}

function filasDeMapa(mapa, tinte) {
  return Object.entries(mapa ?? {}).map(([nombre, cantidad]) => ({ nombre, cantidad, tinte }));
}

function idsPorBando(registro) {
  return {
    Aliados: (registro?.porBando?.('Aliados') ?? []).map(({ potestad }) => ({ id: potestad.id })),
    Enemigos: (registro?.porBando?.('Enemigos') ?? []).map(({ potestad }) => ({ id: potestad.id })),
  };
}

/**
 * Forma que espera abrirPanelEntidad. No importa el panel (regla 9).
 * Habilidades llevan `imagen`; el resto, solo `tinte` para la vela.
 */
export function adaptarParaPanel(potestad, bando, registro) {
  const datos = datosDeEntidad(potestad);
  if (!datos) return null;
  const stats = datos.estadisticas ?? {};
  const constantes = datos.constantes ?? {};
  return {
    nombre: datos.arquetipo ?? '',
    bando: bando ?? datos.bando ?? 'Aliados',
    idActual: datos.id,
    idInicial: datos.id,
    vida: {
      vidaActual: stats.hp ?? 0,
      vidaMaxima: constantes.hpMax ?? stats.hpMax ?? 1,
    },
    estadisticas: [...filasDeMapa(stats, TINTES.estadisticas), ...filasDeMapa(constantes, TINTES.estadisticas)],
    efectos: [],
    acciones: (datos.listaDeAcciones.habilidades ?? []).map((accion) => ({
      nombre: accion.nombre,
      imagen: accion.ruta,
    })),
    objetos: (datos.listaDeAcciones.objetos ?? []).map((accion) => ({
      nombre: accion.nombre,
      tinte: TINTES.objetos,
    })),
    movimiento: (datos.listaDeAcciones.movimiento ?? []).map((accion) => ({
      nombre: accion.nombre,
      tinte: TINTES.movimiento,
    })),
    equipos: idsPorBando(registro),
  };
}

function copiarCadena(acciones, cadena) {
  return (acciones ?? []).map((accion) => ({
    nombre: accion.nombre,
    rango: accion.rango,
    velocidad: accion.velocidad,
    condicional: accion.condicional,
    ruta: accion.ruta,
    casoDeEleccion: resolverCaso(accion, cadena),
  }));
}

/** Tres cadenas navegables. Las orbes no adivinan la forma del registro. */
export function adaptarParaOrbes(potestad) {
  const datos = datosDeEntidad(potestad);
  const vacia = { habilidades: [], objetos: [], movimiento: [] };
  if (!datos) return vacia;
  return {
    habilidades: copiarCadena(datos.listaDeAcciones.habilidades, 'habilidades'),
    objetos: copiarCadena(datos.listaDeAcciones.objetos, 'objetos'),
    movimiento: copiarCadena(datos.listaDeAcciones.movimiento, 'movimiento'),
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
    estadisticas: { ...(potestad.estadisticas ?? {}) },
    constantes: { ...(potestad.constantes ?? {}) },
    listaDeAcciones: {
      habilidades: (acciones.habilidades ?? []).map(copiarAccion),
      objetos: (acciones.objetos ?? []).map(copiarAccion),
      movimiento: (acciones.movimiento ?? []).map(copiarAccion),
    },
  };
}
