/**
 * faseEscudo.js — UI de selección de escudo.
 *
 * 1) Aliado (defensor) → borde amarillo.
 * 2) Linea de ataque → se bloquea con ese defensor.
 * Enter/Escape cierra aunque queden escudos sin usar.
 *
 * @returns {Promise<{ bloqueadores: {id}[], protegidos: {id}[], asignaciones: object[] }>}
 */

const COLOR_AZUL = 0x4da3ff;
const COLOR_ROJO = 0xff4d4d;
const COLOR_AMARILLO = 0xffe14a;
const DEPTH_FLECHA = 950;
const DEPTH_OUTLINE = 960;

function spriteDe(registro, id) {
  return registro?.obtenerPorId?.(id)?.potestad?.sprite ?? null;
}

function centroSprite(sprite) {
  return { x: sprite.x, y: sprite.y - (sprite.displayHeight ?? sprite.height ?? 0) * 0.15 };
}

function aplicarFiltroCamara(escena) {
  const cam = escena?.cameras?.main;
  if (!cam?.postFX?.addColorMatrix) return () => {};
  let fx = null;
  try {
    fx = cam.postFX.addColorMatrix();
    fx.grayscale?.(0.75);
  } catch {
    return () => {};
  }
  return () => {
    try { cam.postFX?.remove?.(fx); } catch { /* */ }
  };
}

/** Tinte plano (sin particulas). */
function aplicarFiltroColor(sprite, color) {
  if (!sprite?.active) return () => {};
  const previo = sprite.tintTopLeft;
  sprite.setTint(color);
  return () => {
    if (!sprite.active) return;
    if (previo != null && previo !== 0xffffff) sprite.setTint(previo);
    else sprite.clearTint();
  };
}

function crearOutlineAmarillo(escena, sprite) {
  if (!sprite?.active) return () => {};
  const g = escena.add.graphics();
  g.setDepth(DEPTH_OUTLINE);
  const sync = () => {
    if (!g.active || !sprite.active) return;
    const w = sprite.displayWidth ?? 80;
    const h = sprite.displayHeight ?? 80;
    g.clear();
    g.lineStyle(8, COLOR_AMARILLO, 1);
    g.strokeRoundedRect(sprite.x - w / 2, sprite.y - h / 2, w, h, 18);
  };
  escena.events.on('update', sync);
  sync();
  return () => {
    escena.events.off('update', sync);
    g.destroy?.();
  };
}

function crearTooltip(escena) {
  const tooltip = escena.add.text(0, 0, '', {
    fontFamily: 'Impact, Arial Black, Arial',
    fontSize: '48px',
    color: '#ffffff',
    backgroundColor: '#1a0000ee',
    padding: { x: 20, y: 14 },
    stroke: '#000000',
    strokeThickness: 5,
  });
  tooltip.setScrollFactor(0);
  tooltip.setDepth(1003);
  tooltip.setVisible(false);
  return tooltip;
}

function quedanDe(pool, id) {
  return pool.filter((d) => String(d.id) === String(id)).length;
}

