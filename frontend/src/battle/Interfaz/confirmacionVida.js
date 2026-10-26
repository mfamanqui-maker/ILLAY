const DEPTH_CONFIRMACION_VIDA = 9800;

export function mostrarConfirmacionVida(escena, {
  id,
  tiempoMaximo = 5000,
  onResponder,
} = {}) {
  if (!escena?.add || !id) return { cerrar() {} };

  const { width, height } = escena.scale;
  const contenedor = escena.add.container(0, 0)
    .setScrollFactor(0)
    .setDepth(DEPTH_CONFIRMACION_VIDA);
  const fondo = escena.add.rectangle(
    width / 2,
    height / 2,
    width,
    height,
    0x080808,
    0.96,
  ).setInteractive();
  const titulo = escena.add.text(width / 2, height * 0.4, '¿SIGUES VIVO?', {
    fontFamily: 'Impact, Arial Black, Arial',
    fontSize: '52px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 6,
  }).setOrigin(0.5);
  const cuenta = escena.add.text(width / 2, height * 0.49, '', {
    fontFamily: 'Arial',
    fontSize: '25px',
    color: '#ffcf66',
  }).setOrigin(0.5);
  const boton = escena.add.rectangle(width / 2, height * 0.62, 260, 86, 0x227a3b, 1)
    .setStrokeStyle(4, 0xffffff)
    .setInteractive({ useHandCursor: true });
  const textoBoton = escena.add.text(width / 2, height * 0.62, 'SÍ, SIGO VIVO', {
    fontFamily: 'Arial',
    fontSize: '24px',
    color: '#ffffff',
  }).setOrigin(0.5);
  contenedor.add([fondo, titulo, cuenta, boton, textoBoton]);

  const inicio = Date.now();
  let cerrado = false;
  let respondido = false;
  const actualizarCuenta = () => {
    const restante = Math.max(0, tiempoMaximo - (Date.now() - inicio));
    cuenta.setText(`Responde en ${(restante / 1000).toFixed(1)} s`);
    if (restante <= 0) {
      boton.disableInteractive();
      boton.setAlpha(0.35);
      textoBoton.setAlpha(0.35);
    }
  };
  const reloj = escena.time.addEvent({
    delay: 100,
    loop: true,
    callback: actualizarCuenta,
  });

  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    reloj.remove(false);
    escena.input?.keyboard?.off('keydown-ENTER', responder);
    contenedor.destroy(true);
  };
  const responder = () => {
    if (respondido || Date.now() - inicio >= tiempoMaximo) return;
    respondido = true;
    onResponder?.(id);
    cerrar();
  };

  fondo.on('pointerdown', (_pointer, _x, _y, event) => event?.stopPropagation?.());
  boton.on('pointerdown', (pointer) => {
    pointer.event?.stopPropagation?.();
    responder();
  });
  escena.input?.keyboard?.on('keydown-ENTER', responder);
  actualizarCuenta();

  return { cerrar };
}
