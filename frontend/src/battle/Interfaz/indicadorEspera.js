const DEPTH_ESPERA = 9400;

let handleActivo = null;

export function mostrarEsperaRival(escenaHud) {
  ocultarEsperaRival(escenaHud);
  const { width, height } = escenaHud.scale;
  const cont = escenaHud.add.container(0, 0);
  cont.setScrollFactor(0);
  cont.setDepth(DEPTH_ESPERA);

  const fondo = escenaHud.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35);
  fondo.setScrollFactor(0);
  cont.add(fondo);

  const texto = escenaHud.add.text(width / 2, height / 2, 'esperando al rival', {
    fontFamily: 'Arial',
    fontSize: 28,
    color: '#ffffff',
  });
  texto.setOrigin(0.5, 0.5);
  texto.setScrollFactor(0);
  cont.add(texto);

  handleActivo = cont;
  return cont;
}

export function ocultarEsperaRival() {
  handleActivo?.destroy(true);
  handleActivo = null;
}
