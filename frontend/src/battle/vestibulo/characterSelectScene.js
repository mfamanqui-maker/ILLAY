/**
 * characterSelectScene.js — Vestibulo de multijugador.
 *
 * Orquesta: tablero de colocacion, slots de aliados, overlay de empareje
 * y el salto a PhaserMaster. No dibuja el grid ni habla WebSocket a pelo.
 */

import { coneccion, buscarPartida, esperarPartida, esperarReloj, cancelarEsperas, AdministradorTablero, descriptoresDeSpritesheet, precargarOrbes, lanzarBatallaEnFondo, OverlayEmpareje, ElementosFijos, TableroColocacion, BotonesAliados, CLAVE_ESCENA_MUNDO } from './indexVestibulo.js';

export default class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
    }

    preload() {
        this.load.json('Molde_Multijugador', 'src/battle/AlmacenDeMoldes/Molde_Multiplayer.json');
        OverlayEmpareje.precargar(this);
    }

    create() {
        new ElementosFijos(this);
        const tablero = new TableroColocacion(this);
        const aliados = new BotonesAliados(this);
        this.overlay = new OverlayEmpareje(this);
        this.crearBotonConfirmar(aliados.allyButtons, tablero.position);
    }

    crearBotonConfirmar(personajes, posiciones) {
        const x = 530;
        const y = 800;
        this.botonTexto = this.add.text(x, y, 'Iniciar Batalla', {
            fontFamily: 'impact',
            fontSize: '32px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        this.botonConfirmar = this.add.rectangle(x, y, 500, 100, 0x2746F5)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.5);
        this.botonConfirmar.on('pointerdown', async () => {
            this.botonConfirmar.disableInteractive();
            await this.buscarYEntrar(personajes, posiciones);
        });
    }

    armarEquipo(personajes, posiciones) {
        return {
            Aliados: [0, 1, 2].map((i) => ({
                arquetipo: personajes[i],
                invetario: [],
                nivel: 1,
                posicion: { x: posiciones[i].col + 1, y: posiciones[i].row + 1 },
            })),
        };
    }

    armarMolde(configuracionEquipo) {
        const plantilla = this.cache.json.get('Molde_Multijugador');
        const molde = structuredClone(plantilla);
        const aliados = configuracionEquipo.aliados.equipo.Aliados;
        const rival = configuracionEquipo.rival.equipo.Aliados.map((personaje) => ({
            ...personaje,
            posicion: { ...personaje.posicion, x: 11 - personaje.posicion.x },
        }));
        molde.equipos = { Aliados: aliados, Enemigos: rival };
        return molde;
    }

    async buscarYEntrar(personajes, posiciones) {
        this.overlay.mostrar('anim_buscando', 'Buscando partida');
        const pasadaBuscando = this.overlay.esperarAlMenosUnaPasada();

        try {
            await coneccion();
        } catch {
            await pasadaBuscando;
            await this.overlay.mostrarFallo('SERVIDOR APAGADO ADMIN OCUPADO');
            return;
        }

        let respuesta;
        try {
            const pendiente = esperarPartida();
            buscarPartida(this.armarEquipo(personajes, posiciones));
            respuesta = await pendiente;
        } catch {
            cancelarEsperas(['Partida_Encontrada', 'Partida_No_Encontrada']);
            await pasadaBuscando;
            await this.overlay.mostrarFallo('No se encontraron coincidencias');
            return;
        }
        cancelarEsperas(['Partida_Encontrada', 'Partida_No_Encontrada']);
        await pasadaBuscando;
        if (respuesta.type === 'Partida_No_Encontrada') {
            await this.overlay.mostrarFallo('No se encontraron coincidencias');
            return;
        }
        try {
            await this.entrarAPartida(respuesta.data);
        } catch (error) {
            console.error('[CharacterSelect] entrarAPartida:', error);
            await this.overlay.mostrarFallo('No se pudo entrar a la partida');
        }
    }

    async entrarAPartida(configuracionEquipo) {
        this.overlay.mostrar('anim_encontrada', 'Partida encontrada');
        const pasadaEncontrada = this.overlay.esperarAlMenosUnaPasada();
        const molde = this.armarMolde(configuracionEquipo);
        await Promise.all([
            Promise.race([
                this.precargarRecursosDeBatalla(molde),
                esperarReloj(8000),
            ]),
            pasadaEncontrada,
        ]);
        lanzarBatallaEnFondo(this, molde);
        this.overlay.vaciarSelectorMenosTransicion();
        await this.esperarMundoListo();
        this.overlay.mantenerEncima();
        await this.overlay.reproducirTransicionYSalir();
    }

    esperarMundoListo() {
        const mundo = this.game.scene.getScene(CLAVE_ESCENA_MUNDO);
        if (!mundo) return esperarReloj(0);
        if (mundo.tablero) return Promise.resolve();
        return Promise.race([
            new Promise((resolve) => {
                mundo.events.once(Phaser.Scenes.Events.CREATE, resolve);
            }),
            esperarReloj(8000),
        ]);
    }

    precargarRecursosDeBatalla(molde) {
        AdministradorTablero.precargar(this);
        descriptoresDeSpritesheet(molde.equipos).forEach((d) => {
            if (d.archivo) {
                this.load.spritesheet(d.clave, d.archivo, {
                    frameWidth: d.ancho,
                    frameHeight: d.alto,
                });
            }
        });
        precargarOrbes(this);
        if (!this.load.list?.size) return Promise.resolve();
        return new Promise((resolve) => {
            this.load.once('complete', resolve);
            this.load.start();
        });
    }
}
