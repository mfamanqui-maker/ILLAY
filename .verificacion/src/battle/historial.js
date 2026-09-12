/**
 * historial.js — Panel de jugadas de ambos jugadores.
 *
 * SPECT: docs/spects/spect001.md
 *
 * QUE SERA: dibuja y administra el panel donde el jugador consulta todo lo que
 * ha pasado en la batalla, turno a turno, de los dos bandos.
 *
 * LO QUE ESTE ARCHIVO NO HACE: guardar. El registro lo crea y lo actualiza
 * PhaserMaster, que escucha 'jugadaEjecutada' del guion. Aqui solo se lee.
 * La separacion importa porque el registro tiene que existir desde el turno 1
 * aunque nadie abra el panel: AGENTS.md punto 15 pide guardar las acciones
 * para el informe de batalla, y finalidad.js lee ese mismo registro.
 *
 * Un registro, dos lectores.
 *
 * Dibuja sobre la escena del HUD (generarInterfaz), que recibe por parametro.
 * No es una escena. Regla 1 del contrato.
 *
 * ESTADO: esqueleto. Archivo nuevo, no hay nada que rescatar.
 */

/**
 * Forma de una jugada dentro del registro. Datos planos: tiene que poder
 * serializarse para el informe final sin arrastrar sprites ni funciones.
 *
 * @typedef {object} Jugada
 * @property {number} turno
 * @property {number} grupoVelocidad
 * @property {'Aliados'|'Enemigos'} bando
 * @property {number} idPotestad
 * @property {string} nombreAccion
 * @property {number|null} idObjetivo
 * @property {object} efecto      lo que cambio (dano, cura, movimiento...)
 * @property {boolean} cancelada  true si un escudo o retirada la anulo
 */

// ─── A CONSTRUIR ─────────────────────────────────────────────────────────────
//
// abrirHistorial(escenaHud, registro, opciones)
//   Dibuja el panel. Se puede reutilizar la lista scrollable que ya existe en
//   panelEntidad/partes/listaScrollable.js en vez de escribir otra.
//
// cerrarHistorial()
// actualizarHistorial(registro)   refresco en caliente si el panel esta abierto
//
// El spect 001 define la forma final del registro y el reparto visual.
