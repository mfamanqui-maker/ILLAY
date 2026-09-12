/**
 * acciones/directoConfig1.js — Acciones que necesitan saber que hizo el rival.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE SERA: el catalogo de acciones que no se pueden decidir a ciegas. Elegir
 * una obliga a enviar Enviar_Config_Acciones (no Final) y a esperar la
 * configuracion del rival antes de poder senalar objetivo.
 *
 * Este archivo es el que hace que exista el bucle de rondas. Si ninguna
 * potestad elige nada de aqui, el turno se resuelve en una sola vuelta.
 *
 * ESTADO: vacio a proposito. Esta primera parte del spect 006 solo entrega
 * datos para pintar. Las funciones de efecto llegan cuando el catalogo se
 * construya.
 */
