/**
 * IndexDePotestades.js — Registro de potestades y adaptador de sus datos.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE ES: dos cosas y nada mas.
 *   1. Los registros: dado un arquetipo, que clase toca; dado un nombre de
 *      accion, que funcion toca y que informacion hace falta para elegirla.
 *   2. Tres funciones de adaptacion que dan a los datos la forma que espera
 *      cada consumidor: el panel, las orbes y el show.
 *
 * REGLA 9 DEL CONTRATO: este archivo no importa panelEntidad, sistemaDeOrbes
 * ni guionSincrono. Expone los datos con la forma que piden; no los conoce.
 * Si algun dia importa a alguno de los tres, la flecha de dependencia se ha
 * invertido y este archivo esta en camino de convertirse en el nuevo
 * controladorJugada de 745 lineas.
 *
 * EL BANDO ES UN DATO, NO UNA CLASE. El codigo viejo tenia dos registros
 * gemelos, aliadoEspecifico.js y enemigoEspecifico.js, identicos salvo el
 * nombre. En multijugador las potestades del rival son de las mismas familias
 * que las tuyas, asi que la distincion no daba informacion: se unifica aqui.
 *
 * EL ARQUETIPO ES LA FAMILIA. `characterSelectScene.js` linea 301 ofrece
 * 'Campesino', 'Mago', 'Realista', 'Intelectual' y 'Sectario' y los manda tal
 * cual dentro del equipo; el registro se indexa por esa palabra.
 *
 * Rescatado de: familias/aliadoEspecifico.js, familias/enemigoEspecifico.js y
 * ui/Entidades/Enemigos.js (los tres borrados).
 */

import { POTESTADES_CAMPESINO } from './potestades/campesinos.js';
import { POTESTADES_REALISTA } from './potestades/realista.js';
import { POTESTADES_MAGO } from './potestades/mago.js';
import { POTESTADES_INTELECTUAL } from './potestades/intelectual.js';
import { POTESTADES_SECTARIO } from './potestades/sectario.js';

import * as ACCIONES_DIRECTO from './acciones/directo.js';
import * as ACCIONES_ENTIDAD from './acciones/directoEntidad.js';
import * as ACCIONES_CASILLA from './acciones/directoCasilla.js';
import * as ACCIONES_CONFIG1 from './acciones/directoConfig1.js';

// ─── REGISTRO DE FAMILIAS ────────────────────────────────────────────────────
// RESCATE UNIFICADO: aliadoEspecifico.js 8-33 + enemigoEspecifico.js 6-27.
// El registro ya no se escribe a mano clase por clase: cada familia exporta su
// lista y aqui se indexa por el arquetipo que declara cada clase. Anadir una
// potestad deja de exigir tocar este archivo.

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

export function resolverClase(datos) {
  const clave = String(datos?.arquetipo ?? '').trim().toLowerCase();
  const Clase = REGISTRO_POR_ARQUETIPO[clave];
  if (!Clase) {
    throw new Error(
      `[IndexDePotestades] Arquetipo desconocido: "${datos?.arquetipo}". ` +
      `Registralo exportandolo en la lista de su familia (clave: ${clave || '(vacio)'}).`,
    );
  }
  return Clase;
}

// ─── CATALOGO DE ACCIONES: EL ARCHIVO ES LA ETIQUETA ─────────────────────────
// Cada archivo de acciones/ agrupa las acciones por la informacion que le falta
// al jugador para poder enviarlas, y esa es justo la pregunta que el negociador
// de turno necesita responder. Por eso el tipo se estampa aqui, leyendo de que
// modulo vino la funcion, y no se declara a mano dentro de cada accion: una
// etiqueta escrita a mano se escribe mal antes o despues, y el bucle de rondas
// se quedaria esperando una respuesta que no llega.
//
// `casoDeEleccion` es la traduccion del tipo al vocabulario que ya entiende
// utilidadesDeSeleccion.normalizarCasoSeleccion. Los cuatro archivos y los
// cuatro casos de ese normalizador son la misma particion vista dos veces.

