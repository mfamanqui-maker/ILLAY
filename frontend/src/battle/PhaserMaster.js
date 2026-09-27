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
  aplicarAccionismoDelTurno,
  cupoAccionismo,
  esAccionDeMovilidad,
  colocarFantasmaMovilidad,
  quitarFantasmaMovilidad,
  limpiarFantasmasMovilidad,
  liberarAccionismo,
  iniciarBrilloAccionismo,
  seleccionarObjetivos,
} from './datosDePotestades/utilidadesDeSeleccion.js';
import {
  SistemaDeOrbes,
  precargarOrbes,
  abrirSesionTipo1,
  pintarPasoTipo1,
  cerrarSeleccionTipo1,
} from './sistemaDeOrbes/index.js';
import { transporte } from './coneccion.js';
import { negociar, esConfigFinal, filasDeConfig } from './negociadorDeRonda.js';
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
import { avanzarCicloCaza } from './datosDePotestades/efectosEstado.js';
import {
  apilarAccion,
  aplicarPermanentes,
  conmutarPermanente,
  quitarDeCola,
} from './colaDeJugada.js';

export const CLAVE_ESCENA_MUNDO = 'PhaserMaster';

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
    this.permanentes = new Map();
    this.configPropia = null;
    this.configRival = null;
    this.idsPendientes = null;
    this._negociando = false;
    this._reconfirmarPendiente = false;
    this._sesionTipo1 = null;
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
    if (this._sesionTipo1) return;
    if (this._inputsBloqueados() || this.orbesSistema?.bloqueandoClic || entidad.bando === 'Enemigos') return;
    if (entidad.muerta || Number(entidad.estadisticas?.hp) <= 0) return;
    if (this.idsPendientes && !this.idsPendientes.includes(entidad.id)) return;
    this.orbesSistema?.onDeseleccionar();
    this.seleccion = { entidad, col, fila };
    this.orbesSistema?.onSeleccionar(entidad);
  }

  _alAbrirPanel({ entidad }) {
    if (this._sesionTipo1 || this._inputsBloqueados()) return;
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
    if (this._sesionTipo1) return;
    if (this._inputsBloqueados() || this.orbesSistema?.bloqueandoClic) return;
    if (this.orbesSistema?.cerrarHijasCola?.()) return;
    this._cerrarOrbes();
  }

  /** Accionismo 1: elegir otra vez reemplaza. Cupo extra apila otra accion. */
  _alElegirAccion({ id, nombreDeAccion, objetivo, azar }) {
    if (this._inputsBloqueados()) return;
    const entrada = this.registro?.obtenerPorId(id);
    const cupo = cupoAccionismo(entrada?.potestad);

    // Fase 2 escudar: parchear la fila pendiente, no apilar otra.
    if (this.idsPendientes && this._parchearEscudarPendiente(id, nombreDeAccion, objetivo)) {
      this._intentarCerrarFaseTipo1();
      return;
    }

    if (cupo < 1) return;
    const fila = { id, nombreDeAccion, objetivo, azar: azar ?? null };
    const { lista, gastada } = apilarAccion(this.configDelTurno, this.permanentes, id, fila, cupo);
    if (gastada) marcarAccionismoGastado(entrada?.potestad);
    this._actualizarFantasmaMovilidad(entrada?.potestad, lista);
    if (this.idsPendientes) this._intentarCerrarFaseTipo1();
  }

  /** Rellena objetivo de un escudar/configtype1 pendiente. */
  _parchearEscudarPendiente(id, nombreDeAccion, objetivo) {
    const lista = this.configDelTurno.get(id)
      ?? this.configDelTurno.get(Number(id))
      ?? this.configDelTurno.get(String(id));
    if (!Array.isArray(lista)) return false;
    const fila = lista.find((f) => (
      f.nombreDeAccion === nombreDeAccion && f.objetivo == null
    )) ?? lista.find((f) => f.objetivo == null);
    if (!fila) return false;
    const tipo = String(
      Object.values(this.registro?.obtenerPorId(id)?.potestad?.listaDeAcciones ?? {})
        .flat()
        .find((a) => a?.nombre === fila.nombreDeAccion)
        ?.type ?? '',
    ).toLowerCase();
    if (!tipo.includes('configtype1') && nombreDeAccion !== 'escudar') return false;
    fila.objetivo = objetivo;
    if (nombreDeAccion) fila.nombreDeAccion = nombreDeAccion;
    return true;
  }

  _alEliminarDeCola({ id, indiceLista }) {
    if (this._inputsBloqueados()) return;
    const potestad = this.registro?.obtenerPorId(id)?.potestad;
    quitarDeCola(this.configDelTurno, this.permanentes, id, indiceLista);
    if (potestad) liberarAccionismo(potestad);
    this._actualizarFantasmaMovilidad(potestad, this.configDelTurno.get(id));
    iniciarBrilloAccionismo(potestad, this, 'Aliados');
  }

  _alMarcarPermanente({ id, indiceLista }) {
    if (this._inputsBloqueados()) return;
    const cupo = cupoAccionismo(this.registro?.obtenerPorId(id)?.potestad);
    conmutarPermanente(this.permanentes, this.configDelTurno, id, indiceLista, cupo);
  }

  _actualizarFantasmaMovilidad(potestad, lista) {
    const mov = [...(lista ?? [])].reverse().find((f) => esAccionDeMovilidad(f?.nombreDeAccion));
    const dest = mov?.objetivo;
    if (dest && Number.isFinite(Number(dest.x)) && Number.isFinite(Number(dest.y))) {
      colocarFantasmaMovilidad(potestad, dest, this, this.administrador?.tileSize ?? 400);
      return;
    }
    if (potestad?.id != null) quitarFantasmaMovilidad(potestad.id);
    if (potestad) potestad.posicionPlanificada = null;
  }

  _alCerrarPanel() {}
  async _alConfirmarJugada() {
    if (this._negociando || this.estadoRonda === 'ejecutando') return;
    this._cerrarOrbes();
    this._cambiarFase('esperandoRival');
    this._negociando = true;
    try {
      await this._aplicarResultadoRonda(await negociar(this.configDelTurno, this._ctxRonda()));
    } catch (error) {
      console.error('[PhaserMaster] negociar:', error);
      this._cambiarFase('seleccionando');
    } finally {
      this._negociando = false;
    }
    if (this._reconfirmarPendiente) {
      this._reconfirmarPendiente = false;
      await this._alConfirmarJugada();
    }
  }

  _ctxRonda() {
    return {
      transporte: this.transporte,
      columnas: this.configuracion?.configTablero?.columnas,
      registro: this.registro,
      haySocket: this.transporte.estaConectado(),
      configuracionRival: this.configRival,
      tablero: this.tablero,
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
    if (resultado.fase === 'seleccionando') {
      await this._continuarFaseTipo1();
    }
  }

  _ctxSeleccionTipo1(entrada, accion) {
    return {
      potestades: this.registro?.todos?.() ?? [],
      origen: entrada?.potestad?.datos?.posicion,
      origenPotestad: entrada?.potestad,
      configuracionRival: this.configRival,
      tablero: this.tablero,
    };
  }

  /**
   * Tras recibir la config del rival: auto-rellena 0/1 amenazado,
   * recorre uno a uno a quien debe elegir, envia el final y va al show.
   */
  async _continuarFaseTipo1() {
    const pendientes = this.idsPendientes ?? [];
    const cola = [];

    pendientes.forEach((id) => {
      const lista = this.configDelTurno.get(id);
      if (!Array.isArray(lista)) return;
      lista.forEach((fila) => {
        if (fila.objetivo != null) return;
        const entrada = this.registro?.obtenerPorId(id);
        const accion = Object.values(entrada?.potestad?.listaDeAcciones ?? {})
          .flat()
          .find((a) => a?.nombre === fila.nombreDeAccion) ?? null;
        if (!accion) return;
        if (!String(accion.type ?? accion.tipo ?? '').toLowerCase().includes('configtype1')) return;
        const sel = seleccionarObjetivos(accion, this._ctxSeleccionTipo1(entrada, accion));
        if (sel.tipo === 'automatico') {
          fila.objetivo = sel.objetivoAuto ?? null;
          return;
        }
        if (sel.tipo === 'entidad') {
          cola.push({ id, fila, accion, potestad: entrada?.potestad, candidatos: sel.candidatos });
        }
      });
    });

    if (cola.length > 0) {
      this._cerrarOrbes();
      this._sesionTipo1 = abrirSesionTipo1(this, {
        configuracionRival: this.configRival,
        potestades: this.registro?.todos?.() ?? [],
        tablero: this.tablero,
      });
      try {
        for (const paso of cola) {
          this.seleccion = { entidad: paso.potestad };
          const elegido = await pintarPasoTipo1(this._sesionTipo1, {
            defensor: paso.potestad,
            candidatos: paso.candidatos,
          });
          this._parchearEscudarPendiente(paso.id, paso.accion?.nombre, elegido);
        }
      } finally {
        this._cerrarSesionTipo1();
      }
    }

    await this._intentarCerrarFaseTipo1();
  }

  _cerrarSesionTipo1() {
    if (!this._sesionTipo1) return;
    cerrarSeleccionTipo1(this._sesionTipo1);
    this._sesionTipo1 = null;
  }

  async _intentarCerrarFaseTipo1() {
    const filas = filasDeConfig(this.configDelTurno);
    if (!esConfigFinal(filas, this.registro, this.configRival, this.tablero)) return;
    this.idsPendientes = null;
    // Dentro de una negociacion en curso _alConfirmarJugada se descarta:
    // se reconfirma al salir de ella.
    if (this._negociando) {
      this._reconfirmarPendiente = true;
      return;
    }
    await this._alConfirmarJugada();
  }

  async _alRendirse() {
    if (this._negociando || this.estadoRonda === 'esperandoRival') return;
    try {
      await this._terminarBatalla('derrota');
    } catch (error) {
      console.error('[PhaserMaster] rendirse:', error);
    }
  }

  _inyectarPermanentes() {
    aplicarPermanentes(this.configDelTurno, this.permanentes, this.registro, this.tablero);
    this.configDelTurno.forEach((lista, id) => {
      this._actualizarFantasmaMovilidad(this.registro.obtenerPorId(id)?.potestad, lista);
    });
  }

  _cambiarFase(estadoRonda) {
    this.estadoRonda = estadoRonda;
    if (estadoRonda === 'seleccionando' && this.registro) {
      reiniciarAccionismo(this.idsPendientes);
      if (this.idsPendientes == null) this._inyectarPermanentes();
      restaurarBrillosAccionismo({ escena: this, potestades: this.registro.todos() });
    }
    this.eventos.emit('faseCambiada', estadoRonda);
  }

  _enviarConfiguracion(configuracion, esFinal) {
    this.transporte.enviarConfiguracion(configuracion, esFinal);
  }

  _recibirConfiguracionRival(configuracion) {
    // null = aun no sabemos que hara el rival; [] = no hace nada.
    this.configRival = configuracion ?? null;
    if (this.orbesSistema) this.orbesSistema.configuracionRival = this.configRival;
  }

  /** Precombate: Index enriquece, guion resuelve, show anima. */
  async _ejecutarTurno() {
    limpiarFantasmasMovilidad(this.registro?.todos?.() ?? []);
    this._cambiarFase('ejecutando');
    registrarNuevoTurno(this.registroDeJugadas, this.registro);
    this.eventos.emit('registroJugadasActualizado', this.registroDeJugadas);
    const filas = [...(this.configPropia ?? []), ...(this.configRival ?? [])];
    const tareas = prepararTareasDeTurno(filas, this.registro);
    loguearMapaGuion(new Map(agruparPorVelocidad(tareas).map((g) => [g.velocidad, g.tareas])));
    const { fin } = await ejecutarTurno(tareas, this._ctxGuion());
    this._limpiarTrasTurno();
    if (fin) await this._terminarBatalla(fin);
    else {
      aplicarAccionismoDelTurno(this.registro.todos());
      this._cambiarFase('seleccionando');
    }
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
    this._cerrarSesionTipo1();
    avanzarCicloCaza(this.registro);
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
    this._cerrarSesionTipo1();
    this._batallaCerrada = true;
    this._negociando = false;
    this.estadoRonda = 'terminada';
    this.eventos.emit('faseCambiada', 'terminada');
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
    this._cerrarSesionTipo1();
    this._cerrarOrbes();
    this._desregistrarInputs();
    this.administrador?.destruir();
    this.eventos?.removeAllListeners();
    this.scene.stop(CLAVE_ESCENA_HUD);
  }
}