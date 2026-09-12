/**
 * finalidad.js — Cartel de resultado de la batalla.
 *
 * SPECT: docs/spects/spect008.md
 *
 * QUE SERA: recibe el resultado ya decidido y lo pinta. Victoria, derrota o
 * empate, mas el informe de la batalla leido del registro de jugadas, mas la
 * salida hacia el destino que marca el molde.
 *
 * LO QUE ESTE ARCHIVO NO HACE: decidir. Quien gana lo determina PhaserMaster
 * a partir de lo que le reporta guionSincrono. Aqui solo entra un dato y sale
 * una escena estatica.
 *
 * Rescatado de: classes/battle/controladorJugada.js (borrado).
 *
 * ESTADO: esqueleto con rescate. Revisar contra el spect 008.
 */

const TITULOS = { victoria: 'VICTORIA', derrota: 'DERROTA', empate: 'EMPATE' };

// ─── RESCATE: controladorJugada.js lineas 676-709. Adaptado. ─────────────────
// Se conserva el overlay, el titulo y la transicion al destino del molde.
// Lo que cambia: dibuja en la escena del HUD que se le pasa (regla 1), y ya no
// para escenas por su nombre a mano, porque las claves las conoce vista.js.

export function mostrarFinalidad(escenaHud, opciones) {
  const { resultado, destino, alSalir } = opciones;
  const camara = escenaHud.cameras?.main;
  const ancho = camara?.width ?? 800;
  const alto = camara?.height ?? 600;

  const overlay = escenaHud.add.rectangle(ancho / 2, alto / 2, ancho, alto, 0x000000, 0.75);
  overlay.setScrollFactor(0);
  overlay.setDepth(2000);

  const titulo = escenaHud.add.text(ancho / 2, alto / 2, TITULOS[resultado] ?? 'FIN', {
    fontFamily: 'monospace',
    fontSize: '96px',
    color: '#ffffff',
  });
  titulo.setOrigin(0.5);
  titulo.setScrollFactor(0);
  titulo.setDepth(2001);

  overlay.setInteractive();
  overlay.once('pointerdown', () => alSalir?.(destino));

  return { overlay, titulo };
}

// ─── A CONSTRUIR ─────────────────────────────────────────────────────────────
//
// El cartel actual es un rectangulo negro y una palabra. El spect 008 define
// el informe: lee el registro de jugadas que sostiene PhaserMaster y resume la
// batalla. El destino sale del molde, rama `otros.destino[resultado]`, que ya
// existe en crearNiveles/Molde001.json con su key, x e y.
