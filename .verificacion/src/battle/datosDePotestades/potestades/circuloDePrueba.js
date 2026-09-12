/**
 * potestades/circuloDePrueba.js — El cuerpo provisional de toda potestad.
 *
 * SPECT: docs/spects/spect006.md
 *
 * QUE ES: mientras no haya spritesheets dibujados, una potestad se ve como un
 * circulo del color de su familia, con un anillo del color de su bando y su
 * nombre encima. Este archivo fabrica esa textura y su animacion de latido.
 *
 * POR QUE UNA TEXTURA GENERADA Y NO UN Graphics: el tablero coloca potestades
 * con `crearSprite` de PotestadesTablero, que hace `escena.add.sprite(...)` y
 * necesita una textura registrada. Generando un spritesheet real en memoria,
 * el circulo entra por la misma tuberia que entrara el spritesheet definitivo
 * y no hay que tocar nada del spect 003 hoy ni el dia que se dibujen.
 *
 * POR QUE UN SPRITESHEET Y NO UN TWEEN: un tween de escala seria mas corto,
 * pero viviria en el show (spect 007) y cada consumidor tendria que acordarse
 * de lanzarlo. Un spritesheet de 8 fotogramas lo reproduce el AnimationManager
 * solo, que es exactamente lo que `construirAnimaciones` promete en el
 * contrato del spect 006.
 *
 * El "latido" es el radio oscilando en un seno completo: el fotograma 8
 * enlaza con el 0 sin salto, asi que el bucle no se nota.
 */

const LADO = 256;
const FOTOGRAMAS = 8;
const RADIO_BASE = 92;
const AMPLITUD = 7;
const GROSOR_ANILLO = 12;

// El anillo dice de quien es la potestad. Es lo unico que distingue tu circulo
// del circulo identico del rival, asi que en multijugador no es decoracion.
const ANILLO_POR_BANDO = {
  Aliados: 0x7ed4ff,
  Enemigos: 0xff6b6b,
};

const ANILLO_POR_DEFECTO = 0xf5d68a;

function aCss(entero) {
  return `#${(Number(entero) >>> 0).toString(16).padStart(6, '0')}`;
}

export function claveDeTextura(arquetipo, bando) {
  return `circulo_${String(arquetipo).toLowerCase()}_${String(bando).toLowerCase()}`;
}

export function claveDeAnimacion(arquetipo, bando) {
  return `${claveDeTextura(arquetipo, bando)}_latido`;
}

export function descriptorDeSpritesheet(arquetipo) {
  // `archivo` es null a proposito: esta textura no se carga de disco, se
  // fabrica. Quien precargue assets debe saltarse las que no tienen archivo.
  return { clave: `circulo_${String(arquetipo).toLowerCase()}`, archivo: null, ancho: LADO, alto: LADO };
}

export function definicionDeLatido(arquetipo, bando) {
  return {
    key: claveDeAnimacion(arquetipo, bando),
    startFrame: 0,
    endFrame: FOTOGRAMAS - 1,
    frameRate: 8,
    repeat: -1,
  };
}

export function configEstaticaDeCirculo(arquetipo, bando) {
  return {
    plantillaSprite: { textureKey: claveDeTextura(arquetipo, bando), frame: 0, escala: 1 },
    animKey: claveDeAnimacion(arquetipo, bando),
  };
}

function dibujarFotograma(ctx, indice, { relleno, anillo, etiqueta }) {
  const fase = (indice / FOTOGRAMAS) * Math.PI * 2;
  const radio = RADIO_BASE + Math.sin(fase) * AMPLITUD;
  const cx = indice * LADO + LADO / 2;
  const cy = LADO / 2;

  ctx.beginPath();
  ctx.arc(cx, cy, radio, 0, Math.PI * 2);
  ctx.fillStyle = relleno;
  ctx.fill();
  ctx.lineWidth = GROSOR_ANILLO;
  ctx.strokeStyle = anillo;
  ctx.stroke();

  ctx.fillStyle = '#101010';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(etiqueta).toUpperCase(), cx, cy);
}

/**
 * Deja la textura y la animacion listas en la escena. Idempotente: se puede
 * llamar por cada potestad aunque tres compartan familia y bando.
 */
export function asegurarCirculo(escena, { arquetipo, bando, color }) {
  if (!escena?.textures) return null;

  const clave = claveDeTextura(arquetipo, bando);
  if (!escena.textures.exists(clave)) {
    const textura = escena.textures.createCanvas(clave, LADO * FOTOGRAMAS, LADO);
    if (!textura) return null;

    const ctx = textura.getContext();
    const opciones = {
      relleno: aCss(color),
      anillo: aCss(ANILLO_POR_BANDO[bando] ?? ANILLO_POR_DEFECTO),
      etiqueta: arquetipo,
    };
    for (let i = 0; i < FOTOGRAMAS; i += 1) dibujarFotograma(ctx, i, opciones);
    textura.refresh();

    // La tira dibujada es una sola imagen: aqui se recorta en fotogramas para
    // que `generateFrameNumbers` la vea como el spritesheet que aparenta ser.
    for (let i = 0; i < FOTOGRAMAS; i += 1) textura.add(i, 0, i * LADO, 0, LADO, LADO);
  }

  const definicion = definicionDeLatido(arquetipo, bando);
  if (escena.anims && !escena.anims.exists(definicion.key)) {
    escena.anims.create({
      key: definicion.key,
      frames: escena.anims.generateFrameNumbers(clave, {
        start: definicion.startFrame,
        end: definicion.endFrame,
      }),
      frameRate: definicion.frameRate,
      repeat: definicion.repeat,
    });
  }

  return clave;
}
