/**
 * Lado izquierdo del panel (página izquierda de panel.png):
 *   - foto dentro del recuadro gris de referencia
 *   - barra de vida por imágenes (llena sobre vacía)
 *   - texto Vida actual - máxima
 *   - tooltip de descripción (caja marrón)
 *   - dos botones marrones
 *
 * Recibe rectángulos ya calculados (en coords locales del container del panel)
 * para cada bloque, alineados con el dibujo del fondo.
 */

import { crearBarraVidaImagen } from '../BarraVida/index.js';
import { crearTexto, medirTexto } from '../GenerarTexto/index.js';
import { ASSETS, DEPTHS, LADO_IZQUIERDO, claveTexturaImagen } from '../panelEntidadConfig.js';
import { crearTooltipDescripcion } from './tooltipDescripcion.js';
import { crearBotonMarron } from './cajaMarron.js';

function intentarCargarImagen(scene, ruta, onCargada) {
  if (!ruta) return null;
  const clave = claveTexturaImagen(ruta);
  if (scene.textures.exists(clave)) {
    onCargada(clave);
    return clave;
  }
  scene.load.image(clave, ruta);
  scene.load.once('complete', () => {
    if (scene.textures.exists(clave)) onCargada(clave);
  });
  if (!scene.load.isLoading()) scene.load.start();
  return clave;
}

export function crearLadoIzquierdo(scene, opciones) {
  const { padre, rects, datosIniciales, onIrAInicial, onHistorial } = opciones;

  const container = scene.add.container(0, 0);
  container.setDepth(DEPTHS.contenido);
  padre.add(container);

  // ── Foto en el recuadro gris ───────────────────────────────────────────
  const f = rects.foto;
  let fotoImg = null;
  const fijarFoto = (ruta) => {
    if (fotoImg) {
      fotoImg.destroy();
      fotoImg = null;
    }
    if (!ruta) return;
    intentarCargarImagen(scene, ruta, (clave) => {
      fotoImg = scene.add.image(f.x + f.ancho / 2, f.y + f.alto / 2, clave);
      fotoImg.setDisplaySize(f.ancho * 0.92, f.alto * 0.92);
      fotoImg.setDepth(DEPTHS.contenido + 1);
      container.add(fotoImg);
    });
  };

  const tv = rects.textoVida;
  let textoVida = null;
  const hpNoNegativo = (valor, minimo = 0) => {
    const n = Number(valor);
    if (!Number.isFinite(n)) return minimo;
    return Math.max(0, n);
  };

  // ── Barra de vida (imagen) ─────────────────────────────────────────────
  const b = rects.barra;
  const barra = crearBarraVidaImagen(scene, {
    x: b.x,
    y: b.y,
    ancho: b.ancho,
    alto: b.alto,
    claveLlena: ASSETS.barraLlena.clave,
    claveVacia: ASSETS.barraVacia.clave,
    vidaActual: hpNoNegativo(datosIniciales?.vida?.vidaActual),
    vidaMaxima: hpNoNegativo(datosIniciales?.vida?.vidaMaxima, 1),
    origen: 0,
    depth: DEPTHS.contenido + 1,
  });
  container.add(barra);

  const fijarTextoVida = (vidaActual, vidaMaxima) => {
    if (textoVida) {
      textoVida.destroy();
      textoVida = null;
    }
    textoVida = crearTexto(scene, `${hpNoNegativo(vidaActual)} - ${hpNoNegativo(vidaMaxima, 1)}`, {
      x: tv.x + tv.ancho / 2,
      y: tv.y + tv.alto / 2,
      estilo: LADO_IZQUIERDO.textoVidaEstilo,
      escala: LADO_IZQUIERDO.textoVidaEscala,
      origen: { x: 0.5, y: 0.5 },
      depth: DEPTHS.contenido + 2,
    });
    container.add(textoVida);
  };

  // ── Tooltip de descripción ─────────────────────────────────────────────
  const tt = rects.tooltip;
  const tooltip = crearTooltipDescripcion(scene, {
    x: tt.x,
    y: tt.y,
    ancho: tt.ancho,
    alto: tt.alto,
    padre: container,
    medirTexto,
  });

  // ── Botones marrones ───────────────────────────────────────────────────
  const bt = rects.botones;
  const gap = LADO_IZQUIERDO.botonGap;
  const botonAncho = (bt.ancho - gap) / 2;
  const botonAlto = Math.min(LADO_IZQUIERDO.botonAlto, bt.alto);

  const btnInicial = crearBotonMarron(scene, {
    x: bt.x,
    y: bt.y,
    ancho: botonAncho,
    alto: botonAlto,
    texto: 'Ir a inicial',
    estilo: LADO_IZQUIERDO.botonTextoEstilo,
    escala: LADO_IZQUIERDO.botonTextoEscala,
    onClick: onIrAInicial,
  });
  container.add(btnInicial);

  const btnHistorial = crearBotonMarron(scene, {
    x: bt.x + botonAncho + gap,
    y: bt.y,
    ancho: botonAncho,
    alto: botonAlto,
    texto: 'Historial',
    estilo: LADO_IZQUIERDO.botonTextoEstilo,
    escala: LADO_IZQUIERDO.botonTextoEscala,
    onClick: onHistorial,
  });
  container.add(btnHistorial);

  fijarFoto(datosIniciales?.foto);
  fijarTextoVida(
    datosIniciales?.vida?.vidaActual ?? 0,
    datosIniciales?.vida?.vidaMaxima ?? 1,
  );

  return {
    container,
    tooltip,

    actualizar(nuevosDatos) {
      if (nuevosDatos?.foto !== undefined) {
        fijarFoto(nuevosDatos.foto);
      }
      if (nuevosDatos?.vida) {
        const { vidaActual, vidaMaxima } = nuevosDatos.vida;
        barra.actualizarVida(hpNoNegativo(vidaActual), hpNoNegativo(vidaMaxima, 1));
        fijarTextoVida(vidaActual, vidaMaxima);
      }
    },
  };
}
