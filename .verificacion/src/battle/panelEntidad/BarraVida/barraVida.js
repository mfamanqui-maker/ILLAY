import { BARRA_VIDA } from './barraVidaConfig.js';

/**
 * @param {Phaser.Scene} scene
 */
export function precargarBarraVida(scene, config = BARRA_VIDA) {
  if (!scene.textures.exists(config.textura)) {
    scene.load.image(config.textura, config.archivo);
  }
}

function ratioVida(vidaActual, vidaMaxima) {
  if (vidaMaxima <= 0) return 0;
  return Phaser.Math.Clamp(vidaActual / vidaMaxima, 0, 1);
}

function aplicarRelleno(relleno, zona, escala, baseX, baseY, vidaActual, vidaMaxima) {
  const t = ratioVida(vidaActual, vidaMaxima);
  const anchoTotal = zona.ancho * escala;
  const alto = zona.alto * escala;
  const anchoVisible = anchoTotal * t;

  relleno.setSize(anchoVisible, alto);
  relleno.setDisplaySize(anchoVisible, alto);
  relleno.x = baseX + zona.x * escala + anchoVisible / 2;
  relleno.y = baseY + zona.y * escala + alto / 2;
  relleno.setVisible(anchoVisible > 0.5);
}

/**
 * Barra de vida solo con rectángulos (sin imagen de corazón/fondo).
 */
export function crearBarraVidaRect(scene, opciones = {}) {
  const ancho = opciones.ancho ?? 280;
  const alto = opciones.alto ?? 32;
  const origen = opciones.origen ?? 0;
  let vidaMaxima = opciones.vidaMaxima ?? 1;
  let vidaActual = opciones.vidaActual ?? vidaMaxima;

  const colorFondo = opciones.colorFondo ?? 0x1a1a1a;
  const colorRelleno = opciones.colorRelleno ?? 0xcc2222;
  const grosorBorde = opciones.grosorBorde ?? 2;
  const colorBorde = opciones.colorBorde ?? 0x0a0a0a;

  const container = scene.add.container(opciones.x ?? 0, opciones.y ?? 0);
  container.setDepth(opciones.depth ?? 0);

  const fondo = scene.add.rectangle(0, 0, ancho, alto, colorFondo);
  fondo.setOrigin(origen, 0.5);
  fondo.setStrokeStyle(grosorBorde, colorBorde);
  fondo.setDepth(0);

  const relleno = scene.add.rectangle(0, 0, ancho, alto, colorRelleno);
  relleno.setOrigin(0, 0.5);
  relleno.setDepth(1);

  const baseX = origen === 0.5 ? -ancho / 2 : 0;

  const actualizarRelleno = () => {
    const t = ratioVida(vidaActual, vidaMaxima);
    const anchoVisible = Math.max(ancho * t, 0);
    relleno.width = anchoVisible;
    relleno.height = alto - grosorBorde * 2;
    relleno.x = baseX;
    relleno.y = 0;
    relleno.setVisible(anchoVisible > 0.5);
  };

  container.add([fondo, relleno]);
  actualizarRelleno();

  container.actualizarVida = (nuevaActual, nuevaMaxima) => {
    if (nuevaMaxima != null) vidaMaxima = nuevaMaxima;
    if (nuevaActual != null) vidaActual = nuevaActual;
    actualizarRelleno();
    return container;
  };

  container.obtenerVida = () => ({ vidaActual, vidaMaxima });
  container.fondo = fondo;
  container.relleno = relleno;

  return container;
}

/**
 * Barra de vida por imágenes: dibuja la barra vacía (Barra_de_vida2) de fondo y
 * revela la barra llena (barraDeVida) recortándola de izquierda a derecha según
 * la proporción de vida. Ambas comparten forma y tamaño nativos.
 */
