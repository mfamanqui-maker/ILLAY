/**
 * controlDeCarga.js — Pantalla de carga del mundo.
 *
 * PhaserMaster la dirige. Primero entran los atlas de la animación;
 * con eso en pantalla, el resto de mapas e imágenes se pide junto.
 */

import Aldea from "./chunks/aldea.js";
import { RECURSOS_TERRENO } from "./chunks/forest.js";

const ATLAS = [
  ["buscandoAtlas", "assets/images/battle/personajes/bucandoPartida.png", "assets/images/battle/personajes/bucandoPartida.json"],
  ["encontradaAtlas", "assets/images/battle/personajes/partidaEncontrada.png", "assets/images/battle/personajes/partidaEncontrada.json"],
  ["transicionAtlas", "assets/images/battle/personajes/transicion.png", "assets/images/battle/personajes/transicion.json"]
];

export default class ControlDeCarga {
  constructor(escena) {
    this.escena = escena;
    this.sprite = null;
    this.texto = null;
    this.ui = null;
    this.propio = false;
  }

  static precargar(escena) {
    for (const [clave, imagen, datos] of ATLAS) {
      escena.load.atlas(clave, imagen, datos);
    }
  }

  iniciar() {
    this.crearCamara();
    this.crearAnimaciones();
    this.propio = true;
    this.crearSprites();
    this.propio = false;
    this.escena.cameras.main.ignore([this.sprite, this.texto]);
    this.mostrar("anim_buscando", "cargando mapas");
  }

  crearCamara() {
    const escala = this.escena.scale;
    this.ui = this.escena.cameras.add(0, 0, escala.width, escala.height);
    this.ui.setZoom(1);
    this.ui.setScroll(0, 0);
    this.ui.transparent = true;
    this.ui.setBackgroundColor("rgba(0,0,0,0)");
    this.alAgregar = (hijo) => {
      if (this.propio || !this.ui) return;
      this.ui.ignore(hijo);
    };
    this.escena.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.alAgregar);
  }

  crearAnimaciones() {
    this.crearAnimacionOrdenada("anim_buscando", "buscandoAtlas", "ezgif-frame-", 12, -1);
    this.crearAnimacionOrdenada("anim_encontrada", "encontradaAtlas", "ezgif-frame-", 12, -1);
    this.crearAnimacionOrdenada("anim_transicion", "transicionAtlas", "ezgif-frame-", 24, 0);
  }

  crearAnimacionOrdenada(clave, atlas, prefijo, fps, repeat) {
    if (this.escena.anims.exists(clave)) return;
    const nombres = this.escena.textures.get(atlas).getFrameNames()
      .filter((nombre) => nombre.startsWith(prefijo) && nombre !== "__BASE")
      .sort((a, b) => Number(a.replace(prefijo, "")) - Number(b.replace(prefijo, "")));
    const frames = nombres.map((frame) => ({ key: atlas, frame }));
    this.escena.anims.create({ key: clave, frames, frameRate: fps, repeat });
  }

  crearSprites() {
    const w = this.escena.scale.width;
    const h = this.escena.scale.height;
    this.sprite = this.escena.add.sprite(w / 2, h / 2, "buscandoAtlas")
      .setScrollFactor(0)
      .setDepth(Number.MAX_SAFE_INTEGER - 1)
      .setVisible(false);
    this.texto = this.escena.add.text(w / 2, h * 0.88, "", {
      fontFamily: "impact",
      fontSize: "36px",
      color: "#FFFFFF",
      align: "center",
      wordWrap: { width: w * 0.8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(Number.MAX_SAFE_INTEGER).setVisible(false);
  }

  cubrirPantalla(sprite) {
    const w = this.escena.scale.width;
    const h = this.escena.scale.height;
    const fw = sprite.frame?.width || sprite.width || 1;
    const fh = sprite.frame?.height || sprite.height || 1;
    sprite.setPosition(w / 2, h / 2);
    sprite.setScale(Math.max(w / fw, h / fh));
  }

  mostrar(claveAnim, mensaje) {
    this.sprite.setVisible(true).setAlpha(1);
    if (this.escena.anims.exists(claveAnim)) this.sprite.play(claveAnim);
    this.cubrirPantalla(this.sprite);
    this.texto?.setText(mensaje).setVisible(true);
  }

  esperar(ms) {
    return new Promise((resolve) => {
      this.escena.time.delayedCall(ms, resolve);
    });
  }

  esperarAlMenosUnaPasada() {
    const sprite = this.sprite;
    const anim = sprite.anims.currentAnim;
    const fps = anim?.frameRate || 12;
    const frames = anim?.frames?.length || 12;
    const ms = Math.ceil((frames / fps) * 1000) + 150;
    const evento = anim?.repeat === 0 ? "animationcomplete" : "animationrepeat";
    return Promise.race([
      new Promise((resolve) => { sprite.once(evento, resolve); }),
      this.esperar(ms)
    ]);
  }

  /**
   * Mete terreno, personaje y aldeas en la misma cola y espera
   * a que bajen, sin cortar antes de un ciclo de la animación.
   */
  cargarMapas(control) {
    const escena = this.escena;
    escena.load.image(RECURSOS_TERRENO.suelo.clave, RECURSOS_TERRENO.suelo.imagen);
    escena.load.image(RECURSOS_TERRENO.agua.clave, RECURSOS_TERRENO.agua.imagen);
    escena.load.image(RECURSOS_TERRENO.arboles.clave, RECURSOS_TERRENO.arboles.imagen);
    control.precargar();
    Aldea.precargar(escena);

    const pasada = this.esperarAlMenosUnaPasada();
    const descarga = new Promise((resolve) => {
      if (!escena.load.list?.size) {
        resolve();
        return;
      }
      const alFallar = (archivo) => {
        console.error("[Carga] No se pudo cargar", archivo?.key || archivo);
      };
      escena.load.on("loaderror", alFallar);
      escena.load.once("complete", () => {
        escena.load.off("loaderror", alFallar);
        resolve();
      });
      escena.load.start();
    });

    return Promise.all([descarga, pasada]);
  }

  async mostrarCargados() {
    this.mostrar("anim_encontrada", "mapas cargados");
    await this.esperarAlMenosUnaPasada();
  }

  async transicion() {
    const sprite = this.sprite;
    this.texto?.destroy();
    this.texto = null;

    if (!sprite || !this.escena.anims.exists("anim_transicion")) {
      this.cerrar();
      return;
    }

    const fin = new Promise((resolve) => {
      sprite.once("animationcomplete", () => {
        sprite.setVisible(false);
        sprite.setAlpha(0);
        resolve();
      });
    });
    sprite.setVisible(true).setAlpha(1);
    sprite.play({ key: "anim_transicion", hideOnComplete: true, repeat: 0 });
    this.cubrirPantalla(sprite);
    const anim = sprite.anims.currentAnim;
    const tope = Math.ceil(((anim?.frames?.length || 24) / (anim?.frameRate || 24)) * 1000) + 200;
    await Promise.race([fin, this.esperar(tope)]);
    sprite.setVisible(false);
    sprite.setAlpha(0);
    this.cerrar();
  }

  cerrar() {
    if (this.alAgregar) {
      this.escena.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.alAgregar);
      this.alAgregar = null;
    }
    this.texto?.destroy();
    this.texto = null;
    this.sprite?.destroy();
    this.sprite = null;
    if (this.ui) {
      this.escena.cameras.remove(this.ui);
      this.ui = null;
    }
  }
}
