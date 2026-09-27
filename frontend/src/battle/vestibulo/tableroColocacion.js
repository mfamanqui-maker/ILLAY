/**
 * tableroColocacion.js — Lado derecho del vestibulo: grid y tres circulos.
 *
 * occupancy es la unica fuente de verdad. No se deduce ocupacion por pixeles.
 */

export class ElementosFijos {
    /**
     * @param {Phaser.Scene} escena
     */
    constructor(escena) {
        this.escena = escena;
        this.crearTextos();
        this.dibujarGrid();
    }

    crearTextos() {
        this.escena.add.text(570, 120, 'MULTIJUGADOR', {
            fontFamily: 'impact',
            fontSize: '128px',
            color: '#2746F5',
            stroke: '#2C3C91',
            strokeThickness: 10,
        }).setOrigin(0.5);

        this.escena.add.text(1640, 850, 'Pociona tus tropas en el tablero antes de iniciar', {
            fontFamily: 'impact',
            fontSize: '32px',
            color: '#2C3C91',
        }).setOrigin(1, 0.5);

        const allyPositionsX = [250, 550, 850];
        allyPositionsX.forEach((x, index) => {
            this.escena.add.text(x, 260, `ALIADO ${index + 1}`, {
                fontFamily: 'impact',
                fontSize: '32px',
                color: '#2C3C91',
            }).setOrigin(0.5);
        });
    }

    dibujarGrid() {
        const graphics = this.escena.add.graphics();
        graphics.lineStyle(2, 0x509ee3, 0.8);

        const startX = 1150;
        const startY = 100;
        const cellSize = 100;
        const cols = 4;
        const rows = 7;
        const totalWidth = cols * cellSize;
        const totalHeight = rows * cellSize;

        for (let i = 0; i <= cols; i++) {
            graphics.moveTo(startX + (i * cellSize), startY);
            graphics.lineTo(startX + (i * cellSize), startY + totalHeight);
        }
        for (let j = 0; j <= rows; j++) {
            graphics.moveTo(startX, startY + (j * cellSize));
            graphics.lineTo(startX + totalWidth, startY + (j * cellSize));
        }
        graphics.strokePath();
    }
}

export class TableroColocacion {
    /**
     * @param {Phaser.Scene} escena
     */
    constructor(escena) {
        this.escena = escena;
        this.startX = 1150;
        this.startY = 100;
        this.cellSize = 100;
        this.cols = 4;
        this.rows = 7;
        this.selectedPosition = [
            { num: 1, col: 1, row: 1 },
            { num: 2, col: 1, row: 3 },
            { num: 3, col: 1, row: 5 },
        ];
        this.occupancy = new Map();
        this.selectedCircle = null;

        this.armarZonas();
        this.armarCirculos();
    }

    get position() {
        return this.selectedPosition;
    }

    cellToWorld(row, col) {
        return {
            x: this.startX + (col * this.cellSize) + (this.cellSize / 2),
            y: this.startY + (row * this.cellSize) + (this.cellSize / 2),
        };
    }

    cellKey(row, col) {
        return `${row},${col}`;
    }

    armarZonas() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const { x, y } = this.cellToWorld(r, c);
                const zone = this.escena.add.zone(x, y, this.cellSize, this.cellSize)
                    .setInteractive({ useHandCursor: true });
                zone.on('pointerdown', () => this.handleCellClick(r, c));
            }
        }
    }

    armarCirculos() {
        this.selectedPosition.forEach((data) => {
            const circle = new CirculoTablero(this.escena, this, data.num, data.row, data.col);
            this.occupancy.set(this.cellKey(data.row, data.col), circle);
        });
    }

    handleCellClick(row, col) {
        const occupant = this.occupancy.get(this.cellKey(row, col)) || null;

        if (!this.selectedCircle) {
            if (occupant) this.selectCircle(occupant);
            return;
        }
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
        this.occupancy.delete(this.cellKey(circle.row, circle.col));
        this.occupancy.set(this.cellKey(row, col), circle);
        circle.moveTo(circle.num, row, col, this.cellToWorld(row, col));
        this.selectedPosition[circle.num - 1].col = col;
        this.selectedPosition[circle.num - 1].row = row;
        this.selectCircle(null);
    }
}

class CirculoTablero {
    /**
     * @param {Phaser.Scene} escena
     * @param {TableroColocacion} tablero
     */
    constructor(escena, tablero, num, row, col) {
        this.escena = escena;
        this.num = num;
        this.row = row;
        this.col = col;
        this.radius = 28;

        const { x, y } = tablero.cellToWorld(row, col);
        this.graphics = escena.add.graphics();
        this.label = escena.add.text(0, 0, `${num}`, {
            fontFamily: 'impact',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        this.container = escena.add.container(x, y, [this.graphics, this.label]);
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
        this.escena.tweens.add({
            targets: this.container,
            x: worldPos.x,
            y: worldPos.y,
            duration: 180,
            ease: 'Cubic.easeOut',
        });
    }
}
