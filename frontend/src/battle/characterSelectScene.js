/*

    CONTEXTO DE ESTE JS: bro esto genera toda la parte visual y funcional del panel selectivo del multijugador este tiene que ser mejorado tambien por parte estetica como parte de las reformas del menu
    Modificar esto es muy facil tiene varias clases 
    Este archibo es un 5 en uno ESPONJA ENLOQUESISTE si enloquesi amigo na pero en resumen el primero acciona todo la segunda y cuarta tienen todo lo que no se mueve la tercera controla el tablero y la última controla los 7 botones

*/

import { coneccion, buscarPartida, esperarPartida } from './coneccion.js';

export default class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
    }

    preload() {
        this.load.json('Molde_Multijugador', 'src/battle/AlmacenDeMoldes/Molde_Multiplayer.json');
        this.load.spritesheet('La_roon_01', './assets/images/battle/personajes/roon0.png', { frameWidth: 640, frameHeight: 360 });
        this.load.spritesheet('La_roon_02', './assets/images/battle/personajes/roon1.png', { frameWidth: 640, frameHeight: 360 });
        this.load.spritesheet('La_roon_03', './assets/images/battle/personajes/roon2.png', { frameWidth: 640, frameHeight: 360 });
        this.load.spritesheet('La_roon_04', './assets/images/battle/personajes/roon3.png', { frameWidth: 640, frameHeight: 360 });
    }

    create() {
        // Instanciamos exactamente los 3 módulos
        const staticElements = new StaticElements(this);
        const boardInteraction = new BoardInteraction(this);
        const allyButtons = new AllyButtons(this);

        this.createConfirmButton(allyButtons.allyButtons, boardInteraction.position);

        const parte1 = this.anims.generateFrameNumbers('La_roon_01', { start: 0, end: 14 });
        const parte2 = this.anims.generateFrameNumbers('La_roon_02', { start: 0, end: 6 });
        const parte3 = this.anims.generateFrameNumbers('La_roon_03', { start: 0, end: 7 });
        this.anims.create({
            key: 'tocarPuerta',
            frames: [
                ...parte2,
                { key: 'La_roon_02', frame: 9 },
                { key: 'La_roon_02', frame: 12 },
                { key: 'La_roon_02', frame: 7 },
                { key: 'La_roon_02', frame: 10 },
                { key: 'La_roon_02', frame: 13 },
                { key: 'La_roon_02', frame: 8 },
                { key: 'La_roon_02', frame: 11 },
                { key: 'La_roon_02', frame: 14 },
                ...parte3,
                { key: 'La_roon_03', frame: 9 },
                { key: 'La_roon_03', frame: 12 },
                { key: 'La_roon_03', frame: 8 },
                { key: 'La_roon_03', frame: 10 },
                { key: 'La_roon_03', frame: 11 },
                { key: 'La_roon_03', frame: 13 },
                { key: 'La_roon_03', frame: 14 },
                { key: 'La_roon_04', frame: 0 },
                { key: 'La_roon_04', frame: 3 },
                { key: 'La_roon_04', frame: 1 },
                { key: 'La_roon_04', frame: 2 },
                { key: 'La_roon_04', frame: 4 },
                { key: 'La_roon_04', frame: 5 },
            ],
            frameRate: 8,
            repeat: -1
        });
    }

    createConfirmButton(personajes, posiciones) {
        const x = 530;
        const y = 800;
        const text = this.add.text(x, y, 'Iniciar Batalla', {
            fontFamily: 'impact',
            fontSize: '32px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        const ConfirmButton = this.add.rectangle(x, y, 500, 100, 0x2746F5)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.5)
        ConfirmButton.on('pointerdown', async() => { //200IQ
            this.loquita = this.physics.add.sprite(850, 450, 'La_roon_01').setScale(2.4);
            this.loquita.play('tocarPuerta');
            const equipo = {
                Aliados: [{
                    arquetipo: personajes[0],
                    invetario: [],
                    nivel: 1,
                    posicion: {x: posiciones[0].col+1, y: posiciones[0].row+1}
                },
                {
                    arquetipo: personajes[1],
                    invetario: [],
                    nivel: 1,
                    posicion: {x: posiciones[1].col+1, y: posiciones[1].row+1}
                },
                {
                    arquetipo: personajes[2],
                    invetario: [],
                    nivel: 1,
                    posicion: {x: posiciones[2].col+1, y: posiciones[2].row+1}
                }]
            }
            await coneccion();
            text.setText('Iniciando Batalla...');
            buscarPartida(equipo);
            const respuesta = await esperarPartida();
            if (respuesta.type === 'Partida_No_Encontrada') {
                text.setText('No se encontro partida');
                return;
            }
            const configuracionEquipo = respuesta.data;
            const moldeMultijugador = this.cache.json.get('Molde_Multijugador');
            moldeMultijugador.equipos = configuracionEquipo;
            console.log(configuracionEquipo);

            const aliados = configuracionEquipo.aliados.equipo.Aliados;
            const rival = configuracionEquipo.rival.equipo.Aliados;

            rival.forEach(personaje => { personaje.posicion.x = 11 - personaje.posicion.x});
            moldeMultijugador.equipos.Aliados = aliados;
            moldeMultijugador.equipos.Enemigos = rival;

            this.scene.start('vista', moldeMultijugador);
            this.scene.stop('CharacterSelectScene');
        });
    }
}

class StaticElements {
    /**
     * @param {Phaser.Scene} scene 
     */
    constructor(scene) {
        this.scene = scene;
        this.createStaticUI();
        this.drawBoardGraphics();
    }

    createStaticUI() {
        // Título principal
        this.scene.add.text(570, 120, 'MULTIJUGADOR', {
            fontFamily: 'impact',
            fontSize: '128px',
            color: '#2746F5',
            stroke: '#2C3C91',
            strokeThickness: 10
        }).setOrigin(0.5);

        // Subtítulo sobre el tablero
        this.scene.add.text(1640, 850, 'Pociona tus tropas en el tablero antes de iniciar', {
            fontFamily: 'impact',
            fontSize: '32px',
            color: '#2C3C91',
        }).setOrigin(1, 0.5);

        // Encabezados de Aliados
        const allyPositionsX = [250, 550, 850];
        allyPositionsX.forEach((x, index) => {
            this.scene.add.text(x, 260, `ALIADO ${index + 1}`, {
                fontFamily: 'impact',
                fontSize: '32px',
                color: '#2C3C91',
            }).setOrigin(0.5);
        });
    }

    drawBoardGraphics() {
        const graphics = this.scene.add.graphics();
        graphics.lineStyle(2, 0x509ee3, 0.8);

        // Ajustamos la posición inicial para que quede bien centrado a la derecha
        const startX = 1150;
        const startY = 100;
        
        // Casillas perfectamente cuadradas (100x100 píxeles)
        const cellSize = 100; 
        const cols = 4;
        const rows = 7;

        const totalWidth = cols * cellSize;   // 400px
        const totalHeight = rows * cellSize; // 700px

        // Líneas verticales
        for (let i = 0; i <= cols; i++) {
            graphics.moveTo(startX + (i * cellSize), startY);
            graphics.lineTo(startX + (i * cellSize), startY + totalHeight);
        }

        // Líneas horizontales
        for (let j = 0; j <= rows; j++) {
            graphics.moveTo(startX, startY + (j * cellSize));
            graphics.lineTo(startX + totalWidth, startY + (j * cellSize));
        }

        graphics.strokePath();
    }
}

class BoardInteraction {
    /**
     * @param {Phaser.Scene} scene 
     */
    constructor(scene) {
        this.scene = scene;
        this.startX = 1150;
        this.startY = 100;
        this.cellSize = 100; // Cuadradas
        this.cols = 4;
        this.rows = 7; // Ahora son 7 filas
        this.selectedPosition = [
            { num: 1, col: 1, row: 1 }, // Fila 2, Columna 2
            { num: 2, col: 1, row: 3 }, // Fila 4, Columna 2
            { num: 3, col: 1, row: 5 }  // Fila 6, Columna 2
        ];
        // Estado del tablero: "fila,columna" -> círculo que la ocupa.
        // Es la única fuente de verdad; nunca deducimos ocupación desde píxeles.
        this.occupancy = new Map();
        this.selectedCircle = null;

        this.setupGridInteractions();
        this.setupBoardCircles();
    }

    get position() {
        return this.selectedPosition;
    }

    // Traduce coordenadas de tablero (fila/columna) al centro de la casilla en píxeles
    cellToWorld(row, col) {
        return {
            x: this.startX + (col * this.cellSize) + (this.cellSize / 2),
            y: this.startY + (row * this.cellSize) + (this.cellSize / 2)
        };
    }

    cellKey(row, col) {
        return `${row},${col}`;
    }

    setupGridInteractions() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const { x, y } = this.cellToWorld(r, c);

                const zone = this.scene.add.zone(x, y, this.cellSize, this.cellSize)
                    .setInteractive({ useHandCursor: true });

                zone.on('pointerdown', () => this.handleCellClick(r, c));
            }
        }
    }

    setupBoardCircles() {
        // Distribuimos los 3 círculos a lo largo de las 7 filas
        const circleData = this.selectedPosition;

        circleData.forEach(data => {
            const circle = new BoardCircle(this.scene, this, data.num, data.row, data.col);
            this.occupancy.set(this.cellKey(data.row, data.col), circle);
        });
    }

    // Único punto de entrada del tablero: toda la interacción pasa por aquí
    handleCellClick(row, col) {
        const occupant = this.occupancy.get(this.cellKey(row, col)) || null;

        // Sin nada seleccionado: solo una casilla ocupada hace algo
        if (!this.selectedCircle) {
            if (occupant) this.selectCircle(occupant);
            return;
        }

        // Casilla ocupada: si es el mismo círculo se deselecciona, si es otro cambia el foco
        if (occupant) {
            this.selectCircle(occupant === this.selectedCircle ? null : occupant);
            return;
        }

        this.moveSelectedTo(row, col);
    }

    selectCircle(circle) {
        if (this.selectedCircle) this.selectedCircle.setSelected(false);
        this.selectedCircle = circle;
        if (circle) circle.setSelected(true);
    }

    moveSelectedTo(row, col) {
        const circle = this.selectedCircle;

        // Liberamos la casilla vieja antes de reservar la nueva
        this.occupancy.delete(this.cellKey(circle.row, circle.col));
        this.occupancy.set(this.cellKey(row, col), circle);

        circle.moveTo(circle.num, row, col, this.cellToWorld(row, col));
        this.selectedPosition[circle.num-1].col = col;
        this.selectedPosition[circle.num-1].row = row;
        this.selectCircle(null);
    }
}