export function crearBarraVidaImagen(scene, opciones = {}) {
  const { claveLlena, claveVacia } = opciones;
  const origen = opciones.origen ?? 0;
  let vidaMaxima = opciones.vidaMaxima ?? 1;
  let vidaActual = opciones.vidaActual ?? vidaMaxima;

  if (!claveLlena || !claveVacia || !scene.textures.exists(claveLlena) || !scene.textures.exists(claveVacia)) {
    return crearBarraVidaRect(scene, {
      x: opciones.x,
      y: opciones.y,
      ancho: opciones.ancho ?? 200,
      alto: opciones.alto ?? 28,
      vidaActual,
      vidaMaxima,
      origen,
      depth: opciones.depth,
    });
  }

  const fuente = scene.textures.get(claveVacia).getSourceImage();
  const natW = fuente.width;
  const natH = fuente.height;
  const ancho = opciones.ancho ?? natW;
  const alto = opciones.alto ?? natH;

  const container = scene.add.container(opciones.x ?? 0, opciones.y ?? 0);
  container.setDepth(opciones.depth ?? 0);

  const baseX = origen === 0.5 ? -ancho / 2 : 0;
  const baseY = origen === 0.5 ? -alto / 2 : 0;

  const vacia = scene.add.image(baseX, baseY, claveVacia).setOrigin(0, 0);
  vacia.setDisplaySize(ancho, alto);
  const llena = scene.add.image(baseX, baseY, claveLlena).setOrigin(0, 0);
  llena.setDisplaySize(ancho, alto);
  container.add([vacia, llena]);

  const actualizar = () => {
    const t = ratioVida(vidaActual, vidaMaxima);
    const recorte = natW * t;
    llena.setCrop(0, 0, recorte, natH);
    llena.setVisible(recorte > 0.5);
  };
  actualizar();

  container.actualizarVida = (nuevaActual, nuevaMaxima) => {
    if (nuevaMaxima != null) vidaMaxima = nuevaMaxima;
    if (nuevaActual != null) vidaActual = nuevaActual;
    actualizar();
    return container;
  };
  container.obtenerVida = () => ({ vidaActual, vidaMaxima });
  container.lleno = llena;
  container.vacio = vacia;
  return container;
}

/**
 * Crea una barra de vida con fondo barraDeVida.png y relleno rojo proporcional.
 */
export function crearBarraVida(scene, opciones) {
  const config = { ...BARRA_VIDA, ...opciones.config };
  const zona = { ...config.zonaRelleno, ...opciones.zonaRelleno };
  const escala = opciones.escala ?? 1;
  const origen = opciones.origen ?? 0.5;

  let vidaMaxima = opciones.vidaMaxima ?? 1;
  let vidaActual = opciones.vidaActual ?? vidaMaxima;

  if (opciones.soloRectangulos) {
    return crearBarraVidaRect(scene, {
      x: opciones.x,
      y: opciones.y,
      ancho: opciones.ancho ?? zona.ancho * escala,
      alto: opciones.alto ?? zona.alto * escala,
      vidaActual,
      vidaMaxima,
      origen: opciones.origen,
      depth: opciones.depth,
      colorRelleno: config.colorRelleno,
    });
  }

  if (!scene.textures.exists(config.textura)) {
    console.warn('barraVida: textura no cargada. Llama precargarBarraVida() en preload.');
    return crearBarraVidaRect(scene, {
      x: opciones.x,
      y: opciones.y,
      ancho: opciones.ancho ?? 200,
      alto: opciones.alto ?? 28,
      vidaActual,
      vidaMaxima,
      origen: opciones.origen,
      depth: opciones.depth,
    });
  }

  const container = scene.add.container(opciones.x ?? 0, opciones.y ?? 0);
  container.setDepth(opciones.depth ?? 0);

  const fondo = scene.add.image(0, 0, config.textura);
  fondo.setOrigin(origen, origen);
  fondo.setScale(escala);
  fondo.setDepth(0);

  const relleno = scene.add.rectangle(0, 0, zona.ancho, zona.alto, config.colorRelleno);
  relleno.setOrigin(0.5, 0.5);
  relleno.setDepth(1);

  const anchoEsc = config.anchoImagen * escala;
  const altoEsc = config.altoImagen * escala;
  const baseX = origen === 0.5 ? -anchoEsc / 2 : 0;
  const baseY = origen === 0.5 ? -altoEsc / 2 : 0;

  container.add([fondo, relleno]);

  aplicarRelleno(relleno, zona, escala, baseX, baseY, vidaActual, vidaMaxima);

  container.actualizarVida = (nuevaActual, nuevaMaxima) => {
    if (nuevaMaxima != null) vidaMaxima = nuevaMaxima;
    if (nuevaActual != null) vidaActual = nuevaActual;
    aplicarRelleno(relleno, zona, escala, baseX, baseY, vidaActual, vidaMaxima);
    return container;
  };

  container.obtenerVida = () => ({ vidaActual, vidaMaxima });
  container.fondo = fondo;
  container.relleno = relleno;

  return container;
}

export { BARRA_VIDA };
