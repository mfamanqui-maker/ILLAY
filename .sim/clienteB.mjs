// Rival headless: busca partida, ataca al aliado [1] del otro jugador y confirma.
class Emisor {
  constructor() { this.m = new Map(); }
  on(e, fn, ctx) { (this.m.get(e) ?? this.m.set(e, []).get(e)).push({ fn, ctx }); return this; }
  once(e, fn, ctx) { return this.on(e, fn, ctx); }
  off(e, fn) { const l = this.m.get(e) ?? []; this.m.set(e, l.filter((h) => h.fn !== fn)); return this; }
  emit(e, ...a) { (this.m.get(e) ?? []).slice().forEach((h) => h.fn.apply(h.ctx, a)); return true; }
  removeAllListeners() { this.m.clear(); }
}
globalThis.Phaser = { Scene: class {}, Events: { EventEmitter: Emisor }, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, BlendModes: {}, Math: { Between: (a) => a } };

const base = new URL('../frontend/src/battle/', import.meta.url).href;
const { default: PhaserMaster } = await import(base + 'PhaserMaster.js');
const { crearRegistro } = await import(base + 'datosDePotestades/IndexDePotestades.js');
const { default: AdministradorTablero } = await import(base + 'tablero/AdministradorTablero.js');
const fs = await import('node:fs/promises');
const molde = JSON.parse(await fs.readFile(new URL('../frontend/src/battle/AlmacenDeMoldes/Molde_Multiplayer.json', import.meta.url)));
const t = (await import(base + 'coneccion.js')).transporte;

const equipo = { Aliados: [
  { arquetipo: 'Realista', invetario: [], nivel: 1, posicion: { x: 2, y: 2 } },
  { arquetipo: 'Campesino', invetario: [], nivel: 1, posicion: { x: 7, y: 3 } },
  { arquetipo: 'Campesino', invetario: [], nivel: 1, posicion: { x: 2, y: 5 } },
] };

await t.coneccion();
const p = t.esperar ? null : null;
const pendiente = t.esperarPartida(); t.buscarPartida(equipo);
console.log('B buscando...');
const r = await pendiente;
console.log('B partida', r.type);
if (r.type !== 'Partida_Encontrada') process.exit(1);

const m = structuredClone(molde);
m.equipos = {
  Aliados: r.data.aliados.equipo.Aliados,
  Enemigos: r.data.rival.equipo.Aliados.map((q) => ({ ...q, posicion: { ...q.posicion, x: 11 - q.posicion.x } })),
};
const e = Object.create(PhaserMaster.prototype);
e.init(m);
e.transporte = t;
e.time = { now: 0, delayedCall: (ms, fn) => setTimeout(fn, 0) };
e.tweens = { add: (c) => { c?.onComplete?.(); return { stop() {}, remove() {} }; }, killTweensOf() {} };
const adm = new AdministradorTablero({ add: {}, cameras: { main: {} } }, e.eventos);
e.tablero = adm.construirDesdeMolde(e.configuracion);
e.administrador = { tileSize: adm.tileSize, destruir() {} };
e.registro = crearRegistro(e.configuracion.equipos, null);
e.registro.todos().forEach(({ potestad }) => {
  const { x, y } = potestad.datos.posicion;
  e.tablero[y - 1][x - 1].entidad = potestad;
});
e.scene = { launch() {}, stop() {}, start() {} };
e._registrarInputs();
e.eventos.on('faseCambiada', (f) => console.log('[B] fase ->', f));

const mios = e.registro.porBando('Aliados').map((x) => x.potestad.id);
const suyos = e.registro.porBando('Enemigos').map((x) => x.potestad.id);
e.eventos.emit('accionElegida', { id: mios[1], nombreDeAccion: 'atacar', objetivo: suyos[1], azar: null });
console.log('B cola', [...e.configDelTurno.values()].flat());
await new Promise((res) => setTimeout(res, 1500));
e.eventos.emit('confirmar');

const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  await new Promise((res) => setTimeout(res, 300));
  if (e.configDelTurno.size === 0 && e.estadoRonda === 'seleccionando' && e.configPropia === null) break;
}
const hp = (id) => e.registro.obtenerPorId(id).potestad.estadisticas;
console.log('B ve: campesino atacado', hp(suyos[1]).hp, 'escudos realista rival', hp(suyos[0]).escudos);
t.cerrarConeccion();
process.exit(0);
