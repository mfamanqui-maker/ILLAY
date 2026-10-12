export default class InstruccionesScene extends Phaser.Scene {
  constructor() {
    super({ key: 'instrucciones' });
  }
  create() {
    const estilo = { fontSize: '28px', color: '#ffffff' };
    const estiloGrande = { fontSize: '32px', color: '#ffffff' };
    
    // Fase: Selección de acciones
    if (window.gameData.fase === 'Selección') {
      this.add.text(850, 170, 'Confirmar con ENTER', estiloGrande).setOrigin(0.5);
      this.add.text(850, 220, '1 => Cura', estilo).setOrigin(0.5);
      this.add.text(850, 260, '2 => Escudo', estilo).setOrigin(0.5);
      this.add.text(850, 300, '3 => Recarga', estilo).setOrigin(0.5);
      this.add.text(850, 340, '4 => Disparo', estilo).setOrigin(0.5);
      this.add.text(850, 380, '5 => Disparo Doble', estilo).setOrigin(0.5);

      const aliados = ['Aliado_1', 'Aliado_2', 'Aliado_3'];

      aliados.forEach((key, i) => {
        const y = i * 50 + 440;
        const data = window.gameData[key];

        if (window.gameData.aliados_vivos.includes(aliados[i]) || window.gameData.vigencia) {
          this.add.text(850, y, `Aliado ${i + 1} realizó: ${data.accion ?? 'sin asignar'}`, estilo).setOrigin(0.5);
        } else if (!window.gameData.vigencia) {
          this.add.text(850, y, 'ELIMINADO', estilo).setOrigin(0.5);
        }
      });
    }
    // Fase: Error de acción
    if (window.gameData.fase === 'Error') {
      this.add.text(850, 400, 'NO PUEDES HACER ESA ACCIÓN', {
        fontSize: '48px',
        color: '#ff3333',
      }).setOrigin(0.5);
    }

    // Fase: Turno del PC
    if (window.gameData.fase === 'PC') {
      this.add.text(850, 170, 'Turno del enemigo', estiloGrande).setOrigin(0.5);

      const enemigos = ['Enemigo_1', 'Enemigo_2', 'Enemigo_3'];

      enemigos.forEach((key, i) => {
        const y = i * 60 + 250;
        const data = window.gameData[key];

        if (window.gameData.enemigos_vivos.includes(enemigos[i]) || window.gameData.vigencia) {
          this.add.text(850, y, `Enemigo ${i + 1} realizó: ${data.accion ?? '---'}`, estilo).setOrigin(0.5);
        } else if (!window.gameData.vigencia) {
          this.add.text(850, y, 'ELIMINADO', estilo).setOrigin(0.5);
        }
      });

      this.add.text(850, 430, 'Presiona ENTER para continuar', estilo).setOrigin(0.5);
    }

    // Fase: Seleccionar objetivo de disparo
    if (window.gameData.fase === 'Objetivo?') {
      this.add.text(850, 170, 'Selecciona tus objetivos', estiloGrande).setOrigin(0.5);
    }
    
    // Fase: Seleccionar aliado para curar
    if (window.gameData.fase === 'Curar?') {
      this.add.text(850, 170, 'Selecciona un aliado para curar', estiloGrande).setOrigin(0.5);
    }

    // Fase: Bloqueo de proyectiles
    if (window.gameData.fase === 'Bloqueo') {
      const enemigos = ['Enemigo_1', 'Enemigo_2', 'Enemigo_3'];

      enemigos.forEach((key, i) => {
        const y = i * 60 + 150;
        const data = window.gameData[key];
        if (window.gameData.enemigos_vivos.includes(enemigos[i]) || window.gameData.vigencia) {
          this.add.text(850, y, `Enemigo ${i + 1} realizó: ${data.accion ?? '---'}`, estilo).setOrigin(0.5);
        } else if (!window.gameData.vigencia) {
          this.add.text(850, y, 'ELIMINADO', estilo).setOrigin(0.5);
        }
      })
      

      const disparos = window.gameData.objetivos_E;
      let posY = 380;

      this.add.text(850, posY, 'Proyectiles enemigos apuntando a:', estilo).setOrigin(0.5);
      posY += 50;

      disparos.forEach((aliado) => {
        this.add.text(850, posY, `→ ${aliado}`, {
          fontSize: '28px',
          color: '#ff6666',
        }).setOrigin(0.5);
        posY += 40;
      });

      posY += 20;
      this.add.text(850, posY, 'Haz click en un enemigo que disparó para bloquear', {
        fontSize: '24px',
        color: '#aaaaaa',
      }).setOrigin(0.5);
    }
  }
}