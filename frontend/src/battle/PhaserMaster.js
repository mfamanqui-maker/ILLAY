// Coordinador: monta tablero y potestades, reparte inputs, negocia la ronda.

import { CLAVE_ESCENA_HUD } from './Interfaz/generarInterfaz.js';
import { cerrarPartida } from './Interfaz/accionesDeBarra.js';
import AdministradorTablero from './tablero/AdministradorTablero.js';
import PotestadesTablero from './tablero/PotestadesTablero.js';
import { crearRegistro, descriptoresDeSpritesheet, adaptarParaPanel, prepararTareasDeTurno } from './datosDePotestades/IndexDePotestades.js';
import {
  marcarAccionismoGastado,
  reiniciarAccionismo,
  restaurarBrillosAccionismo,
} from './datosDePotestades/utilidadesDeSeleccion.js';
import { SistemaDeOrbes, precargarOrbes } from './sistemaDeOrbes/index.js';
import { transporte } from './coneccion.js';
import { negociar } from './negociadorDeRonda.js';
import {
  anotarJugadaEnRegistro,
  crearRegistroVacio,
  jugadaDesdeTarea,
  registrarNuevoTurno,
  registrarTurnoInicial,
} from './historial.js';
import { ejecutarTurno, loguearMapaGuion, agruparPorVelocidad } from './guionSincrono.js';
import { reproducirGrupo } from './showAsincrono.js';
import { crearPilaPasivas } from './pilaPasivas.js';

export const CLAVE_ESCENA_MUNDO = 'PhaserMaster';

/** Evento del emisor -> metodo. Anadir un input es una fila. */
const RUTAS_DE_INPUT = {
  casillaPulsada: '_alPulsarCasilla',
  potestadPulsada: '_alSeleccionarPotestad',
  potestadDoblePulsada: '_alAbrirPanel',
  panelCerrado: '_alCerrarPanel',
  accionElegida: '_alElegirAccion',
  confirmar: '_alConfirmarJugada',
  rendirse: '_alRendirse',
};

export default class PhaserMaster extends Phaser.Scene {
  constructor() {
    super({ key: CLAVE_ESCENA_MUNDO });
    this.configuracion = null;
    this.eventos = null;
    this.administrador = null;
    this.tablero = null;
    this.registro = null;
    this.cuerpos = null;
    this.registroDeJugadas = null;
    this.estadoRonda = null;
    this.seleccion = null;
    this.configDelTurno = null;
    this.orbesSistema = null;
    this.transporte = transporte;
  }

  init(configuracion) {
    this.configuracion = configuracion ?? null;
    this.eventos = new Phaser.Events.EventEmitter();
    this.registroDeJugadas = crearRegistroVacio();
    this.configDelTurno = new Map();
    this.configPropia = null;
    this.configRival = null;
    this.idsPendientes = null;
    this._negociando = false;
    this._batallaCerrada = false;
    this.estadoRonda = 'seleccionando';
  }

  preload() {
    AdministradorTablero.precargar(this);
    descriptoresDeSpritesheet(this.configuracion?.equipos).forEach((d) => {
      if (d.archivo) this.load.spritesheet(d.clave, d.archivo, { frameWidth: d.ancho, frameHeight: d.alto });
    });
    precargarOrbes(this);
  }