class BoardCircle {
    /**
     * @param {Phaser.Scene} scene
     * @param {BoardInteraction} board
     */
    constructor(scene, board, num, row, col) {
        this.scene = scene;
        this.num = num;
        this.row = row;
        this.col = col;
        this.radius = 28;
        
        const { x, y } = board.cellToWorld(row, col);

        // Dibujo y número van en (0,0) LOCAL: mover el contenedor los mueve juntos
        this.graphics = scene.add.graphics();
        this.label = scene.add.text(0, 0, `${num}`, {
            fontFamily: 'impact',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);

        this.container = scene.add.container(x, y, [this.graphics, this.label]);

        this.setSelected(false);
    }

    setSelected(isSelected) {
        this.isSelected = isSelected;

        this.graphics.clear();
        if (isSelected) {
            this.graphics.fillStyle(0xffd54f, 0.18);
            this.graphics.fillCircle(0, 0, this.radius);
        }
        this.graphics.lineStyle(isSelected ? 4 : 2, isSelected ? 0xffd54f : 0x61a8e8, 1);
        this.graphics.strokeCircle(0, 0, this.radius);
    }

    moveTo(num, row, col, worldPos) {
        this.num = num;
        this.row = row;
        this.col = col;

        this.scene.tweens.add({
            targets: this.container,
            x: worldPos.x,
            y: worldPos.y,
            duration: 180,
            ease: 'Cubic.easeOut'
        });
    }
}

class AllyButtons {
    /**
     * @param {Phaser.Scene} scene 
     */
    constructor(scene) {
        this.scene = scene;
        this.allyPositionsX = [250, 550, 850];
        this.opcionesDeSelección = ['Campesino', 'Mago', 'Realista', 'Intelectual', 'Sectario']
        this.selectedCharacter = ['Campesino', 'Campesino', 'Campesino']

        this.createCampesinoButtons();
        this.createInspectButtons()

    }

