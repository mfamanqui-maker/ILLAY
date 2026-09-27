/**
 * overlayEmpareje.js — Cubre el vestibulo al buscar partida.
 *
 * Tres animaciones de atlas (buscando, encontrada, transicion).
 * La escena solo llama mostrar / fallo / transicion; no conoce frames.
 */

import { esperarReloj } from '../coneccion.js';
import { CLAVE_ESCENA_HUD, CLAVE_ESCENA_MUNDO } from '../vista.js';

export default class OverlayEmpareje {
    constructor(escena) {
        this.escena = escena;
        this.crearAnimaciones();
        this.crearSprites();
    }

    static precargar(escena) {
        escena.load.atlas(
            'buscandoAtlas',
            'assets/images/battle/personajes/bucandoPartida.png',
            'assets/images/battle/personajes/bucandoPartida.json',
        );
        escena.load.atlas(
            'encontradaAtlas',
            'assets/images/battle/personajes/partidaEncontrada.png',
            'assets/images/battle/personajes/partidaEncontrada.json',
        );
        escena.load.atlas(
            'transicionAtlas',
            'assets/images/battle/personajes/Transición.png',
            'assets/images/battle/personajes/Transición.json',
        );
    }

    crearAnimaciones() {
        this.crearAnimacionOrdenada('anim_buscando', 'buscandoAtlas', 'ezgif-frame-', 12, -1);
        this.crearAnimacionOrdenada('anim_encontrada', 'encontradaAtlas', 'ezgif-frame-', 12, -1);
        this.crearAnimacionOrdenada('anim_transicion', 'transicionAtlas', 'ezgif-frame-', 24, 0);
    }

    crearAnimacionOrdenada(clave, atlas, prefijo, fps, repeat) {
        const nombres = this.escena.textures.get(atlas).getFrameNames()
            .filter((nombre) => nombre.startsWith(prefijo) && nombre !== '__BASE')
            .sort((a, b) => Number(a.replace(prefijo, '')) - Number(b.replace(prefijo, '')));
        const frames = nombres.map((frame) => ({ key: atlas, frame }));
        this.escena.anims.create({ key: clave, frames, frameRate: fps, repeat });
    }

    crearSprites() {
        const w = this.escena.scale.width;
        const h = this.escena.scale.height;
        this.sprite = this.escena.add.sprite(w / 2, h / 2, 'buscandoAtlas')
            .setVisible(false)
            .setDepth(1000);
        this.texto = this.escena.add.text(w / 2, h * 0.88, '', {
            fontFamily: 'impact',
            fontSize: '36px',
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: w * 0.8 },
        }).setOrigin(0.5).setDepth(1001).setVisible(false);
    }

    cubrirPantalla(sprite) {
        const w = this.escena.scale.width;
        const h = this.escena.scale.height;
        const fw = sprite.frame?.width || sprite.width || 1;
        const fh = sprite.frame?.height || sprite.height || 1;
        sprite.setPosition(w / 2, h / 2);
        sprite.setScale(Math.max(w / fw, h / fh));
        sprite.setDepth(1000);
    }

    mostrar(claveAnim, mensaje) {
        this.sprite.setVisible(true);
        this.sprite.play(claveAnim);
        this.cubrirPantalla(this.sprite);
        this.texto.setText(mensaje).setVisible(true);
    }

    ocultar() {
        this.sprite.stop();
        this.sprite.setVisible(false);
        this.texto.setVisible(false);
        this.texto.setText('');
        const escena = this.escena;
        if (escena.botonTexto) escena.botonTexto.setText('Iniciar Batalla');
        escena.botonConfirmar?.setInteractive({ useHandCursor: true });
    }

    /** Una pasada completa, aunque el resto del flujo ya haya terminado. */
    esperarAlMenosUnaPasada() {
        const sprite = this.sprite;
        const anim = sprite.anims.currentAnim;
        const fps = anim?.frameRate || 12;
        const frames = anim?.frames?.length || 12;
        const ms = Math.ceil((frames / fps) * 1000) + 150;
        const evento = anim?.repeat === 0 ? 'animationcomplete' : 'animationrepeat';
        return Promise.race([
            new Promise((resolve) => { sprite.once(evento, resolve); }),
            esperarReloj(ms),
        ]);
    }

    async volverAlMultijugador() {
        await esperarReloj(2000);
        this.ocultar();
    }

    async mostrarFallo(mensaje) {
        this.sprite.stop();
        this.texto.setText(mensaje).setVisible(true);
        await this.volverAlMultijugador();
    }

    /** Quita el selector entero. Solo queda el sprite de transicion, al frente. */
    vaciarSelectorMenosTransicion() {
        this.texto?.destroy();
        this.texto = null;
        this.escena.botonConfirmar = null;
        this.escena.botonTexto = null;
        this.escena.children.getAll().forEach((hijo) => {
            if (hijo !== this.sprite) hijo.destroy();
        });
    }

    mantenerEncima() {
        this.escena.scene.bringToTop();
        const mundo = this.escena.game.scene.getScene(CLAVE_ESCENA_MUNDO);
        mundo?.events.once(Phaser.Scenes.Events.CREATE, () => {
            this.escena.scene.bringToTop();
            this.escena.game.scene.getScene(CLAVE_ESCENA_HUD)
                ?.events.once(Phaser.Scenes.Events.CREATE, () => this.escena.scene.bringToTop());
        });
    }

    /**
     * hideOnComplete + ocultar antes de scene.stop: si se destruye o se
     * para la anim, Phaser vuelve al frame 0 (pantalla llena) y ensucia
     * el fade final.
     */
    async reproducirTransicionYSalir() {
        const sprite = this.sprite;
        const fin = new Promise((resolve) => {
            sprite.once('animationcomplete', () => {
                sprite.setVisible(false);
                sprite.setAlpha(0);
                resolve();
            });
        });
        sprite.setVisible(true).setAlpha(1);
        sprite.play({ key: 'anim_transicion', hideOnComplete: true, repeat: 0 });
        this.cubrirPantalla(sprite);
        sprite.setDepth(Number.MAX_SAFE_INTEGER);
        const anim = sprite.anims.currentAnim;
        const tope = Math.ceil(((anim?.frames?.length || 24) / (anim?.frameRate || 24)) * 1000) + 200;
        await Promise.race([fin, esperarReloj(tope)]);
        sprite.setVisible(false);
        sprite.setAlpha(0);
        this.escena.scene.stop();
    }
}
