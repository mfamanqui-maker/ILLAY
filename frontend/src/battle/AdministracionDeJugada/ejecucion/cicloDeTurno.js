/**
 * PhaserMaster cambia la fase y decide si la batalla termina. Aqui se
 * arma el contexto del guion y se deja el estado listo para el turno
 * siguiente. El show se inyecta: el guion no dibuja.
 */

import { avanzarCicloCaza } from '../../datosDePotestades/efectosEstado.js';
import { limpiarFantasmasMovilidad } from '../../seleccion/index.js';
import {
  anotarJugadaEnRegistro,
  jugadaDesdeTarea,
  registrarNuevoTurno,
} from '../../Interfaz/Historial/registroJugadas.js';
import { cerrarPartida } from '../../Interfaz/accionesDeBarra.js';
import { ejecutarTurno } from './guion.js';
import { crearPilaPasivas } from './pilaPasivas.js';
import { quitarAuraEscudo } from './secuenciasShow.js';
import { reproducirGrupo } from './showAsincrono.js';
import { construirTareasActivas, loguearTareasActivas } from './tareasActivas.js';
import { asegurarEscudarEnPropia } from '../comun.js';
import { utilsType1 } from '../negociacion/negociadorDeRonda.js';

export function ctxRonda(escena) {
  return {
    transporte: escena.transporte,
    columnas: escena.configuracion?.configTablero?.columnas,
    registro: escena.registro,
    haySocket: escena.transporte.estaConectado(),
    configuracionRival: escena.configRival,
    tablero: escena.tablero,
  };
}

export function anotarJugadaDeTarea(escena, tarea) {
  const turnos = escena.registroDeJugadas.turnos;
  const turno = turnos[turnos.length - 1]?.numero ?? 0;
  anotarJugadaEnRegistro(escena.registroDeJugadas, jugadaDesdeTarea(tarea, turno));
  escena.eventos.emit('registroJugadasActualizado', escena.registroDeJugadas);
}

export function ctxGuion(escena) {
  return {
    escena,
    tablero: escena.tablero,
    eventos: escena.eventos,
    registro: escena.registro,
    pila: crearPilaPasivas(),
    tamanoCasilla: escena.administrador?.tileSize ?? 400,
    reproducirGrupo,
    onJugada: (tarea) => anotarJugadaDeTarea(escena, tarea),
  };
}

/** Imprime las configs ya negociadas (jugador y rival) antes del guion. */
export async function precombate(escena) {
  escena.configPropia = asegurarEscudarEnPropia(escena.configPropia, escena.configDelTurno);
  await utilsType1(escena.configRival, escena.configPropia, escena.registro, escena);
}

export function limpiarTrasTurno(escena) {
  escena._cerrarFaseEscudo?.();
  escena._cerrarFaseEscudo = null;
  escena._sesionTipo1 = null;
  (escena.registro?.todos?.() ?? []).forEach(({ potestad }) => {
    potestad.activacionEscudo = false;
    quitarAuraEscudo(potestad);
  });
  avanzarCicloCaza(escena.registro);
  escena.configDelTurno = new Map();
  escena.configPropia = null;
  escena.configRival = null;
  if (escena.orbesSistema) escena.orbesSistema.configuracionRival = null;
  escena.idsPendientes = null;
  escena.transporte?.vaciarBuzonDeConfigs?.();
}

export async function correrTurno(escena) {
  limpiarFantasmasMovilidad(escena.registro?.todos?.() ?? []);
  escena._cambiarFase('ejecutando');
  registrarNuevoTurno(escena.registroDeJugadas, escena.registro);
  escena.eventos.emit('registroJugadasActualizado', escena.registroDeJugadas);
  const filas = [...(escena.configPropia ?? []), ...(escena.configRival ?? [])];
  const grupos = construirTareasActivas(filas, escena.registro);
  loguearTareasActivas(grupos);
  const { fin } = await ejecutarTurno(grupos, ctxGuion(escena));
  limpiarTrasTurno(escena);
  return fin ?? null;
}

export async function resolverFinDeBatalla(escena, resultadoLocal, yaVeredicto = false) {
  if (escena._batallaCerrada) return;
  escena._cerrarFaseEscudo?.();
  escena._cerrarFaseEscudo = null;
  escena._sesionTipo1 = null;
  escena._batallaCerrada = true;
  escena._negociando = false;
  escena._cambiarFase('terminada');
  const resultado = yaVeredicto
    ? resultadoLocal
    : (await cerrarPartida(escena.transporte, resultadoLocal)).resultado;
  escena.eventos.emit('batallaTerminada', {
    resultado,
    registro: escena.registroDeJugadas,
    destino: escena.configuracion?.reglasExtra?.destino?.[resultado] ?? null,
    alSalir: (d) => escena._alSalir(d),
  });
}
