import { ESTILOS_TEXTO } from './textoPixelConfig.js';

const TODOS_ESTILOS = { ...ESTILOS_TEXTO };
const FRAMES_REGISTRADOS = new Set();
const ESTILO_DEFECTO = 'panel';

let secuenciaCanvas = 0;

function normalizarTexto(texto) {
  return String(texto ?? '').toUpperCase();
}

function nombreFrameLetra(estilo, char) {
  return `tp_${estilo.textura}_a${char.charCodeAt(0)}`;
}

function resolverOrigen(origen) {
  if (origen == null) return { x: 0, y: 0 };
  if (typeof origen === 'number') return { x: origen, y: origen };
  return { x: origen.x ?? 0, y: origen.y ?? 0 };
}

/**
 * Métricas enteras de celda y paso. Escala fraccionaria (1.5) se redondea
 * aquí para que wrap y dibujo usen el mismo grid y no se desfasen por línea.
 */
function metricasDibujo(estilo, opciones = {}) {
  const escala = opciones.escala ?? 2;
  const espaciado = opciones.espaciado ?? 0;
  const espacioLinea = opciones.espacioLinea ?? 1;
  const celdaW = Math.round(estilo.anchoCelda * escala);
  const celdaH = Math.round(estilo.altoCelda * escala);
  const pasoX = celdaW + Math.round(espaciado * escala);
  const pasoY = celdaH + Math.round(espacioLinea * escala);
  return {
    escala,
    celdaW,
    celdaH,
    pasoX,
    pasoY,
    anchoEspacio: pasoX * 0.5,
    tint: opciones.tint ?? estilo.tint ?? null,
  };
}

function medirConMetricas(texto, metricas) {
  const lineas = normalizarTexto(texto).split('\n');
  let anchoMax = 0;

  lineas.forEach((linea) => {
    let w = 0;
    for (const char of linea) {
      w += char === ' ' ? metricas.anchoEspacio : metricas.pasoX;
    }
    anchoMax = Math.max(anchoMax, w);
  });

  return {
    ancho: anchoMax,
    alto: lineas.length * metricas.pasoY,
  };
}

/**
 * Registra cada carácter ASCII (32–126) como frame dentro de la textura,
 * según la rejilla de columnas declarada en el estilo.
 */
export function registrarFramesEstilo(scene, estilo) {
  if (!estilo || !scene.textures.exists(estilo.textura)) return false;

  const id = `${estilo.textura}_ascii`;
  if (FRAMES_REGISTRADOS.has(id)) return true;

  const tex = scene.textures.get(estilo.textura);
  if (!tex) return false;

  const cols = estilo.columnas ?? 16;
  for (let code = 32; code <= 126; code++) {
    const frameName = nombreFrameLetra(estilo, String.fromCharCode(code));
    if (tex.has(frameName)) continue;
    const col = code % cols;
    const fila = Math.floor(code / cols);
    tex.add(frameName, 0, col * estilo.anchoCelda, fila * estilo.altoCelda, estilo.anchoCelda, estilo.altoCelda);
  }

  FRAMES_REGISTRADOS.add(id);
  return true;
}

export function registrarTodosLosFramesTexto(scene) {
  let ok = false;
  for (const estilo of Object.values(TODOS_ESTILOS)) {
    if (scene.textures.exists(estilo.textura)) {
      ok = registrarFramesEstilo(scene, estilo) || ok;
    }
  }
  return ok;
}

export function precargarTextoPixel(scene, nombreEstilo = ESTILO_DEFECTO) {
  const estilo = TODOS_ESTILOS[nombreEstilo];
  if (!estilo) {
    console.warn(`textoPixel: estilo "${nombreEstilo}" no existe.`);
    return;
  }
  if (!scene.textures.exists(estilo.textura)) {
    scene.load.image(estilo.textura, estilo.archivo);
  }
}

export function precargarTodosLosTextos(scene) {
  const cargados = new Set();
  for (const estilo of Object.values(TODOS_ESTILOS)) {
    if (cargados.has(estilo.textura)) continue;
    cargados.add(estilo.textura);
    if (!scene.textures.exists(estilo.textura)) {
      scene.load.image(estilo.textura, estilo.archivo);
    }
  }
}

