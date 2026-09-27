import { crearListaScrollable } from '../../panelEntidad/partes/listaScrollable.js';
import {
  COLOR_ALIADOS,
  COLOR_BORDE,
  COLOR_BOTON,
  COLOR_ENEMIGOS,
  COLOR_TEXTO,
} from './estilosHistorial.js';

const PADDING = 16;

function mapaArquetiposDelTurno(turno) {
  const mapa = new Map();
  [...(turno?.aliados ?? []), ...(turno?.enemigos ?? [])].forEach((p) => {
    if (p.idPotestad == null) return;
    const nombre = p.arquetipo ?? p.etiqueta ?? null;
    if (nombre) mapa.set(String(p.idPotestad), String(nombre));
  });
  return mapa;
}

function textoObjetivo(idObjetivo, mapaArquetipos) {
  if (idObjetivo == null) return '';
  if (typeof idObjetivo === 'object' && Number.isFinite(Number(idObjetivo.x))) {
    return `casilla (${idObjetivo.x}, ${idObjetivo.y})`;
  }
  const clave = String(idObjetivo);
  return mapaArquetipos?.get(clave) ?? clave;
}

function textoEfecto(efecto) {
  if (!efecto || typeof efecto !== 'object') return '';
  const partes = [];
  if (efecto.hp != null) {
    const n = Number(efecto.hp);
    partes.push(`HP ${n > 0 ? '+' : ''}${n}`);
  }
  if (efecto.escudos != null) {
    const n = Number(efecto.escudos);
    partes.push(`escudos ${n > 0 ? '+' : ''}${n}`);
  }
  if (efecto.posicion) partes.push(`→ (${efecto.posicion.x}, ${efecto.posicion.y})`);
  return partes.join(', ');
}

function textoAccion(accion, mapaArquetipos) {
  if (typeof accion === 'string') return accion;
  const nombre = accion?.nombre ?? 'accion';
  const dest = textoObjetivo(accion?.idObjetivo, mapaArquetipos);
  const efecto = textoEfecto(accion?.efecto);
  const cuerpo = [nombre, dest && `→ ${dest}`, efecto && `(${efecto})`].filter(Boolean).join(' ');
  return accion?.cancelada ? `(cancelada) ${cuerpo}` : cuerpo;
}

function bloquePotestad(scene, x, y, ancho, potestad, colorBando, mapaArquetipos) {
  const cont = scene.add.container(x, y);
  cont.setScrollFactor(0);

  const hp = potestad.hp ?? potestad.estadisticas?.hp ?? 0;
  const hpMax = potestad.hpMax ?? potestad.estadisticas?.hpMax ?? hp;
  const acciones = potestad.acciones ?? [];
  const lineasAccion = acciones.length
    ? acciones.map((a) => `· ${textoAccion(a, mapaArquetipos)}`)
    : ['· (sin acciones)'];

  const nombreVisible = potestad.arquetipo ?? potestad.etiqueta ?? 'Potestad';
  const encabezado = `${nombreVisible}  Nv.${potestad.nivel ?? '?'}  HP ${hp}/${hpMax}`;
  const cuerpo = scene.add.text(PADDING, PADDING, [encabezado, ...lineasAccion].join('\n'), {
    fontFamily: 'Arial',
    fontSize: 16,
    color: COLOR_TEXTO,
    wordWrap: { width: ancho - PADDING * 2, useAdvancedWrap: true },
    lineSpacing: 8,
    padding: { left: 2, right: 8, top: 2, bottom: 8 },
  });
  cuerpo.setOrigin(0, 0);
  cuerpo.setScrollFactor(0);
  cuerpo.updateText();
  cont.add(cuerpo);

  const alto = Math.max(Math.ceil(cuerpo.height) + PADDING * 2, 64);
  const fondo = scene.add.rectangle(ancho / 2, alto / 2, ancho, alto, COLOR_BOTON, 1);
  fondo.setStrokeStyle(2, colorBando, 1);
  fondo.setScrollFactor(0);
  cont.addAt(fondo, 0);

  return { contenedor: cont, alto: alto + 14 };
}

