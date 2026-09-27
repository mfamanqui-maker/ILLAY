/**
 * botonesAliados.js — Tres slots de potestad + boton Ver del vestibulo.
 */

import { abrirPanelEntidad, precargarAssetsPanelEntidad } from '../panelEntidad/index.js';
import { precargarTodosLosTextos, registrarTodosLosFramesTexto } from '../panelEntidad/GenerarTexto/index.js';
import { adaptarParaPanel, resolverClase } from '../datosDePotestades/IndexDePotestades.js';

/** El panel solo se abre con Ver. No viaja en el preload del vestibulo. */
function asegurarPanelEntidad(escena) {
    if (escena.panelEntidadListo) return Promise.resolve();
    if (escena.panelEntidadCargando) return escena.panelEntidadCargando;

    precargarAssetsPanelEntidad(escena);
    precargarTodosLosTextos(escena);

    const terminar = () => {
        registrarTodosLosFramesTexto(escena);
        escena.panelEntidadListo = true;
        escena.panelEntidadCargando = null;
    };

    if (!escena.load.list?.size) {
        terminar();
        return Promise.resolve();
    }

    escena.panelEntidadCargando = new Promise((resolve) => {
        escena.load.once('complete', () => {
            terminar();
            resolve();
        });
        escena.load.start();
    });
    return escena.panelEntidadCargando;
}

function datosPanelDeArquetipo(arquetipo) {
    const Clase = resolverClase({ arquetipo });
    const potestad = new Clase({ arquetipo, nivel: 1, invetario: [] }, 'Aliados');
    if (potestad.hpInicial == null) potestad.hpInicial = potestad.estadisticas?.hp ?? 0;
    return adaptarParaPanel(potestad, 'Aliados', {
        porBando: (bando) => (bando === 'Aliados' ? [{ potestad }] : []),
    });
}

export default class BotonesAliados {
    /**
     * @param {Phaser.Scene} escena
     */
    constructor(escena) {
        this.escena = escena;
        this.allyPositionsX = [250, 550, 850];
        this.opcionesDeSeleccion = ['Campesino', 'Mago', 'Realista', 'Intelectual', 'Sectario'];
        this.selectedCharacter = ['Campesino', 'Campesino', 'Campesino'];
        this.crearCiclos();
        this.crearInspeccion();
    }

    get allyButtons() {
        return this.selectedCharacter;
    }

    crearCiclos() {
        this.allyPositionsX.forEach((x, index) => {
            const y = 440;
            let seleccion = 0;
            const text = this.escena.add.text(x, y, this.opcionesDeSeleccion[seleccion], {
                fontFamily: 'impact',
                fontSize: '32px',
                color: '#FFFFFF',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            text.on('pointerdown', () => {
                seleccion = seleccion === 4 ? 0 : seleccion + 1;
                text.setText(this.opcionesDeSeleccion[seleccion]);
                this.selectedCharacter[index] = this.opcionesDeSeleccion[seleccion];
            });
        });
    }

    crearInspeccion() {
        this.allyPositionsX.forEach((x, index) => {
            const y = 620;
            const radius = 55;
            const graphics = this.escena.add.graphics();
            graphics.lineStyle(2, 0x61a8e8, 1);
            graphics.strokeCircle(x, y, radius);
            this.escena.add.text(x, y, 'Ver', {
                fontFamily: 'impact',
                fontSize: '32px',
                color: '#FFFFFF',
            }).setOrigin(0.5);
            const zone = this.escena.add.zone(x, y, radius * 2, radius * 2)
                .setInteractive({ useHandCursor: true });
            zone.on('pointerdown', async () => {
                await asegurarPanelEntidad(this.escena);
                const datos = datosPanelDeArquetipo(this.selectedCharacter[index]);
                if (datos) abrirPanelEntidad(this.escena, datos);
            });
        });
    }
}
