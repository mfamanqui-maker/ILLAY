// Simulacion de dos clientes contra el servidor real (ws://localhost:8080).
class Emisor {
  constructor() { this.m = new Map(); }
  on(e, fn, ctx) { (this.m.get(e) ?? this.m.set(e, []).get(e)).push({ fn, ctx }); return this; }
  once(e, fn, ctx) { return this.on(e, fn, ctx); }
  off(e, fn, ctx) { const l = this.m.get(e) ?? []; this.m.set(e, l.filter((h) => h.fn !== fn)); return this; }
  emit(e, ...a) { (this.m.get(e) ?? []).slice().forEach((h) => h.fn.apply(h.ctx, a)); return true; }
  removeAllListeners() { this.m.clear(); }
}
const WSBase = globalThis.WebSocket;
globalThis.WebSocket = class extends WSBase { constructor(u) { super(String(u).replace(':8080', ':' + (process.env.WS_PORT ?? '8080'))); } };
globalThis.Phaser = { Scene: class {}, Events: { EventEmitter: Emisor }, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, BlendModes: {}, Math: { Between: (a) => a } };

const base = new URL('../frontend/src/battle/', import.meta.url).href;
const { default: PhaserMaster } = await import(base + 'PhaserMaster.js');
const { crearRegistro } = await import(base + 'datosDePotestades/IndexDePotestades.js');
const { default: AdministradorTablero } = await import(base + 'tablero/AdministradorTablero.js');
const molde = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../frontend/src/battle/AlmacenDeMoldes/Molde_Multiplayer.json', import.meta.url)));

const tA = (await import(base + 'coneccion.js?a')).transporte;
const tB = (await import(base + 'coneccion.js?b')).transporte;

const equipoA = { Aliados: [
  { arquetipo: 'Realista', invetario: [], nivel: 1, posicion: { x: 2, y: 2 } },
  { arquetipo: 'Campesino', invetario: [], nivel: 1, posicion: { x: 3, y: 3 } },
  { arquetipo: 'Campesino', invetario: [], nivel: 1, posicion: { x: 2, y: 5 } },
] };
const equipoB = structuredClone(equipoA);
equipoB.Aliados[1].posicion = { x: 7, y: 3 };

await tA.coneccion(); await tB.coneccion();
const pA = tA.esperarPartida(); tA.buscarPartida(equipoA);
await new Promise((r) => setTimeout(r, 200));
const pB = tB.esperarPartida(); tB.buscarPartida(equipoB);
const [rA, rB] = await Promise.all([pA, pB]);
console.log('partida', rA.type, rB.type);

function armarMolde(cfg) {
  const m = structuredClone(molde);
  m.equipos = {
    Aliados: cfg.aliados.equipo.Aliados,
    Enemigos: cfg.rival.equipo.Aliados.map((p) => ({ ...p, posicion: { ...p.posicion, x: 11 - p.posicion.x } })),
  };
  return m;
}

function crearEscena(nombre, cfg, transporte) {
  const e = Object.create(PhaserMaster.prototype);
  e.init(armarMolde(cfg));
  e.transporte = transporte;
  e.nombre = nombre;
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
  e.orbesSistema = null;
  e.scene = { launch() {}, stop() {}, start() {} };
  e.events = { on() {}, off() {} };
  const obj = { setStrokeStyle() { return obj; }, setDepth() { return obj; }, setScale() { return obj; }, setPosition() { return obj; }, destroy() { console.log(`[${nombre}] aura destruida`); }, active: true };
  e.add = {
    circle: () => { console.log(`[${nombre}] AURA de escudo creada`); return obj; },
    particles: (x, y, k, cfg) => { if (Array.isArray(cfg?.tint)) console.log(`[${nombre}] particulas`, cfg.tint.map((c) => c.toString(16))); return { setDepth() {}, explode() {}, destroy() {} }; },
  };
  e.registro.todos().forEach(({ potestad }) => {
    potestad.sprite = { x: 0, y: 0, depth: 1, setTint() {}, clearTint() {} };
  });
  e._registrarInputs();
  e.eventos.on('faseCambiada', (f) => console.log(`[${nombre}] fase ->`, f));
  return e;
}

const A = crearEscena('A', rA.data, tA);
const B = crearEscena('B', rB.data, tB);
const idsA = A.registro.porBando('Aliados').map((x) => x.potestad.id);
const idsB = B.registro.porBando('Aliados').map((x) => x.potestad.id);
console.log('ids A', idsA, 'ids B', idsB);

// A escuda con el Realista; B ataca con un campesino al campesino de A en (3,3).
if (!process.env.SIN_ESCUDO) A.eventos.emit('accionElegida', { id: idsA[0], nombreDeAccion: 'escudar', objetivo: null, azar: null });
B.eventos.emit('accionElegida', { id: idsB[1], nombreDeAccion: 'atacar', objetivo: idsA[1], azar: null });
console.log('cola A', [...A.configDelTurno.values()].flat());
console.log('cola B', [...B.configDelTurno.values()].flat());

const orden = process.argv[2] ?? 'AB';
const [p1, p2] = orden === 'AB' ? [A, B] : [B, A];
p1.eventos.emit('confirmar');
await new Promise((r) => setTimeout(r, 300));
p2.eventos.emit('confirmar');

const t0 = Date.now();
while (Date.now() - t0 < 15000) {
  await new Promise((r) => setTimeout(r, 200));
  const hecho = [A, B].every((e) => e.registroDeJugadas.turnos.length > 1 && e.estadoRonda === 'seleccionando');
  if (hecho) break;
}
const hp = (e, id) => e.registro.obtenerPorId(id).potestad.estadisticas.hp;
console.log('hp campesino A visto por A', hp(A, idsA[1]), 'visto por B', hp(B, idsA[1]));
console.log('escudos realista A', A.registro.obtenerPorId(idsA[0]).potestad.estadisticas.escudos);
console.log('estado', A.estadoRonda, B.estadoRonda, 'turnos', A.registroDeJugadas.turnos.length, B.registroDeJugadas.turnos.length);
tA.cerrarConeccion(); tB.cerrarConeccion();
process.exit(0);