export function abrirFaseEscudo(escena, registroT1) {
  const { defensores, listaDeProyectiles, idsAtacantes, idsDefensores } = registroT1 ?? {};
  if (!escena?.add || !listaDeProyectiles?.length || !defensores?.length) {
    return Promise.resolve({ bloqueadores: [], protegidos: [], asignaciones: [] });
  }

  escena.orbesSistema?.onDeseleccionar?.();
  const registro = escena.registro;
  const restaurarCamara = aplicarFiltroCamara(escena);
  const tooltip = crearTooltip(escena);
  const restaurarFiltros = [];

  (idsAtacantes ?? []).forEach((id) => {
    const rest = aplicarFiltroColor(spriteDe(registro, id), COLOR_ROJO);
    if (rest) restaurarFiltros.push(rest);
  });
  (idsDefensores ?? []).forEach((id) => {
    const rest = aplicarFiltroColor(spriteDe(registro, id), COLOR_AZUL);
    if (rest) restaurarFiltros.push(rest);
  });

  let poolDefensores = [...defensores];
  let idSeleccionado = null;
  let soltarOutline = null;
  const asignaciones = [];
  const flechas = [];
  const zonasDefensor = [];

  const seleccionarDefensor = (id) => {
    if (quedanDe(poolDefensores, id) <= 0) return;
    soltarOutline?.();
    soltarOutline = null;
    if (String(idSeleccionado) === String(id)) {
      idSeleccionado = null;
      return;
    }
    idSeleccionado = id;
    soltarOutline = crearOutlineAmarillo(escena, spriteDe(registro, id));
  };

  return new Promise((resolve) => {
    let resuelto = false;

    const terminar = () => {
      if (resuelto) return;
      resuelto = true;
      escena.input?.keyboard?.off('keydown', onKey);
      tooltip.destroy?.();
      soltarOutline?.();
      flechas.forEach(({ g, zona, sync }) => {
        escena.events.off('update', sync);
        g?.destroy?.();
        zona?.destroy?.();
      });
      zonasDefensor.forEach(({ zona, sync }) => {
        escena.events.off('update', sync);
        zona?.destroy?.();
      });
      restaurarFiltros.forEach((rest) => rest?.());
      restaurarCamara();
      escena._cerrarFaseEscudo = null;
      escena._sesionTipo1 = null;
      const bloqueadores = asignaciones.map((a) => ({ id: a.defensorId }));
      const vistos = new Set();
      const protegidos = [];
      asignaciones.forEach((a) => {
        const clave = String(a.objetivo);
        if (vistos.has(clave)) return;
        vistos.add(clave);
        protegidos.push({ id: a.objetivo });
      });
      resolve({ bloqueadores, protegidos, asignaciones });
    };

    const onKey = (event) => {
      if (event.code === 'Escape' || event.code === 'Enter') terminar();
    };
    escena.input?.keyboard?.on('keydown', onKey);
    escena._cerrarFaseEscudo = terminar;
    escena._sesionTipo1 = { cerrada: false };

    (idsDefensores ?? []).forEach((id) => {
      const spr = spriteDe(registro, id);
      if (!spr?.active) return;
      const zona = escena.add.zone(spr.x, spr.y, spr.displayWidth ?? 80, spr.displayHeight ?? 80);
      zona.setDepth(DEPTH_OUTLINE + 1);
      zona.setInteractive({ useHandCursor: true });
      const sync = () => {
        if (!zona.active || !spr.active) return;
        zona.setPosition(spr.x, spr.y);
        zona.setSize(spr.displayWidth ?? 80, spr.displayHeight ?? 80);
      };
      escena.events.on('update', sync);
      zona.on('pointerdown', (_p, _lx, _ly, event) => {
        event?.stopPropagation?.();
        seleccionarDefensor(id);
      });
      zonasDefensor.push({ zona, sync });
    });

    listaDeProyectiles.forEach((proy) => {
      const sprAtk = spriteDe(registro, proy.idAtacante);
      const sprAli = spriteDe(registro, proy.idObjetivo);
      if (!sprAtk?.active || !sprAli?.active) return;

      const g = escena.add.graphics();
      g.setDepth(DEPTH_FLECHA);
      const zona = escena.add.zone(0, 0, 64, 64);
      zona.setDepth(DEPTH_FLECHA + 1);
      zona.setInteractive({ useHandCursor: true });

      const sync = () => {
        if (!g.active || !sprAtk.active || !sprAli.active) return;
        const a = centroSprite(sprAtk);
        const b = centroSprite(sprAli);
        g.clear();
        g.lineStyle(6, COLOR_ROJO, idSeleccionado != null ? 1 : 0.45);
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.strokePath();
        g.fillStyle(COLOR_ROJO, 1);
        g.fillCircle(b.x, b.y, 10);
        zona.setPosition((a.x + b.x) / 2, (a.y + b.y) / 2);
      };
      escena.events.on('update', sync);
      sync();

      const textoHover = `${proy.nombreDeAccion}${proy.dano != null && proy.dano !== '' ? `\n${proy.dano} de daño` : ''}`;
      zona.on('pointerover', () => {
        tooltip.setText(String(textoHover).toUpperCase());
        tooltip.setVisible(true);
      });
      zona.on('pointermove', (pointer) => tooltip.setPosition(pointer.x + 24, pointer.y - 40));
      zona.on('pointerout', () => tooltip.setVisible(false));

      zona.on('pointerdown', (_pointer, _lx, _ly, event) => {
        event?.stopPropagation?.();
        if (idSeleccionado == null) return;
        const idx = poolDefensores.findIndex((d) => String(d.id) === String(idSeleccionado));
        if (idx < 0) return;
        const defFila = poolDefensores.splice(idx, 1)[0];
        asignaciones.push({
          defensorId: defFila.id,
          idEscudero: defFila.id,
          objetivo: proy.idObjetivo,
          idAtacante: proy.idAtacante,
          nombreDeAccion: 'escudar',
        });
        g.destroy();
        zona.destroy();
        escena.events.off('update', sync);
        tooltip.setVisible(false);
        soltarOutline?.();
        soltarOutline = null;
        idSeleccionado = null;
        const quedanLineas = flechas.some((f) => f.g?.active);
        if (poolDefensores.length <= 0 || !quedanLineas) terminar();
      });

      flechas.push({ g, zona, sync });
    });

    if (flechas.length === 0) terminar();
  });
}
