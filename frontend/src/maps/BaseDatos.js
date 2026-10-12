// frontend/src/maps/BaseDatos.js

export default class BaseDatos {
    constructor() {
      this.resetear();
    }
  
    resetear() {
      this.seed = null;
  
      this.jugador = {
        x: 0,
        y: 0,
        direccion: "down"
      };
  
      this.mapaActual = {
        id: null,
        tipo: null
      };
  
      // Chunks colocados en el mundo.
      this.chunks = new Map();
  
      // Estado de puertas, cofres y otros objetos.
      this.objetos = new Map();
  
      // Datos adicionales que necesitaremos más adelante.
      this.datosPartida = {};
    }
  
    // ==============================
    // SEMILLA DEL MUNDO
    // ==============================
  
    establecerSemilla(seed) {
      if (!Number.isInteger(seed)) {
        throw new TypeError(
          "La semilla debe ser un número entero."
        );
      }
  
      this.seed = seed;
    }
  
    obtenerSemilla() {
      return this.seed;
    }
  
    // ==============================
    // POSICIÓN DEL JUGADOR
    // ==============================
  
    guardarPosicionJugador(x, y, direccion) {
      this.jugador.x = x;
      this.jugador.y = y;
  
      if (direccion !== undefined) {
        this.jugador.direccion = direccion;
      }
    }
  
    obtenerPosicionJugador() {
      return { ...this.jugador };
    }
  
    // ==============================
    // MAPA ACTUAL
    // ==============================
  
    establecerMapa(id, tipo) {
      this.mapaActual = { id, tipo };
    }
  
    obtenerMapaActual() {
      return { ...this.mapaActual };
    }
  
    // ==============================
    // CHUNKS
    // ==============================
  
    registrarChunk(id, datos) {
      if (this.chunks.has(id)) {
        throw new Error(`El chunk "${id}" ya existe.`);
      }
  
      this.chunks.set(id, { ...datos });
    }
  
    obtenerChunk(id) {
      return this.chunks.get(id) ?? null;
    }
  
    obtenerTodosLosChunks() {
      return Array.from(this.chunks.entries());
    }
  
    // ==============================
    // OBJETOS INTERACTIVOS
    // ==============================
  
    registrarObjeto(id, estadoInicial = {}) {
      if (this.objetos.has(id)) {
        throw new Error(`El objeto "${id}" ya existe.`);
      }
  
      this.objetos.set(id, { ...estadoInicial });
    }
  
    actualizarObjeto(id, cambios) {
      const estado = this.objetos.get(id);
  
      if (!estado) {
        throw new Error(
          `No existe el objeto "${id}".`
        );
      }
  
      Object.assign(estado, cambios);
    }
  
    obtenerEstadoObjeto(id) {
      const estado = this.objetos.get(id);
  
      return estado ? { ...estado } : null;
    }
  
    // ==============================
    // DATOS ADICIONALES
    // ==============================
  
    guardarDato(clave, valor) {
      this.datosPartida[clave] = valor;
    }
  
    obtenerDato(clave) {
      return this.datosPartida[clave] ?? null;
    }
  }