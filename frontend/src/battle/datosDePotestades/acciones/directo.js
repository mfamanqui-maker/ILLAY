/**
 * acciones/directo.js — Acciones que no necesitan ninguna informacion extra.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE SERA: el catalogo de acciones que se resuelven solas. El jugador las
 * elige y ya esta: no hay que pedirle un objetivo ni esperar a saber que hizo
 * el rival. Se envian siempre como Enviar_Config_Acciones_Final.
 *
 * EL ARCHIVO ES LA ETIQUETA: en que archivo vive una accion es lo que dice al
 * negociador de turno si hace falta abrir otra ronda. Por eso el tipo no se
 * declara a mano en cada accion; lo estampa IndexDePotestades al construir el
 * catalogo. Si se declarara a mano, alguien lo escribiria mal y el bucle de
 * rondas se colgaria esperando una respuesta que no llega.
 *
 * Firma de toda accion: (objetivo, contexto) => void | Promise
 *   contexto.tarea.potestad  quien la lanza
 *   contexto.tablero         el array bidimensional
 *   contexto.escena          la escena del mundo
 *   contexto.eventos         el emisor de PhaserMaster
 *
 * ESTADO: vacio a proposito. Esta primera parte del spect 006 solo entrega
 * datos para pintar. Las funciones de efecto llegan cuando el catalogo se
 * construya.
 */
