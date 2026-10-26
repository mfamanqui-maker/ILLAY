import { crearListaScrollable } from '../../panelEntidad/partes/listaScrollable.js';
import {
  COLOR_BORDE,
  COLOR_BOTON,
  COLOR_TEXTO,
} from './estilosHistorial.js';

const COLUMNAS = 4;
const MARGEN = 48;
const ESPACIO_TITULO = 110;

function contarJugadas(turno) {
  return (turno?.grupos ?? []).reduce((n, g) => n + (g.jugadas?.length ?? 0), 0);
}

export function crearVistaGrilla(scene, padre, opciones) {
  const { ancho, alto, turnos, onElegirTurno, onRegresar } = opciones;
  const raiz = scene.add.container(0, 0);
  raiz.setScrollFactor(0);
  padre.add(raiz);

  const titulo = scene.add.text(ancho / 2, 48, 'HISTORIAL', {
    fontFamily: 'Arial',
    fontSize: 36,
    color: COLOR_TEXTO,
    padding: { x: 8, y: 6 },
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
    padding: { x: 4, y: 2 },
  });
  lblReg.setOrigin(0.5, 0.5);
  lblReg.setScrollFactor(0);
  raiz.add(lblReg);
  btnRegresar.on('pointerdown', () => onRegresar?.());

  const listaAlto = alto - ESPACIO_TITULO - MARGEN;
  const listaAncho = ancho - MARGEN * 2;
  const lista = crearListaScrollable(scene, {
    x: MARGEN,
    y: ESPACIO_TITULO,
    ancho: listaAncho,
    alto: listaAlto,
    padre: raiz,
    depth: 2,
    holgura: 12,
    scrollFactor: 0,
  });

  const celdaAncho = (listaAncho - (COLUMNAS - 1) * 16) / COLUMNAS;
  const celdaAlto = 96;
  let yCursor = 0;

  turnos.forEach((turno, indice) => {
    const col = indice % COLUMNAS;
    const fila = Math.floor(indice / COLUMNAS);
    const x = col * (celdaAncho + 16);
    const y = fila * (celdaAlto + 16);
    const jugadas = contarJugadas(turno);
    const leyenda = turno.numero === 0 ? 'Inicio' : `Turno ${turno.numero}`;
    const detalle = jugadas === 0 ? 'sin jugadas' : `${jugadas} jugada${jugadas === 1 ? '' : 's'}`;

    const tile = scene.add.container(x, y);
    tile.setScrollFactor(0);
    const rect = scene.add.rectangle(celdaAncho / 2, celdaAlto / 2, celdaAncho, celdaAlto, COLOR_BOTON, 1);
    rect.setStrokeStyle(2, COLOR_BORDE, 1);
    rect.setInteractive({ useHandCursor: true });
    rect.setScrollFactor(0);
    tile.add(rect);

    const lbl = scene.add.text(celdaAncho / 2, celdaAlto / 2 - 14, leyenda, {
      fontFamily: 'Arial',
      fontSize: 18,
      color: COLOR_TEXTO,
      padding: { x: 6, y: 4 },
    });
    lbl.setOrigin(0.5, 0.5);
    lbl.setScrollFactor(0);
    tile.add(lbl);

    const sub = scene.add.text(celdaAncho / 2, celdaAlto / 2 + 18, detalle, {
      fontFamily: 'Arial',
      fontSize: 13,
      color: '#bdbdbd',
      padding: { x: 6, y: 4 },
    });
    sub.setOrigin(0.5, 0.5);
    sub.setScrollFactor(0);
    tile.add(sub);

    rect.on('pointerdown', () => onElegirTurno?.(turno));
    lista.agregar(tile);
    yCursor = y + celdaAlto + 16;
  });

  lista.fijarAltoContenido(yCursor);

  const onWheel = (pointer, _ox, _oy, _dx, deltaY) => {
    if (lista.contieneCoordenadas(pointer.x, pointer.y)) {
      lista.desplazar(-deltaY * 0.5);
    }
  };
  scene.input.on('wheel', onWheel);

  return {
    raiz,
    destruir() {
      scene.input.off('wheel', onWheel);
      lista.destruir();
      raiz.destroy(true);
    },
  };
}
