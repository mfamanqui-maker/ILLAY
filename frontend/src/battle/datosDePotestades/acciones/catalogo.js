/**
 * acciones/catalogo.js — Nombre de accion → fabrica, arquetipo y fase.
 *
 * SPECT: docs/spects/spect006.md y spect007.md
 *
 * El archivo de la accion es su arquetipo (`tipo`). Cada arquetipo declara
 * en que fase del grupo de velocidad se resuelve; `fases` corrige por accion.
 * Guion y seleccion preguntan aqui, no adivinan por nombre.
 *
 * Fases, en orden dentro de un grupo: trampa → movimiento → preparacion → proyectil.
 */

import { AccionesDirecto } from './directo.js';
import { AccionesDianaEnemigo } from './dianaEnemigo.js';
import { AccionesDianaAliado } from './dianaAliado.js';
import { AccionesDianaCasilla } from './dianaCasilla.js';
import { AccionesConfigType1Aliado } from './configtype1aliado.js';

export const FASES = ['trampa', 'movimiento', 'preparacion', 'proyectil'];

export const ARCHIVOS_DE_ACCIONES = [
  { tipo: 'directo', fase: 'preparacion', fabricas: {
    generarMagia: AccionesDirecto.generarMagia,
    estudiar: AccionesDirecto.estudiar,
    ritual: AccionesDirecto.ritual,
    pacto: AccionesDirecto.pacto,
    descansar: AccionesDirecto.descansar,
  } },
  { tipo: 'dianaEnemigo', fase: 'proyectil', fabricas: {
    atacar: AccionesDianaEnemigo.atacar,
    apuntar: AccionesDianaEnemigo.apuntar,
    disparar: AccionesDianaEnemigo.disparar,
    maldicion: AccionesDianaEnemigo.maldicion,
  } },
  { tipo: 'dianaAliado', fase: 'preparacion', fabricas: {
    curar: AccionesDianaAliado.curar,
    zombiosis: AccionesDianaAliado.zombiosis,
  } },
  { tipo: 'dianaCasilla', fase: 'preparacion',
    fases: {
      moverse: 'movimiento',
      movilidadRapida: 'movimiento',
      movilidadLenta: 'movimiento',
      ponerTrampa: 'trampa',
      rayoDeMagia: 'proyectil',
    },
    // Se anula golpe a golpe dentro de la accion, nunca entera.
    porGolpe: ['rayoDeMagia'],
    fabricas: {
      moverse: AccionesDianaCasilla.moverse,
      movilidadRapida: AccionesDianaCasilla.moverse,
      movilidadLenta: AccionesDianaCasilla.moverse,
      ponerTrampa: AccionesDianaCasilla.ponerTrampa,
      rayoDeMagia: AccionesDianaCasilla.rayoDeMagia,
    } },
  { tipo: 'configtype1aliado', fase: 'preparacion', fabricas: {
    escudar: AccionesConfigType1Aliado.escudar,
  } },
];

function aliasEspaciado(nombre) {
  return String(nombre ?? '')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

const ENTRADAS_CATALOGO = ARCHIVOS_DE_ACCIONES.flatMap((archivo) => (
  Object.entries(archivo.fabricas).map(([nombre, fabricar]) => [nombre, {
    nombre,
    tipo: archivo.tipo,
    fase: archivo.fases?.[nombre] ?? archivo.fase,
    porGolpe: (archivo.porGolpe ?? []).includes(nombre),
    fabricar,
  }])
));

export const CATALOGO_DE_ACCIONES = Object.fromEntries([
  ...ENTRADAS_CATALOGO,
  ...ENTRADAS_CATALOGO.flatMap(([nombre, entrada]) => {
    const alias = aliasEspaciado(nombre);
    return alias && alias !== nombre ? [[alias, entrada]] : [];
  }),
  ['descansa', {
    nombre: 'descansar', tipo: 'directo', fase: 'preparacion', porGolpe: false,
    fabricar: AccionesDirecto.descansar,
  }],
]);

export function claveDeAccion(nombre) {
  const crudo = String(nombre ?? '').trim();
  if (!crudo) return '';
  if (CATALOGO_DE_ACCIONES[crudo]) return CATALOGO_DE_ACCIONES[crudo].nombre;
  const camel = crudo.replace(/[\s_]+(\S)/g, (_, c) => c.toUpperCase());
  if (CATALOGO_DE_ACCIONES[camel]) return CATALOGO_DE_ACCIONES[camel].nombre;
  return crudo;
}

export function resolverAccion(nombre) {
  const clave = claveDeAccion(nombre);
  return CATALOGO_DE_ACCIONES[clave]
    ?? CATALOGO_DE_ACCIONES[nombre]
    ?? CATALOGO_DE_ACCIONES[claveDeAccion(String(nombre ?? '').trim().toLowerCase())]
    ?? null;
}

/** Fase del grupo en la que se resuelve. Desconocida: preparacion. */
export function faseDeAccion(nombre) {
  return resolverAccion(nombre)?.fase ?? 'preparacion';
}

export function esProyectil(nombre) {
  return faseDeAccion(nombre) === 'proyectil';
}

export function esMovilidad(nombre) {
  return faseDeAccion(nombre) === 'movimiento';
}

export function esTrampa(nombre) {
  return faseDeAccion(nombre) === 'trampa';
}

/** Proyectil que se filtra hit a hit (rayo): no se cancela la tarea entera. */
export function anulaPorGolpe(nombre) {
  return resolverAccion(nombre)?.porGolpe === true;
}
