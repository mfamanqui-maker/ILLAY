// Coordinador: dueno del estado y de la fase, no del comportamiento.
// Spect 004: metodos <= 15 lineas, archivo < 200.

import { CLAVE_ESCENA_HUD } from './Interfaz/generarInterfaz.js';
import { crearRegistroVacio, registrarTurnoInicial } from './Interfaz/Historial/historial.js';
import { montar, precargar } from './tablero/index.js';
import { aplicarAccionismoDelTurno, cupoAccionismo, iniciarBrilloAccionismo, liberarAccionismo, reiniciarAccionismo, restaurarBrillosAccionismo } from './seleccion/index.js';
import { abrirPanel } from './panelEntidad/index.js';
import { transporte } from './coneccion.js';
import {
  actualizarFantasmaMovilidad,
  conmutarPermanente,
  correrTurno,
  ctxRonda,
  inyectarPermanentesEnFase,
  negociar,
  precombate,
  quitarDeCola,
  registrarEleccion,
  resolverFinDeBatalla,
  buscarInformacionDeRival,
  asegurarEscudarEnPropia,
  filasDeConfig,
  utilsType1,
} from './AdministracionDeJugada/index.js';
import { abrirFaseEscudo } from './faseEscudo.js';

export const CLAVE_ESCENA_MUNDO = 'BatallaMundo';

/** Evento del emisor -> metodo. Anadir un input es una fila. */
const RUTAS_DE_INPUT = {
  casillaPulsada: '_alPulsarCasilla',
  potestadPulsada: '_alSeleccionarPotestad',
  potestadDoblePulsada: '_alAbrirPanel',
  panelCerrado: '_alCerrarPanel',
  accionElegida: '_alElegirAccion',
  colaEliminar: '_alEliminarDeCola',
  colaPermanente: '_alMarcarPermanente',
  confirmar: '_alConfirmarJugada',
  rendirse: '_alRendirse',
};

export default class PhaserMaster extends Phaser.Scene {
  constructor() {
    super({ key: CLAVE_ESCENA_MUNDO });
    this.transporte = transporte;
  }

  init(configuracion) {
    this.configuracion = configuracion ?? null;
    this.eventos = new Phaser.Events.EventEmitter();
    this.registroDeJugadas = crearRegistroVacio();
    this.configDelTurno = new Map();
    this.permanentes = new Map();
    this.configPropia = this.configRival = this.idsPendientes = null;
    this._negociando = this._reconfirmarPendiente = this._batallaCerrada = false;
    this._sesionTipo1 = null;
    this.estadoRonda = 'seleccionando';
  }

  preload() {
    precargar(this);
  }

