import { ESTILOS_TEXTO } from './textoPixelConfig.js';

const TODOS_ESTILOS = { ...ESTILOS_TEXTO };
const FRAMES_REGISTRADOS = new Set();
const ESTILO_DEFECTO = 'panel';

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

function medidasCelda(estilo, escala) {
  return {
    ancho: estilo.anchoCelda * escala,
    alto: estilo.altoCelda * escala,
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

function aplicarOrigenAlContenedor(container, origen, estilo, escala) {
  const { ancho: celdaW, alto: celdaH } = medidasCelda(estilo, escala);
  const { x: origenX, y: origenY } = resolverOrigen(origen);

  const hijos = container.list.filter((c) => c?.active !== false);
  if (hijos.length === 0) return { ancho: 0, alto: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  hijos.forEach((child) => {
    minX = Math.min(minX, child.x);
    minY = Math.min(minY, child.y);
    maxX = Math.max(maxX, child.x + celdaW);
    maxY = Math.max(maxY, child.y + celdaH);
  });

  const ancho = maxX - minX;
  const alto = maxY - minY;

  if (origenX !== 0 || origenY !== 0) {
    const dx = minX + ancho * origenX;
    const dy = minY + alto * origenY;
    hijos.forEach((child) => {
      child.x = Math.round(child.x - dx);
      child.y = Math.round(child.y - dy);
    });
  }

  return { ancho, alto };
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

export function crearTexto(scene, texto, opciones = {}) {
  const estiloNombre = opciones.estilo ?? ESTILO_DEFECTO;
  const estilo = TODOS_ESTILOS[estiloNombre];

  if (!estilo) {
    console.warn(`textoPixel: estilo "${estiloNombre}" no existe.`);
    return scene.add.container(opciones.x ?? 0, opciones.y ?? 0);
  }

  if (!scene.textures.exists(estilo.textura)) {
    console.warn(
      `textoPixel: textura "${estilo.textura}" no cargada. Llama precargarTextoPixel() en preload.`
    );
    return scene.add.container(opciones.x ?? 0, opciones.y ?? 0);
  }

  if (!registrarFramesEstilo(scene, estilo)) {
    console.warn(`textoPixel: no se pudieron registrar frames de ${estilo.textura}`);
    return scene.add.container(opciones.x ?? 0, opciones.y ?? 0);
  }

  const escala = opciones.escala ?? 2;
  const espaciado = opciones.espaciado ?? 0;
  const espacioLinea = opciones.espacioLinea ?? 1;
  const tint = opciones.tint ?? estilo.tint ?? null;
  const { ancho: celdaW, alto: celdaH } = medidasCelda(estilo, escala);
  const pasoX = celdaW + espaciado * escala;
  const pasoY = celdaH + espacioLinea * escala;
  const anchoEspacio = pasoX * 0.5;

  const container = scene.add.container(opciones.x ?? 0, opciones.y ?? 0);
  container.setDepth(opciones.depth ?? 0);

  const lineas = normalizarTexto(texto).split('\n');
  const tex = scene.textures.get(estilo.textura);

  lineas.forEach((linea, indiceLinea) => {
    let cursorX = 0;

    for (const char of linea) {
      if (char === ' ') {
        cursorX += anchoEspacio;
        continue;
      }

      let code = char.charCodeAt(0);
      if (code < 32 || code > 126) code = 63; // '?'
      const frameName = nombreFrameLetra(estilo, String.fromCharCode(code));
      if (!tex.has(frameName)) continue;

      const letra = scene.make.image({
        x: Math.round(cursorX),
        y: Math.round(indiceLinea * pasoY),
        key: estilo.textura,
        frame: frameName,
        add: false,
      });
      letra.setOrigin(0, 0);
      letra.setScale(escala);
      if (tint != null) letra.setTint(tint);

      container.add(letra);
      cursorX += pasoX;
    }
  });

  if (container.list.length === 0 && normalizarTexto(texto).trim().length > 0) {
    console.warn(`textoPixel: sin letras para "${texto}" (estilo ${estiloNombre})`);
  }

  const medidas = aplicarOrigenAlContenedor(container, opciones.origen, estilo, escala);
  container.anchoTexto = medidas.ancho;
  container.altoTexto = medidas.alto;

  return container;
}

export function medirTexto(texto, opciones = {}) {
  const estiloNombre = opciones.estilo ?? ESTILO_DEFECTO;
  const estilo = TODOS_ESTILOS[estiloNombre];
  if (!estilo) return { ancho: 0, alto: 0 };

  const escala = opciones.escala ?? 2;
  const espaciado = opciones.espaciado ?? 0;
  const espacioLinea = opciones.espacioLinea ?? 1;
  const { ancho: celdaW, alto: celdaH } = medidasCelda(estilo, escala);
  const pasoX = celdaW + espaciado * escala;
  const pasoY = celdaH + espacioLinea * escala;
  const anchoEspacio = pasoX * 0.5;

  const lineas = normalizarTexto(texto).split('\n');
  let anchoMax = 0;

  lineas.forEach((linea) => {
    let w = 0;
    for (const char of linea) {
      w += char === ' ' ? anchoEspacio : pasoX;
    }
    anchoMax = Math.max(anchoMax, w);
  });

  return {
    ancho: anchoMax,
    alto: lineas.length * pasoY,
  };
}

export { ESTILOS_TEXTO };