    get allyButtons() {
        return this.selectedCharacter;
    }

    createCampesinoButtons() {
        // 3 Botones 
        this.allyPositionsX.forEach((x, index) => {
            const y = 440;
            let seleccion = 0
            const text = this.scene.add.text(x, y, this.opcionesDeSelección[seleccion], { //por defecto
                fontFamily: 'impact',
                fontSize: '32px',
                color: '#FFFFFF',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            text.on('pointerdown', () => {
                if (seleccion === 4) {
                    seleccion = 0
                } else {
                    seleccion++
                }
                text.setText(this.opcionesDeSelección[seleccion])
                this.selectedCharacter[index] = this.opcionesDeSelección[seleccion]
            });
        });
    }

    createInspectButtons() {
        // 3 Círculos con texto que actúan como botón "inspeccionar" debajo de cada uno
        this.allyPositionsX.forEach((x, index) => {
            const y = 620;
            const radius = 55;

            // Dibuja el círculo del botón
            const graphics = this.scene.add.graphics();
            graphics.lineStyle(2, 0x61a8e8, 1);
            graphics.strokeCircle(x, y, radius);

            // Texto "Inspeccionar" (o el rol que le des)
            const text = this.scene.add.text(x, y, 'Ver', {
                fontFamily: 'impact',
                fontSize: '32px',
                color: '#FFFFFF',
            }).setOrigin(0.5);

            // Convertir la zona del círculo en interactiva
            const zone = this.scene.add.zone(x, y, radius * 2, radius * 2)
                .setInteractive({ useHandCursor: true });

            zone.on('pointerdown', () => {
                console.log(`Botón Inspeccionar (Círculo) del Aliado ${index + 1} clicado (sin acción)`);
            });
        });
    }
}