function opcionesLista(scene, x, y, ancho, alto, padre) {
  return {
    x,
    y,
    ancho,
    alto,
    padre,
    depth: 2,
    holgura: 12,
    scrollFactor: 0,
  };
}

export function crearVistaDetalle(scene, padre, opciones) {
  const { ancho, alto, turno, onRegresar } = opciones;
  const mapaArquetipos = mapaArquetiposDelTurno(turno);
  const raiz = scene.add.container(0, 0);
  raiz.setScrollFactor(0);
  padre.add(raiz);

  const titulo = scene.add.text(ancho / 2, 48, turno?.numero === 0 ? 'Inicio' : `Turno ${turno?.numero ?? 0}`, {
    fontFamily: 'Arial',
    fontSize: 28,
    color: COLOR_TEXTO,
  });
  titulo.setOrigin(0.5, 0.5);
  titulo.setScrollFactor(0);
  raiz.add(titulo);

  const btnRegresar = scene.add.rectangle(ancho - 110, 48, 160, 44, COLOR_BOTON, 1);
  btnRegresar.setStrokeStyle(2, COLOR_BORDE, 1);
  btnRegresar.setInteractive({ useHandCursor: true });
  btnRegresar.setScrollFactor(0);
  raiz.add(btnRegresar);
  const lblReg = scene.add.text(ancho - 110, 48, 'REGRESAR', {
    fontFamily: 'Arial',
    fontSize: 16,
    color: '#e8c547',
  });
  lblReg.setOrigin(0.5, 0.5);
  lblReg.setScrollFactor(0);
  raiz.add(lblReg);
  btnRegresar.on('pointerdown', () => onRegresar?.());

  const colAncho = (ancho - 96) / 2;
  const yCols = 92;
  const titAliados = scene.add.text(48, yCols, 'Aliados', {
    fontFamily: 'Arial',
    fontSize: 22,
    color: COLOR_ALIADOS,
  });
  titAliados.setScrollFactor(0);
  raiz.add(titAliados);
  const titEnemigos = scene.add.text(48 + colAncho + 16, yCols, 'Enemigos', {
    fontFamily: 'Arial',
    fontSize: 22,
    color: COLOR_ENEMIGOS,
  });
  titEnemigos.setScrollFactor(0);
  raiz.add(titEnemigos);

  const listaAlto = alto - yCols - 56;
  const listaAliados = crearListaScrollable(scene, opcionesLista(scene, 40, yCols + 36, colAncho, listaAlto, raiz));
  const listaEnemigos = crearListaScrollable(scene, opcionesLista(scene, 40 + colAncho + 16, yCols + 36, colAncho, listaAlto, raiz));

  let yA = 0;
  (turno?.aliados ?? []).forEach((p) => {
    const bloque = bloquePotestad(scene, 4, yA, colAncho - 16, p, 0x6fcf6a, mapaArquetipos);
    listaAliados.agregar(bloque.contenedor);
    yA += bloque.alto;
  });
  listaAliados.fijarAltoContenido(yA);

  let yE = 0;
  (turno?.enemigos ?? []).forEach((p) => {
    const bloque = bloquePotestad(scene, 4, yE, colAncho - 16, p, 0xe07a5f, mapaArquetipos);
    listaEnemigos.agregar(bloque.contenedor);
    yE += bloque.alto;
  });
  listaEnemigos.fijarAltoContenido(yE);

  const onWheel = (pointer, _ox, _oy, _dx, deltaY) => {
    if (listaAliados.contieneCoordenadas(pointer.x, pointer.y)) {
      listaAliados.desplazar(-deltaY * 0.5);
      return;
    }
    if (listaEnemigos.contieneCoordenadas(pointer.x, pointer.y)) {
      listaEnemigos.desplazar(-deltaY * 0.5);
    }
  };
  scene.input.on('wheel', onWheel);

  return {
    raiz,
    destruir() {
      scene.input.off('wheel', onWheel);
      listaAliados.destruir();
      listaEnemigos.destruir();
      raiz.destroy(true);
    },
  };
}