const ARCHIVOS_DE_ACCIONES = [
  { tipo: 'directo', casoDeEleccion: null, requiereRonda: false, modulo: ACCIONES_DIRECTO },
  { tipo: 'entidad', casoDeEleccion: '0', requiereRonda: false, modulo: ACCIONES_ENTIDAD },
  { tipo: 'casilla', casoDeEleccion: 'casilla', requiereRonda: false, modulo: ACCIONES_CASILLA },
  { tipo: 'config1', casoDeEleccion: '1', requiereRonda: true, modulo: ACCIONES_CONFIG1 },
];

export const CATALOGO_DE_ACCIONES = Object.fromEntries(
  ARCHIVOS_DE_ACCIONES.flatMap(({ modulo, ...etiqueta }) =>
    Object.entries(modulo)
      .filter(([, valor]) => typeof valor === 'function')
      .map(([nombre, funcion]) => [nombre, {
        nombre,
        funcion,
        ...etiqueta,
        // Lo leia el ejecutor viejo para decidir que cancela esta accion.
        efectoTipo1: funcion.efectoTipo1 ?? null,
      }]),
  ),
);

export function resolverAccion(nombre) {
  return CATALOGO_DE_ACCIONES[nombre] ?? null;
}

// ─── CREACION DEL REGISTRO DE UNA PARTIDA ────────────────────────────────────
// RESCATE ADAPTADO: aliadoEspecifico.js lineas 43-73.
// Un solo registro para los dos bandos. El bando viaja dentro de la entrada y
// tambien dentro de la potestad, porque el color del anillo de su circulo
// depende de el.
//
// `escena` es opcional: sin ella el registro se construye igual pero sin
// fabricar texturas. Eso permite usar estos datos donde no hay Phaser —una
// prueba, o el dia que el servidor quiera validar una jugada—.

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

