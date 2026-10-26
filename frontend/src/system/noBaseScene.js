export default class iuDeMapa extends Phaser.Scene {
    constructor() {
      super({ key: 'iuDeMapa' });
    }
  
    init({ map, player, interactions, puntosBatalla, zonasInterior, worldSceneKey }) {
      this.map = map;
      this.player = player;
      this.interactions = interactions;
      this.puntosBatalla = puntosBatalla ?? [];
      this.zonasInterior = zonasInterior ?? [];
      this.worldSceneKey = worldSceneKey;
      this.isInventoryOpen = false;
    }
  
    create() {
      this.input.keyboard.on('keydown-ESC', this.handleEscape, this);
      this.input.keyboard.on('keydown-ENTER', this.handleEnter, this);
      this.input.keyboard.on('keydown-UP', this.handlePrevious, this);
      this.input.keyboard.on('keydown-DOWN', this.handleNext, this);
      this.input.keyboard.on('keydown-W', this.handlePrevious, this);
      this.input.keyboard.on('keydown-S', this.handleNext, this);
      this.events.once('shutdown', this.cleanup, this);
      this.drawPauseMenu(this.map);
    }
  
    handleEscape(event) {
      if (event?.repeat) return;

      this.scene.resume(this.worldSceneKey);
      this.scene.stop();
    }
  
    handleEnter(event) {
      if (event?.repeat) return;

      this.isInventoryOpen = !this.isInventoryOpen;
      if (this.isInventoryOpen) this.drawInventory();
      else this.drawPauseMenu(this.map);
    }
  
    handlePrevious(event) {
      if (event?.repeat || this.isInventoryOpen) return;
  
      this.drawPauseMenu(this.map);
    }
  
    handleNext(event) {
      if (event?.repeat || this.isInventoryOpen) return;
  
      this.drawPauseMenu(this.map);
    }
  
    update() {
      if (this.isInventoryOpen || !this.playerMarker) return;
  
      const { left, top, cellSize } = this.mapViewport;
      const { x, y } = this.getMapPosition(this.player.x, this.player.y, left, top, cellSize);
      this.playerMarker.setPosition(x, y);
    }
  
    drawPauseMenu() {
      this.clearOverlay();
      console.log("llega hasta aqui");
  
      const { width, height } = this.scale;
      const locationName = this.getLocationName();
      this.overlay = this.add.container(0, 0).setDepth(10000);
      const background = this.add.graphics();
      background.fillStyle(0x000000, 0.62);
      background.fillRect(0, 0, width, height);
      this.overlay.add(background);
  
      this.overlay.add(this.add.text(width / 2, height * 0.16, 'PAUSA', {
        fontSize: `${Math.max(32, Math.round(height * 0.07))}px`,
        color: '#ffffff',
        stroke: '#222222',
        strokeThickness: 3
      }).setOrigin(0.5));
  
      this.overlay.add(this.add.text(width / 2, height * 0.24, locationName, {
        fontSize: `${Math.max(20, Math.round(height * 0.03))}px`,
        color: '#dddddd',
        stroke: '#222222',
        strokeThickness: 2
      }).setOrigin(0.5));
  
      this.overlay.add(this.add.text(width / 2, height * 0.31, '›  INVENTARIO', {
        fontSize: `${Math.max(22, Math.round(height * 0.04))}px`,
        color: '#ffffff',
        stroke: '#222222',
        strokeThickness: 2
      }).setOrigin(0.5));
  
      this.drawMinimap(width / 2, height * 0.74, Math.min(width * 0.72, 760), Math.min(height * 0.38, 360), this.map);
    }
  
    drawInventory() {
      this.clearOverlay();
      console.log("llega hasta aqui");
  
      const { width, height } = this.scale;
      this.overlay = this.add.container(0, 0).setDepth(10000);
  
      const background = this.add.graphics();
      background.fillStyle(0x000000, 0.62);
      background.fillRect(0, 0, width, height);
      this.overlay.add(background);
  
      const panelWidth = Math.min(width * 0.72, 880);
      const panelHeight = Math.min(height * 0.5, 420);
      const panelX = (width - panelWidth) / 2;
      const panelY = (height - panelHeight) / 2;
      const panel = this.add.graphics();
      panel.fillStyle(0x141414, 0.94);
      panel.fillRect(panelX, panelY, panelWidth, panelHeight);
      panel.lineStyle(6, 0xffffff, 1);
      panel.strokeRect(panelX, panelY, panelWidth, panelHeight);
      this.overlay.add(panel);
  
      this.overlay.add(this.add.text(width / 2, panelY + 42, 'INVENTARIO', {
        fontSize: `${Math.max(28, Math.round(height * 0.05))}px`,
        color: '#ffffff'
      }).setOrigin(0.5, 0));
  
      this.overlay.add(this.add.text(width / 2, panelY + panelHeight - 30, 'ESC para volver', {
        fontSize: `${Math.max(20, Math.round(height * 0.025))}px`,
        color: '#cccccc'
      }).setOrigin(0.5, 1));
    }
  
    drawMinimap(centerX, centerY, panelWidth, panelHeight, map) {
      console.log("llega hasta aqui");
      const left = centerX - panelWidth / 2;
      const top = centerY - panelHeight / 2;
      const panel = this.add.graphics();
      panel.fillStyle(0x050505, 0.88);
      panel.fillRect(left, top, panelWidth, panelHeight);
      panel.lineStyle(5, 0x111111, 1);
      panel.strokeRect(left, top, panelWidth, panelHeight);
      this.overlay.add(panel);
  
      const padding = 16;
      const mapWidth = panelWidth - padding * 2;
      const mapHeight = panelHeight - padding * 2;
      const cellSize = Math.min(mapWidth / map.width, mapHeight / map.height);
      const drawnWidth = cellSize * map.width;
      const drawnHeight = cellSize * map.height;
      const mapLeft = centerX - drawnWidth / 2;
      const mapTop = centerY - drawnHeight / 2;
      this.mapViewport = { left: mapLeft, top: mapTop, cellSize };
      const terrain = this.add.graphics();
      terrain.setAlpha(0.82);
  
      for (const layer of map.layers) {
        if (!layer.data?.length) continue;
  
        for (let row = 0; row < layer.data.length; row += 1) {
          for (let column = 0; column < layer.data[row].length; column += 1) {
            const tile = layer.data[row][column];
            if (!tile || tile.index < 0) continue;
  
            const color = /wall/i.test(layer.name) ? 0x292b2e :
              /decoration/i.test(layer.name) ? 0x73777a : 0xb2b4b5;
            terrain.fillStyle(color, 1);
            terrain.fillRect(
              mapLeft + column * cellSize,
              mapTop + row * cellSize,
              Math.ceil(cellSize),
              Math.ceil(cellSize)
            );
          }
        }
      }
      this.overlay.add(terrain);

      for (const punto of this.puntosBatalla) {
        this.marcarZona(punto, mapLeft, mapTop, cellSize, 0xff2a2a);
      }

      for (const zona of this.zonasInterior) {
        this.marcarZona(zona, mapLeft, mapTop, cellSize, zona.color);
      }

      const playerPosition = this.getMapPosition(this.player.x, this.player.y, mapLeft, mapTop, cellSize);
      this.playerMarker = this.add.circle(
        playerPosition.x,
        playerPosition.y,
        Math.max(4, cellSize * 0.9),
        0x168cff,
        1
      );
      this.overlay.add(this.playerMarker);
    }
  
    marcarZona(punto, mapLeft, mapTop, cellSize, color) {
      const pos = this.getMapPosition(punto.x, punto.y, mapLeft, mapTop, cellSize);
      const marca = this.add.graphics();
      marca.lineStyle(2, color, 1);
      marca.strokeCircle(pos.x, pos.y, Math.max(4, cellSize * 0.7));
      this.overlay.add(marca);
    }

    getInteractions() {
      const objectLayer = this.map.getObjectLayer('objects');
      const mapObjects = objectLayer?.objects
        .filter(object => /interact|transition|point|zone/i.test(`${object.name} ${object.type ?? object.class ?? ''}`))
        .map(object => ({ x: object.x, y: object.y })) ?? [];
  
      const interactionColors = [0xff5c5c, 0xffc857, 0x53d6a4, 0xc084fc, 0xff8bd1];
  
      return [...this.interactions, ...mapObjects].map((interaction, index) => ({
        ...interaction,
        color: interaction.color ?? interactionColors[index % interactionColors.length]
      }));
    }
  
    getLocationName() {
      const locationNames = {
        globalMap: 'Mapa global',
        houseMap: 'Casa',
        shopMap: 'Tienda'
      };
  
      return locationNames[this.worldSceneKey] ??
        this.worldSceneKey.replace(/([a-z])([A-Z])/g, '$1 $2');
    }
  
    getMapPosition(x, y, left = 0, top = 0, cellSize = 1) {
      return {
        x: left + (x / this.map.tileWidth) * cellSize,
        y: top + (y / this.map.tileHeight) * cellSize
      };
    }
  
    clearOverlay() {
      this.playerMarker = null;
      this.mapViewport = null;
      this.overlay?.destroy(true);
      this.overlay = null;
    }
  
    cleanup() {
      this.input.keyboard.off('keydown-ESC', this.handleEscape, this);
      this.input.keyboard.off('keydown-ENTER', this.handleEnter, this);
      this.input.keyboard.off('keydown-UP', this.handlePrevious, this);
      this.input.keyboard.off('keydown-DOWN', this.handleNext, this);
      this.input.keyboard.off('keydown-W', this.handlePrevious, this);
      this.input.keyboard.off('keydown-S', this.handleNext, this);
      this.clearOverlay();
    }
  }