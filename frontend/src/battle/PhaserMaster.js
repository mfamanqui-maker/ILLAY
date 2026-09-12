// CONTEXTO: esta es la primera pieza que se activa. Monta el tablero y las potestades, sostiene la data, reparte los inputs, 
// habla con el servidor o con la IA por coneccion.js, guarda el registro de jugadas y decide cuando termina la batalla.

import { CLAVE_ESCENA_HUD } from './generarInterfaz.js';
import AdministradorTablero from './tablero/AdministradorTablero.js';
import PotestadesTablero from './tablero/PotestadesTablero.js';
import { crearRegistro, descriptoresDeSpritesheet, adaptarParaPanel } from './datosDePotestades/IndexDePotestades.js';
import { SistemaDeOrbes, precargarOrbes } from './sistemaDeOrbes/index.js';

export const CLAVE_ESCENA_MUNDO = 'PhaserMaster';

/** Evento del emisor -> metodo. Anadir un input es una fila. */
const RUTAS_DE_INPUT = {
  // 1. Tablero: detecta y emite, no decide.
  casillaPulsada: '_alPulsarCasilla',
  potestadPulsada: '_alSeleccionarPotestad',
  potestadDoblePulsada: '_alAbrirPanel',
  // 2. Panel de entidad: se le inyectan callbacks; solo avisa de que se cerro.
  panelCerrado: '_alCerrarPanel',
  // 3. Orbes: el jugador ya eligio accion y objetivo para una potestad.
  accionElegida: '_alElegirAccion',
  // 4. Interfaz: los cinco botones del HUD.
  confirmar: '_alConfirmarJugada',
  rendirse: '_alRendirse',
  pausa: '_alPausar',
  historial: '_alAbrirHistorial',
  ignorarInterfaz: '_alIgnorarInterfaz',
};

export default class PhaserMaster extends Phaser.Scene {
  constructor() {
    super({ key: CLAVE_ESCENA_MUNDO });
    this.configuracion = null; // molde de init(). Entrada, no estado: no se toca
    this.eventos = null; // emisor propio (regla 2). Unico canal entre sistemas
    this.administrador = null; // dueno del tablero y de su dibujo
    this.tablero = null; // array bidimensional, base 1 hacia afuera
    this.registro = null; // potestades consultables por id
    this.cuerpos = null; // correspondencia id -> cuerpo en pantalla
    this.registroDeJugadas = null; // lo dibuja historial.js, lo lee finalidad.js
    this.estadoRonda = null; // seleccionando|esperandoRival|precombate|ejecutando
    this.seleccion = null; // potestad seleccionada y sus orbes abiertas
    this.configDelTurno = null; // id -> { id, nombreDeAccion, objetivo, azar }
    this.orbesSistema = null; // un solo menu radial; se reutiliza por seleccion
  }

  /** @param {object} configuracion molde ya resuelto que entrega vista.js */
  init(configuracion) {
    this.configuracion = configuracion ?? null;
    this.eventos = new Phaser.Events.EventEmitter();
    this.registroDeJugadas = [];
    this.configDelTurno = new Map();
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
    this._registrarInputs();
    this._lanzarInterfaz();
    this._cambiarFase('seleccionando');
  }

  // ── Montaje ───────────────────────────────────────────────────────────────
  // Orden estricto: no hay potestades sin tablero, ni inputs sin saber quien
  // ocupa cada casilla.

  /** Pide el tablero al administrador y guarda las dos referencias. */
  _mostrarTablero() {
    this.administrador = new AdministradorTablero(this, this.eventos);
    this.tablero = this.administrador.construirDesdeMolde(this.configuracion);
    this.administrador.dibujar(this.tablero);
    this.administrador.registrarZoom();
    this.administrador.registrarPaneo();
    this.administrador.registrarHoverCasilla();
    this.administrador.registrarClicCasilla();
  }