  async create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    await montar(this);
    registrarTurnoInicial(this.registroDeJugadas, this.registro);
    this._registrarInputs();
    this.scene.launch(CLAVE_ESCENA_HUD, { eventos: this.eventos, obtenerRegistro: () => this.registroDeJugadas });
    this._cambiarFase('seleccionando');
  }

  _registrarInputs() {
    Object.entries(RUTAS_DE_INPUT).forEach(([evento, metodo]) => this.eventos.on(evento, this[metodo], this));
  }

  _desregistrarInputs() {
    Object.entries(RUTAS_DE_INPUT).forEach(([evento, metodo]) => this.eventos.off(evento, this[metodo], this));
  }

  _cerrarOrbes() {
    this.orbesSistema?.onDeseleccionar();
    this.seleccion = null;
  }

  _inputsBloqueados() {
    return this._negociando
      || this.estadoRonda === 'esperandoRival'
      || this.estadoRonda === 'escudo'
      || this.estadoRonda === 'ejecutando';
  }

  _puedeAbrirOrbes(entidad) {
    if (this._sesionTipo1 || this._inputsBloqueados() || this.orbesSistema?.bloqueandoClic) return false;
    if (entidad.bando === 'Enemigos' || entidad.muerta || Number(entidad.estadisticas?.hp) <= 0) return false;
    return !this.idsPendientes || this.idsPendientes.includes(entidad.id);
  }

  _alSeleccionarPotestad({ entidad, col, fila }) {
    if (!this._puedeAbrirOrbes(entidad)) return;
    this.orbesSistema?.onDeseleccionar();
    this.seleccion = { entidad, col, fila };
    this.orbesSistema?.onSeleccionar(entidad);
  }

  _alAbrirPanel({ entidad }) {
    if (this._sesionTipo1 || this._inputsBloqueados()) return;
    this.orbesSistema?.onDeseleccionar();
    abrirPanel(this.eventos, this.registro, entidad, this);
  }

  _alPulsarCasilla() {
    if (this._sesionTipo1 || this._inputsBloqueados() || this.orbesSistema?.bloqueandoClic) return;
    if (this.orbesSistema?.cerrarHijasCola?.()) return;
    this._cerrarOrbes();
  }

  _alElegirAccion(payload) {
    if (this._inputsBloqueados()) return;
    registrarEleccion(this, payload);
  }

  _alEliminarDeCola({ id, indiceLista }) {
    if (this._inputsBloqueados()) return;
    const potestad = this.registro?.obtenerPorId(id)?.potestad;
    quitarDeCola(this.configDelTurno, this.permanentes, id, indiceLista);
    if (potestad) liberarAccionismo(potestad);
    actualizarFantasmaMovilidad(potestad, this.configDelTurno.get(id), this, this.administrador?.tileSize);
    iniciarBrilloAccionismo(potestad, this, 'Aliados');
  }

  _alMarcarPermanente({ id, indiceLista }) {
    if (this._inputsBloqueados()) return;
    conmutarPermanente(
      this.permanentes, this.configDelTurno, id, indiceLista,
      cupoAccionismo(this.registro?.obtenerPorId(id)?.potestad),
    );
  }

  _alCerrarPanel() {}

  async _alConfirmarJugada() {
    if (this._negociando || this._sesionTipo1 || this.estadoRonda === 'ejecutando') return;
    this._cerrarOrbes();
    this._cambiarFase('esperandoRival');
    const extra = await buscarInformacionDeRival(this.configDelTurno, ctxRonda(this));
    if (extra?.fase === 'terminada') return this._terminarBatalla(extra.resultado, true);
    if (extra?.rival) {
      this._recibirConfiguracionRival(extra.rival);
      this.configPropia = asegurarEscudarEnPropia(
        this.configPropia ?? filasDeConfig(this.configDelTurno),
        this.configDelTurno,
      );
      this._cambiarFase('escudo');
      await utilsType1(this.configRival, this.configPropia, this.registro, this);
      this._cambiarFase('esperandoRival');
    }
    await this._negociarUnaVez();
    if (this._reconfirmarPendiente) {
      this._reconfirmarPendiente = false;
      await this._alConfirmarJugada();
    }
  }

  async _negociarUnaVez() {
    this._negociando = true;
    try {
      await this._aplicarResultadoRonda(await negociar(this.configDelTurno, ctxRonda(this)));
    } catch (error) {
      console.error('[PhaserMaster] negociar:', error);
      this._cambiarFase('seleccionando');
    } finally {
      this._negociando = false;
    }
  }

  async _aplicarResultadoRonda(resultado) {
    if (resultado.fase === 'terminada') return this._terminarBatalla(resultado.resultado, true);
    this.configPropia = asegurarEscudarEnPropia(resultado.propia, this.configDelTurno);
    this._recibirConfiguracionRival(resultado.rival);
    this.idsPendientes = resultado.fase === 'seleccionando' 
      ? resultado.idsPendientes 
      : null;

    if (resultado.fase === 'precombate') {
      this._cambiarFase('precombate');
      await precombate(this);
      return this._ejecutarTurno();
    }
    this._cambiarFase('seleccionando');
  }

  async _alRendirse() {
    if (this._negociando || this.estadoRonda === 'esperandoRival') return;
    try { await resolverFinDeBatalla(this, 'derrota'); }
    catch (error) { console.error('[PhaserMaster] rendirse:', error); }
  }

  _cambiarFase(estadoRonda) {
    this.estadoRonda = estadoRonda;
    if (estadoRonda === 'seleccionando' && this.registro) {
      reiniciarAccionismo(this.idsPendientes);
      if (this.idsPendientes == null) {
        inyectarPermanentesEnFase(this.configDelTurno, this.permanentes, this.registro, this.tablero, this, this.administrador?.tileSize);
      }
      restaurarBrillosAccionismo({ escena: this, potestades: this.registro.todos() });
    }
    this.eventos.emit('faseCambiada', estadoRonda);
  }

  _enviarConfiguracion(configuracion, esFinal) {
    this.transporte.enviarConfiguracion(configuracion, esFinal);
  }

  _recibirConfiguracionRival(configuracion) {
    this.configRival = configuracion ?? null;
    if (this.orbesSistema) this.orbesSistema.configuracionRival = this.configRival;
  }

  async _ejecutarTurno() {
    const fin = await correrTurno(this);
    if (fin) await this._terminarBatalla(fin);
    else {
      aplicarAccionismoDelTurno(this.registro.todos());
      this._cambiarFase('seleccionando');
    }
  }

  async _terminarBatalla(resultadoLocal, yaVeredicto = false) {
    await resolverFinDeBatalla(this, resultadoLocal, yaVeredicto);
  }

  _alSalir(destino) {
    this.scene.stop(CLAVE_ESCENA_HUD);
    this.scene.stop(CLAVE_ESCENA_MUNDO);
    if (destino?.key) this.scene.start(destino.key, destino);
  }

  shutdown() {
    this._cerrarFaseEscudo?.();
    this._cerrarOrbes();
    this._desregistrarInputs();
    this.administrador?.destruir();
    this.eventos?.removeAllListeners();
    this.scene.stop(CLAVE_ESCENA_HUD);
  }
}