export function crearRegistro(equipos, escena = null) {
  const porId = new Map();
  const vistos = new Set();

  BANDOS.forEach((bando) => {
    (equipos?.[bando] ?? []).forEach((fila, indice) => {
      exigirIdUnico(fila, bando, indice, vistos);
      const Clase = resolverClase(fila);
      const potestad = new Clase(fila, bando);
      if (escena) potestad.prepararEnEscena(escena);
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

// ─── EL PUENTE SERIALIZABLE ──────────────────────────────────────────────────
// RESCATE: Enemigos.js lineas 213-269.
// Convierte la configuracion plana `{ id, nombreDeAccion, objetivo, azar }` en
// tareas internas. Es la unica puerta de entrada de configuraciones: por aqui
// pasan tanto las que llegan por Recibir_Config_Acciones como las que algun
// dia produzca la IA. En el codigo viejo se llamaba normalizarConfiguracionIA
// y vivia en un archivo de interfaz, con la logica de turnos importandolo: esa
// inversion de capas es lo que se corrige al traerlo aqui.
//
// El campo `objetivo` significa una cosa distinta segun el tipo de la accion, y
// esa es la razon de que el tipo se resuelva antes que el objetivo: para las de
// casilla son coordenadas base 1, para las demas es el id de otra potestad.

function resolverObjetivo(tipo, objetivo, registro) {
  if (objetivo == null) return { objetivo: null, bandoObjetivo: null };
  if (tipo === 'casilla') {
    return { objetivo: { x: Number(objetivo.x), y: Number(objetivo.y) }, bandoObjetivo: null };
  }
  const entrada = registro.obtenerPorId(Number(objetivo));
  return { objetivo: entrada?.potestad ?? null, bandoObjetivo: entrada?.bando ?? null };
}

function buscarDeclarada(potestad, nombre) {
  return Object.values(potestad.listaDeAcciones ?? {})
    .flat()
    .find((accion) => accion?.nombre === nombre) ?? null;
}

export function normalizarConfiguracion(configuracion, registro) {
  const filas = configuracion?.configuracion ?? configuracion ?? [];
  if (!Array.isArray(filas)) {
    console.warn('[IndexDePotestades] La configuracion debe ser un array.');
    return [];
  }

  return filas
    .map((fila) => {
      const entrada = registro.obtenerPorId(Number(fila?.id));
      if (!entrada) {
        console.warn('[IndexDePotestades] Potestad desconocida en la configuracion', fila?.id);
        return null;
      }

      // Dos comprobaciones distintas: que la accion exista en el catalogo (hay
      // funcion que ejecutar) y que esta potestad la tenga declarada (tiene
      // permiso y trae sus numeros). Un rival manipulado falla la segunda.
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
        accion: { ...declarada, ...enCatalogo },
        ...resolverObjetivo(enCatalogo.tipo, fila?.objetivo, registro),
        // Regla 5: el azar ya viene resuelto por el cliente dueno. Aqui solo se
        // transporta; tirar un dado en este punto desincronizaria las partidas.
        azar: fila?.azar ?? null,
      };
    })
    .filter(Boolean);
}

// ─── ADAPTACION 1: para el panel ─────────────────────────────────────────────
// RESCATE: Aliados.js lineas 1062-1099 (construirDatosDetalle y aItems).

function aItems(lista) {
  return (lista ?? []).map((item) => ({
    imagen: item?.ruta ?? null,
    nombre: String(item?.nombre ?? item ?? ''),
    cantidad: '',
  }));
}

export function adaptarParaPanel(potestad, bando) {
  const stats = potestad.estadisticas ?? {};
  const lda = potestad.listaDeAcciones ?? {};
  const hp = Number(stats.hp ?? 0);

  return {
    id: potestad.id,
    bando: bando ?? potestad.bando,
    nombre: potestad.arquetipo ?? '',
    foto: null,
    vida: { vidaActual: hp, vidaMaxima: Number(potestad.constantes?.hpMax ?? hp) },
    estadisticas: Object.entries(stats)
      .filter(([clave]) => clave.toLowerCase() !== 'hp')
      .map(([clave, valor]) => ({ imagen: null, nombre: String(clave).toUpperCase(), cantidad: valor })),
    efectos: [],
    acciones: aItems(lda.habilidades),
    objetos: aItems(lda.objetos),
    movimiento: aItems(lda.movimiento),
  };
}

// ─── ADAPTACION 2: para las orbes ────────────────────────────────────────────
// Las orbes leen `entidadAliada.acciones` como tres cadenas navegables y las
// indexan por posicion: habilidades 0, objetos 1, movimiento 2 (orbes.js 153-155).
// RESCATE PARCIAL: Aliados.js lineas 111-137, que construia esto a mano dentro
// del archivo de interfaz.
//
// Se devuelven copias y no las acciones de la potestad porque las orbes cuelgan
// su `orbePhaser` de cada una (orbes.js 185). Sin la copia, un objeto de Phaser
// acabaria guardado dentro de los datos de la potestad, que es exactamente la
// mezcla que este spect deshace.

const CADENAS = ['habilidades', 'objetos', 'movimiento'];

export function adaptarParaOrbes(potestad) {
  const lda = potestad.listaDeAcciones ?? {};

  return CADENAS.map((cadena) => (lda[cadena] ?? []).map((accion) => {
    const enCatalogo = resolverAccion(accion.nombre);
    return {
      ...accion,
      // Lo que convierte al archivo en etiqueta: la orbe sabe que pedir sin
      // que la potestad haya tenido que declararlo.
      casoDeEleccion: enCatalogo?.casoDeEleccion ?? null,
      requiereRonda: enCatalogo?.requiereRonda ?? false,
      orbePhaser: null,
    };
  }));
}

// ─── ADAPTACION 3: para el show ──────────────────────────────────────────────
// El guion necesita, por cada accion elegida, su velocidad y la funcion que la
// ejecuta ya resuelta desde acciones/. `ejecutar` cierra sobre la tarea para
// que el guion no tenga que recordar el orden de los dos argumentos ni volver a
// mirar dentro de la accion.

export function adaptarParaGuion(tarea) {
  const { accion } = tarea;
  return {
    id: tarea.id,
    velocidad: Number(accion?.velocidad ?? 0),
    efectoTipo1: accion?.efectoTipo1 ?? null,
    ejecutar: (contexto) => accion.funcion(tarea.objetivo, { ...contexto, tarea }),
  };
}