  async create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this._mostrarTablero();
    await this._mostrarPotestades();
    registrarTurnoInicial(this.registroDeJugadas, this.registro);
    this._registrarInputs();
    this.scene.launch(CLAVE_ESCENA_HUD, {
      eventos: this.eventos,
      obtenerRegistro: () => this.registroDeJugadas,
    });
    this._cambiarFase('seleccionando');
  }

  _mostrarTablero() {
    this.administrador = new AdministradorTablero(this, this.eventos);
    this.tablero = this.administrador.construirDesdeMolde(this.configuracion);
    this.administrador.dibujar(this.tablero);
    this.administrador.registrarZoom();
    this.administrador.registrarPaneo();
    this.administrador.registrarHoverCasilla();
    this.administrador.registrarClicCasilla();
  }

  async _mostrarPotestades() {
    this.registro = crearRegistro(this.configuracion?.equipos, this);
    const puente = new PotestadesTablero(this, this.tablero, this.registro, this.administrador.tileSize);
    this.cuerpos = await puente.colocar();
    this.orbesSistema = new SistemaDeOrbes(this, this.eventos, this.registro, this.tablero);
  }

  _registrarInputs() {
    Object.entries(RUTAS_DE_INPUT).forEach(([evento, metodo]) => {
      this.eventos.on(evento, this[metodo], this);
    });
  }

  _desregistrarInputs() {
    Object.entries(RUTAS_DE_INPUT).forEach(([evento, metodo]) => {
      this.eventos.off(evento, this[metodo], this);
    });
  }

  _cerrarOrbes() {
    this.orbesSistema?.onDeseleccionar();
    this.seleccion = null;
  }

  _inputsBloqueados() {
    return this._negociando || this.estadoRonda === 'esperandoRival' || this.estadoRonda === 'ejecutando';
  }

  _alSeleccionarPotestad({ entidad, col, fila }) {
    if (this._inputsBloqueados() || this.orbesSistema?.bloqueandoClic || entidad.bando === 'Enemigos') return;
    if (this.idsPendientes && !this.idsPendientes.includes(entidad.id)) return;
    this.orbesSistema?.onDeseleccionar();
    this.seleccion = { entidad, col, fila };
    this.orbesSistema?.onSeleccionar(entidad);
  }

  _alAbrirPanel({ entidad }) {
    if (this._inputsBloqueados()) return;
    this.orbesSistema?.onDeseleccionar();
    const entrada = this.registro.obtenerPorId(entidad?.id);
    const datos = adaptarParaPanel(entidad, entrada?.bando, this.registro);
    if (!datos) return;
    this.eventos.emit('abrirPanel', {
      ...datos,
      escenaAPausar: this,
      onResolverEntidad: (id) => {
        const hallada = this.registro.obtenerPorId(id);
        return hallada ? adaptarParaPanel(hallada.potestad, hallada.bando, this.registro) : null;
      },
    });
  }

  _alPulsarCasilla() {
    if (this._inputsBloqueados() || this.orbesSistema?.bloqueandoClic) return;
    this._cerrarOrbes();
  }

  /** Accionismo 1: elegir otra vez reemplaza. Cupo 0 rechaza. */
  _alElegirAccion({ id, nombreDeAccion, objetivo, azar }) {
    if (this._inputsBloqueados()) return;
    const entrada = this.registro?.obtenerPorId(id);
    if (Number(entrada?.potestad?.constantes?.accionismo ?? 1) < 1) return;
    this.configDelTurno.set(id, { id, nombreDeAccion, objetivo, azar: azar ?? null });
    marcarAccionismoGastado(entrada?.potestad);
  }

  _alCerrarPanel() {}
  async _alConfirmarJugada() {
    if (this._negociando || this.estadoRonda === 'ejecutando') return;
    this._cerrarOrbes();
    this._cambiarFase('esperandoRival');
    this._negociando = true;
    try {
      await this._aplicarResultadoRonda(await negociar(this.configDelTurno, this._ctxRonda()));
    } finally {
      this._negociando = false;
    }
  }

  _ctxRonda() {
    return {
      transporte: this.transporte, columnas: this.configuracion?.configTablero?.columnas,
      registro: this.registro, haySocket: this.transporte.estaConectado(),
      configuracionRival: this.configRival,
    };
  }

  async _aplicarResultadoRonda(resultado) {
    if (resultado.fase === 'terminada') return this._terminarBatalla(resultado.resultado, true);
    this.configPropia = resultado.propia ?? [];
    this._recibirConfiguracionRival(resultado.rival);
    this.idsPendientes = resultado.fase === 'seleccionando' ? resultado.idsPendientes : null;
    if (resultado.fase === 'precombate') {
      this._cambiarFase('precombate');
      return this._ejecutarTurno();
    }
    this._cambiarFase('seleccionando');
  }

  async _alRendirse() {
    if (this._negociando || this.estadoRonda === 'esperandoRival') return;
    try {
      await this._terminarBatalla('derrota');
    } catch (error) {
      console.error('[PhaserMaster] rendirse:', error);
    }
  }

  _cambiarFase(estadoRonda) {
    this.estadoRonda = estadoRonda;
    if (estadoRonda === 'seleccionando' && this.registro) {
      reiniciarAccionismo(this.idsPendientes);
      restaurarBrillosAccionismo({ escena: this, potestades: this.registro.todos() });
    }
    this.eventos.emit('faseCambiada', estadoRonda);
  }

  _enviarConfiguracion(configuracion, esFinal) {
    this.transporte.enviarConfiguracion(configuracion, esFinal);
  }

  _recibirConfiguracionRival(configuracion) {
    this.configRival = configuracion ?? [];
    if (this.orbesSistema) this.orbesSistema.configuracionRival = this.configRival;
  }

  /** Precombate: Index enriquece, guion resuelve, show anima. */
  async _ejecutarTurno() {
    this._cambiarFase('ejecutando');
    registrarNuevoTurno(this.registroDeJugadas, this.registro);
    this.eventos.emit('registroJugadasActualizado', this.registroDeJugadas);
    const filas = [...(this.configPropia ?? []), ...(this.configRival ?? [])];
    const tareas = prepararTareasDeTurno(filas, this.registro);
    loguearMapaGuion(new Map(agruparPorVelocidad(tareas).map((g) => [g.velocidad, g.tareas])));
    const { fin } = await ejecutarTurno(tareas, this._ctxGuion());
    this._limpiarTrasTurno();
    if (fin) await this._terminarBatalla(fin);
    else this._cambiarFase('seleccionando');
  }

  _ctxGuion() {
    return {
      escena: this,
      tablero: this.tablero,
      eventos: this.eventos,
      registro: this.registro,
      pila: crearPilaPasivas(),
      tamanoCasilla: this.administrador?.tileSize ?? 400,
      reproducirGrupo,
      onJugada: (j) => this._anotarJugada(j),
    };
  }

  _limpiarTrasTurno() {
    this.configDelTurno = new Map();
    this.configPropia = null;
    this._recibirConfiguracionRival(null);
    this.idsPendientes = null;
  }

  _anotarJugada(tarea) {
    const turno = this.registroDeJugadas.turnos[this.registroDeJugadas.turnos.length - 1]?.numero ?? 0;
    anotarJugadaEnRegistro(this.registroDeJugadas, jugadaDesdeTarea(tarea, turno));
    this.eventos.emit('registroJugadasActualizado', this.registroDeJugadas);
  }

  async _terminarBatalla(resultadoLocal, yaVeredicto = false) {
    if (this._batallaCerrada) return;
    this._batallaCerrada = true;
    const resultado = yaVeredicto
      ? resultadoLocal
      : (await cerrarPartida(this.transporte, resultadoLocal)).resultado;
    const destino = this.configuracion?.reglasExtra?.destino?.[resultado] ?? null;
    this.eventos.emit('batallaTerminada', {
      resultado, registro: this.registroDeJugadas, destino,
      alSalir: (d) => this._alSalir(d),
    });
  }

  _alSalir(destino) {
    const clave = destino?.key;
    this.scene.stop(CLAVE_ESCENA_HUD);
    this.scene.stop(CLAVE_ESCENA_MUNDO);
    if (clave) this.scene.start(clave, destino);
  }

  shutdown() {
    this._cerrarOrbes();
    this._desregistrarInputs();
    this.administrador?.destruir();
    this.eventos?.removeAllListeners();
    this.scene.stop(CLAVE_ESCENA_HUD);
  }
}