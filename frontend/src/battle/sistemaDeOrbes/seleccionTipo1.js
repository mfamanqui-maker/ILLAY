/**
 * seleccionTipo1.js — Interfaz de las acciones que dependen del rival.
 *
 * SPECT: docs/spects/spect005.md
 *
 * QUE SERA: cuando una potestad elige una accion de acciones/directoConfig1.js
 * (escudar, retirada), el juego ya sabe que le viene encima al jugador. Este
 * archivo lo ensena y espera a que elija: oscurece el tablero, hace parpadear
 * en azul a los candidatos, marca con particulas rojas a los que tienen un
 * proyectil apuntandoles, y al pasar el cursor muestra que les va a caer.
 *
 * POR QUE ESTA EN sistemaDeOrbes Y NO EN guionSincrono: es una interaccion de
 * seleccion, la misma familia que marcar objetivos en el tablero. En el codigo
 * viejo estaban 250 lineas de tweens y particulas metidas dentro del
 * controlador de turnos, que es logica pura.
 *
 * Rescatado de: classes/battle/controladorJugada.js lineas 288-555 (borrado).
 *
 * ESTADO: rescate adaptado. El original leia todo de escenas que buscaba a
 * mano; aqui la escena y los candidatos entran por parametro. Revisar contra
 * el spect 005.
 */

// ─── RESCATE: controladorJugada.js lineas 288-304. Adaptado. ─────────────────
// Congelar las animaciones mientras el jugador decide. Devuelve la funcion que
// las reanuda, para no tener que llevar la lista por fuera.

export function pausarAnimaciones(sprites) {
  const pausadas = [];
  (sprites ?? []).forEach((sprite) => {
    if (sprite?.anims?.isPlaying) {
      sprite.anims.pause();
      pausadas.push(sprite);
    }
  });
  return () => pausadas.forEach((sprite) => sprite?.anims?.resume?.());
}

// ─── RESCATE: controladorJugada.js lineas 354-363. Sirve tal cual. ───────────
// La particula se genera en memoria en vez de cargar un PNG.

export function asegurarTexturaParticula(escena) {
  const clave = 'particulaProyectilTipo1';
  if (escena.textures.exists(clave)) return clave;
  const grafico = escena.add.graphics();
  grafico.fillStyle(0xffffff, 1);
  grafico.fillCircle(10, 10, 10);
  grafico.generateTexture(clave, 20, 20);
  grafico.destroy();
  return clave;
}

// ─── RESCATE: controladorJugada.js lineas 365-391. Sirve tal cual. ───────────
// Parpadeo tintado. Devuelve el restaurador para dejar el sprite como estaba;
// sin el, el tinte se quedaba pegado al cancelar la seleccion.

export function crearParpadeo(escena, sprite, color) {
  if (!sprite?.active) return null;

  const tintePrevio = sprite.tintTopLeft;
  const alphaPrevio = sprite.alpha;
  sprite.setTint(color);

  const tween = escena.tweens.add({
    targets: sprite,
    alpha: 0.45,
    duration: 420,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });

  return () => {
    escena.tweens?.killTweensOf(sprite);
    sprite.setAlpha(alphaPrevio ?? 1);
    if (tintePrevio != null && tintePrevio !== 0xffffff) sprite.setTint(tintePrevio);
    else sprite.clearTint();
    tween?.remove?.();
  };
}

// ─── RESCATE: controladorJugada.js lineas 307-321. Sirve tal cual. ───────────
// scrollFactor 0 fijado a camara: si no, el tooltip cambia de tamano con el
// zoom del tablero y se vuelve ilegible.

export function crearTooltip(escena) {
  const tooltip = escena.add.text(0, 0, '', {
    fontFamily: 'monospace',
    fontSize: '32px',
    color: '#ffffff',
    backgroundColor: '#000000cc',
    padding: { x: 14, y: 10 },
    align: 'left',
  });
  tooltip.setScrollFactor(0);
  tooltip.setDepth(1002);
  tooltip.setVisible(false);
  return tooltip;
}

// ─── RESCATE: controladorJugada.js lineas 337-352. Adaptado. ─────────────────
// Agrupa las acciones pendientes por objetivo para que el tooltip diga
// "atacar: 2" en vez de listar la misma linea dos veces.

export function resumirAmenazas(acccionesPendientes) {
  const resumen = new Map();
  (acccionesPendientes ?? []).forEach((pendiente) => {
    if (pendiente.cancelada) return;
    const id = pendiente.idObjetivo;
    if (id == null) return;
    if (!resumen.has(id)) resumen.set(id, new Map());
    const cuenta = resumen.get(id);
    const nombre = pendiente.nombreAccion ?? 'Accion';
    cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + 1);
  });
  return resumen;
}

// ─── A CONSTRUIR ─────────────────────────────────────────────────────────────
//
// mostrarSeleccionTipo1(escena, opciones) -> Promise<candidato|null>
//
// El original (controladorJugada.js lineas 449-555) montaba a mano el filtro
// oscuro, los emisores de particulas, los cuatro handlers de puntero por
// candidato y su limpieza. Se rescata la coreografia, pero hay dos cosas que
// arreglar:
//
//   1. El filtro se reposicionaba escuchando 'update' de la escena y ese
//      listener solo se quitaba en el camino feliz. Si la batalla terminaba
//      durante la seleccion, quedaba colgado.
//   2. La promesa no tenia salida: si el jugador no pulsaba nada, no se
//      resolvia nunca. Hace falta poder cancelar con Escape.
//
// La fase de cancelacion de la regla 10 depende de esto: lo que devuelva esta
// funcion decide que acciones se retiran del grupo antes de resolverlo.