function cssDeTint(tint) {
  return `#${(Number(tint) >>> 0).toString(16).padStart(6, '0')}`;
}

function pintarCadenaEnCanvas(scene, texto, estilo, metricas) {
  const medidas = medirConMetricas(texto, metricas);
  const ancho = Math.max(1, Math.ceil(medidas.ancho));
  const alto = Math.max(1, Math.ceil(medidas.alto) || metricas.celdaH);
  const clave = `tpCanvas_${++secuenciaCanvas}`;
  const canvasTex = scene.textures.createCanvas(clave, ancho, alto);
  if (!canvasTex) return { clave: null, ancho: 0, alto: 0, medidas };

  const ctx = canvasTex.getContext();
  ctx.imageSmoothingEnabled = false;

  const src = scene.textures.get(estilo.textura).getSourceImage();
  const cols = estilo.columnas ?? 16;
  const lineas = normalizarTexto(texto).split('\n');

  lineas.forEach((linea, indiceLinea) => {
    let cursorX = 0;
    const y = indiceLinea * metricas.pasoY;
    for (const char of linea) {
      if (char === ' ') {
        cursorX += metricas.anchoEspacio;
        continue;
      }
      let code = char.charCodeAt(0);
      if (code < 32 || code > 126) code = 63;
      const sx = (code % cols) * estilo.anchoCelda;
      const sy = Math.floor(code / cols) * estilo.altoCelda;
      ctx.drawImage(
        src,
        sx,
        sy,
        estilo.anchoCelda,
        estilo.altoCelda,
        Math.round(cursorX),
        Math.round(y),
        metricas.celdaW,
        metricas.celdaH
      );
      cursorX += metricas.pasoX;
    }
  });

  if (metricas.tint != null) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = cssDeTint(metricas.tint);
    ctx.fillRect(0, 0, ancho, alto);
    ctx.globalCompositeOperation = 'source-over';
  }

  canvasTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  canvasTex.refresh();
  return { clave, ancho, alto, medidas };
}

export function crearTexto(scene, texto, opciones = {}) {
  const estiloNombre = opciones.estilo ?? ESTILO_DEFECTO;
  const estilo = TODOS_ESTILOS[estiloNombre];
  const x = Math.round(opciones.x ?? 0);
  const y = Math.round(opciones.y ?? 0);

  if (!estilo) {
    console.warn(`textoPixel: estilo "${estiloNombre}" no existe.`);
    return scene.add.container(x, y);
  }

  if (!scene.textures.exists(estilo.textura)) {
    console.warn(
      `textoPixel: textura "${estilo.textura}" no cargada. Llama precargarTextoPixel() en preload.`
    );
    return scene.add.container(x, y);
  }

  const container = scene.add.container(x, y);
  container.setDepth(opciones.depth ?? 0);
  container.anchoTexto = 0;
  container.altoTexto = 0;

  const plano = normalizarTexto(texto);
  if (plano.length === 0) return container;

  const metricas = metricasDibujo(estilo, opciones);
  const pintado = pintarCadenaEnCanvas(scene, plano, estilo, metricas);
  if (!pintado.clave) return container;

  const origen = resolverOrigen(opciones.origen);
  const img = scene.make.image({
    x: Math.round(-pintado.ancho * origen.x),
    y: Math.round(-pintado.alto * origen.y),
    key: pintado.clave,
    add: false,
  });
  img.setOrigin(0, 0);
  container.add(img);
  container.anchoTexto = pintado.medidas.ancho;
  container.altoTexto = pintado.medidas.alto;

  container.once('destroy', () => {
    if (pintado.clave && scene.textures?.exists(pintado.clave)) {
      scene.textures.remove(pintado.clave);
    }
  });

  return container;
}

export function medirTexto(texto, opciones = {}) {
  const estiloNombre = opciones.estilo ?? ESTILO_DEFECTO;
  const estilo = TODOS_ESTILOS[estiloNombre];
  if (!estilo) return { ancho: 0, alto: 0 };
  return medirConMetricas(texto, metricasDibujo(estilo, opciones));
}

export { ESTILOS_TEXTO };