  /** El registro ya se instancia aqui; colocar el cuerpo es del puente. */
  async _mostrarPotestades() {
    this.registro = crearRegistro(this.configuracion?.equipos, this);
    const puente = new PotestadesTablero(this, this.tablero, this.registro, this.administrador.tileSize);
    this.cuerpos = await puente.colocar();
    this.orbesSistema = new SistemaDeOrbes(this, this.eventos, this.registro, this.tablero);
  }

  /** El HUD lo anade vista.js, pero lo lanza esta escena: lanzarlo es la unica
   *  forma de inyectarle el emisor sin que el vaya a buscarlo (regla 2). */
  _lanzarInterfaz() {
    this.scene.launch(CLAVE_ESCENA_HUD, { eventos: this.eventos });
  }

  // ── Hub de inputs ─────────────────────────────────────────────────────────

  _registrarInputs() {
    Object.entries(RUTAS_DE_INPUT).forEach(([evento, metodo]) => {
      this.eventos.on(evento, this[metodo], this);
    });
  }

  /** Simetrico y con la misma tabla: ningun listener sobrevive a la batalla. */
  _desregistrarInputs() {
    Object.entries(RUTAS_DE_INPUT).forEach(([evento, metodo]) => {
      this.eventos.off(evento, this[metodo], this);
    });
  }

  // ── Inputs del tablero ────────────────────────────────────────────────────

  _cerrarOrbes() {
    this.orbesSistema?.onDeseleccionar();
    this.seleccion = null;
  }

  /** Clic: abre orbes de esa potestad. Si hay objetivo pendiente, no interrumpe. */
  _alSeleccionarPotestad({ entidad, col, fila }) {
    if (this.orbesSistema?.bloqueandoClic) return;
    this.orbesSistema?.onDeseleccionar();
    this.seleccion = { entidad, col, fila };
    this.orbesSistema?.onSeleccionar(entidad);
  }

  /** Doble clic: el HUD dibuja el panel. escenaAPausar va inyectada (regla 2). */
  _alAbrirPanel({ entidad }) {
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

  /** Casilla vacia: deselecciona. Las marcas de objetivo las atienden las orbes. */
  _alPulsarCasilla() {
    if (this.orbesSistema?.bloqueandoClic) return;
    this._cerrarOrbes();
  }

  // ── Input de las orbes ────────────────────────────────────────────────────

  /** Unico sitio donde se acumula lo que hara el jugador este turno. El azar
   *  llega resuelto por quien confirma: tirarlo aqui divergiria las partidas. */
  _alElegirAccion({ id, nombreDeAccion, objetivo, azar }) {
    this.configDelTurno.set(id, { id, nombreDeAccion, objetivo, azar: azar ?? null });
  }

  /** El panel se cerro: el control vuelve al tablero. */
  _alCerrarPanel() {}

  // ── Inputs de la interfaz ─────────────────────────────────────────────────

  _alConfirmarJugada() { console.log('confirmar'); }
  _alRendirse() { console.log('rendirse'); }
  _alPausar() { console.log('pausa'); }
  _alAbrirHistorial() { console.log('historial'); }
  _alIgnorarInterfaz() { console.log('ignorarInterfaz'); }

  // ── Fase, ronda y fin ─────────────────────────────────────────────────────

  /** El HUD no adivina la fase: se le anuncia y el habilita sus botones. */
  _cambiarFase(estadoRonda) {
    this.estadoRonda = estadoRonda;
    this.eventos.emit('faseCambiada', estadoRonda);
  }

  // Bucle de rondas (spect 010). El registro se anota aunque el historial no se abra.
  _enviarConfiguracion(configuracion, esFinal) {}
  _recibirConfiguracionRival(configuracion) {}
  _ejecutarTurno() {}
  _anotarJugada(jugada) {}
  _terminarBatalla(resultado) {}

  shutdown() {
    this._cerrarOrbes();
    this._desregistrarInputs();
    this.administrador?.destruir();
    this.eventos?.removeAllListeners();
    this.scene.stop(CLAVE_ESCENA_HUD);
  }
}
