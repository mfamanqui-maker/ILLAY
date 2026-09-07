/**
 * IndexDePotestades.js — Registro de potestades y adaptador de sus datos.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE SERA: dos cosas y nada mas.
 *   1. El registro: dado un arquetipo, que clase toca; dado un id, que
 *      potestad es y de que bando.
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
 * Rescatado de: familias/aliadoEspecifico.js, familias/enemigoEspecifico.js y
 * ui/Entidades/Enemigos.js (los tres borrados).
 *
 * ESTADO: esqueleto con rescate. Revisar contra el spect 006.
 */

import { POTESTADES_CAMPESINO } from './potestades/campesinos.js';
import { POTESTADES_REALISTA } from './potestades/realista.js';
import { POTESTADES_MAGO } from './potestades/mago.js';
import { POTESTADES_INTELECTUAL } from './potestades/intelectual.js';
import { POTESTADES_SECTARIO } from './potestades/sectario.js';

// ─── RESCATE UNIFICADO: aliadoEspecifico.js 8-33 + enemigoEspecifico.js 6-27 ──
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

// ─── RESCATE ADAPTADO: aliadoEspecifico.js lineas 43-73. ─────────────────────
// Un solo registro para los dos bandos. El bando viaja dentro de la entrada.

export function crearRegistro(equipos) {
  const porId = new Map();
  ['Aliados', 'Enemigos'].forEach((bando) => {
    (equipos?.[bando] ?? []).forEach((fila) => {
      const Clase = resolverClase(fila);
      porId.set(fila.id, { bando, potestad: new Clase(fila) });
    });
  });

  return {
    porId,
    obtenerPorId: (id) => porId.get(id),
    todos: () => [...porId.values()],
    porBando: (bando) => [...porId.values()].filter((e) => e.bando === bando),
  };
}

// ─── RESCATE: Enemigos.js lineas 213-269. EL PUENTE SERIALIZABLE. ────────────
// Convierte la configuracion plana `{ id, nombreDeAccion, objetivo, azar }` en
// tareas internas. Es la unica puerta de entrada de configuraciones: por aqui
// pasan tanto las que llegan por Recibir_Config_Acciones como las que algun
// dia produzca la IA. En el codigo viejo se llamaba normalizarConfiguracionIA
// y vivia en un archivo de interfaz, con la logica de turnos importandolo:
// esa inversion de capas es lo que se corrige al traerlo aqui.
//
// A COMPLETAR EN EL SPECT 006: resolver el nombre de accion contra el catalogo
// de acciones/ (hoy el rescate busca la funcion dentro de la potestad) y
// propagar el campo `azar` de la regla 5.

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
      const accion = (entrada.potestad.listaDeAcciones
        ? Object.values(entrada.potestad.listaDeAcciones).flat()
        : []
      ).find((a) => a.nombre === fila?.nombreDeAccion);
      if (!accion) {
        console.warn('[IndexDePotestades] Accion desconocida', fila?.nombreDeAccion, fila?.id);
        return null;
      }
      const objetivo = fila?.objetivo == null ? null : registro.obtenerPorId(Number(fila.objetivo));
      return {
        potestad: entrada.potestad,
        bando: entrada.bando,
        accion,
        objetivo: objetivo?.potestad ?? null,
        bandoObjetivo: objetivo?.bando ?? null,
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
    bando,
    nombre: potestad.datos?.arquetipo ?? '',
    foto: null,
    vida: { vidaActual: hp, vidaMaxima: Number(stats.hpMax ?? hp) },
    estadisticas: Object.entries(stats)
      .filter(([clave]) => !['hp', 'hpmax'].includes(clave.toLowerCase()))
      .map(([clave, valor]) => ({ imagen: null, nombre: String(clave).toUpperCase(), cantidad: valor })),
    efectos: [],
    acciones: aItems(lda.habilidades),
    objetos: aItems(lda.objetos),
    movimiento: aItems(lda.movimiento),
  };
}

// ─── ADAPTACION 2: para las orbes ────────────────────────────────────────────
// Las orbes necesitan las acciones en tres cadenas navegables (movimiento,
// habilidades, objetos) con su color y su condicional ya resuelto.
// RESCATE PARCIAL: Aliados.js lineas 111-137, que construia esto a mano
// dentro del archivo de interfaz.

export function adaptarParaOrbes(potestad) {}

// ─── ADAPTACION 3: para el show ──────────────────────────────────────────────
// El guion necesita, por cada accion elegida, su velocidad y la funcion que la
// ejecuta ya resuelta desde acciones/.

export function adaptarParaGuion(tarea) {}
