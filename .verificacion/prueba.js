import {
  crearRegistro,
  normalizarConfiguracion,
  adaptarParaGuion,
  adaptarParaOrbes,
  adaptarParaPanel,
  CATALOGO_DE_ACCIONES,
  resolverClase,
} from './src/battle/datosDePotestades/IndexDePotestades.js';

let fallos = 0;
const ok = (nombre, condicion, extra = '') => {
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${nombre}${extra ? ` -> ${extra}` : ''}`);
  if (!condicion) fallos += 1;
};

// Equipo tal y como lo manda characterSelectScene, mas los ids.
const equipos = {
  Aliados: [
    { id: 1, arquetipo: 'Campesino', invetario: [], nivel: 1, posicion: { x: 1, y: 1 } },
    { id: 2, arquetipo: 'Mago', invetario: [], nivel: 1, posicion: { x: 1, y: 2 } },
    { id: 3, arquetipo: 'Intelectual', invetario: [], nivel: 1, posicion: { x: 1, y: 3 } },
  ],
  Enemigos: [
    { id: 4, arquetipo: 'Realista', invetario: [], nivel: 1, posicion: { x: 5, y: 1 } },
    { id: 5, arquetipo: 'Sectario', invetario: [], nivel: 1, posicion: { x: 5, y: 2 } },
  ],
};

const registro = crearRegistro(equipos);
ok('crearRegistro instancia los dos bandos', registro.todos().length === 5);
ok('las cinco familias resuelven', registro.todos().every((e) => e.potestad.arquetipo));
ok('el bando llega a la potestad', registro.obtenerPorId(4).potestad.bando === 'Enemigos');

const campesino = registro.obtenerPorId(1).potestad;
ok('estadisticas de la tabla', campesino.estadisticas.hp === 3 && campesino.estadisticas.dano === 1);
ok('constantes declaradas', campesino.constantes.hpMax === 7);
ok('acciones en tres cadenas', ['habilidades', 'objetos', 'movimiento'].every((k) => Array.isArray(campesino.listaDeAcciones[k])));

// Arquetipo desconocido: error temprano y con el nombre que fallo.
try {
  resolverClase({ arquetipo: 'Brujo' });
  ok('arquetipo desconocido lanza error', false);
} catch (error) {
  ok('arquetipo desconocido lanza error', error.message.includes('Brujo'), error.message.slice(0, 60));
}

// Id repetido entre bandos distintos.
try {
  crearRegistro({ Aliados: [{ id: 9, arquetipo: 'Mago', nivel: 1 }], Enemigos: [{ id: 9, arquetipo: 'Mago', nivel: 1 }] });
  ok('id repetido lanza error', false);
} catch (error) {
  ok('id repetido lanza error', error.message.includes('repetido'));
}

// ─── Criterio de cierre: el round-trip JSON ──────────────────────────────────
const configuracion = [
  { id: 1, nombreDeAccion: 'atacar', objetivo: 4, azar: { tirada: 17 } },
  { id: 1, nombreDeAccion: 'moverse', objetivo: { x: 2, y: 1 }, azar: null },
  { id: 2, nombreDeAccion: 'generarMagia', objetivo: null, azar: null },
  { id: 3, nombreDeAccion: 'escudar', objetivo: 1, azar: null },
];

const viajada = JSON.parse(JSON.stringify(configuracion));
const tareas = normalizarConfiguracion(viajada, registro);
ok('sobrevive a JSON.stringify/parse', tareas.length === 4, `${tareas.length} tareas`);
ok('el azar se transporta', tareas[0].azar.tirada === 17);
ok('objetivo de entidad resuelve a potestad', tareas[0].objetivo === registro.obtenerPorId(4).potestad);
ok('objetivo de casilla resuelve a coordenadas', tareas[1].objetivo.x === 2 && tareas[1].objetivo.y === 1);
ok('el tipo lo estampa el archivo', tareas[0].accion.tipo === 'entidad' && tareas[1].accion.tipo === 'casilla');
ok('escudar obliga a otra ronda', tareas[3].accion.requiereRonda === true && tareas[3].accion.tipo === 'config1');
ok('generarMagia no obliga a otra ronda', tareas[2].accion.requiereRonda === false);
ok('efectoTipo1 sobrevive al catalogo', tareas[3].accion.efectoTipo1 === 'escudo');

// Accion que la potestad no tiene declarada: se descarta.
const colada = normalizarConfiguracion([{ id: 1, nombreDeAccion: 'maldicion', objetivo: 4 }], registro);
ok('accion no declarada por la potestad se descarta', colada.length === 0);

// ─── Ejecucion via adaptarParaGuion ──────────────────────────────────────────
const tablero = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ id: 1, entidad: false })));
tablero[0][0].entidad = campesino;

const soldado = registro.obtenerPorId(4).potestad;
const vidaPrevia = soldado.estadisticas.hp;
const guionAtaque = adaptarParaGuion(tareas[0]);
guionAtaque.ejecutar({ tablero, escena: null, eventos: null });
ok('atacar resta el dano del lanzador', soldado.estadisticas.hp === vidaPrevia - campesino.estadisticas.dano,
  `${vidaPrevia} -> ${soldado.estadisticas.hp}`);
ok('adaptarParaGuion trae la velocidad', guionAtaque.velocidad === 15);

adaptarParaGuion(tareas[1]).ejecutar({ tablero, escena: null, eventos: null });
ok('moverse mueve el dato del tablero', tablero[0][1].entidad === campesino && tablero[0][0].entidad === false);
ok('moverse actualiza la posicion base 1', campesino.datos.posicion.x === 2 && campesino.datos.posicion.y === 1);

// El condicional es derivado: generar magia habilita el rayo.
const mago = registro.obtenerPorId(2).potestad;
const rayoAntes = mago.listaDeAcciones.habilidades.find((a) => a.nombre === 'rayoDeMagia').condicional;
adaptarParaGuion(tareas[2]).ejecutar({ tablero, escena: null, eventos: null });
const rayoDespues = mago.listaDeAcciones.habilidades.find((a) => a.nombre === 'rayoDeMagia').condicional;
ok('condicional se recalcula al cambiar las estadisticas', rayoAntes === false && rayoDespues === true);

// ─── Adaptadores ─────────────────────────────────────────────────────────────
const cadenas = adaptarParaOrbes(campesino);
ok('adaptarParaOrbes da tres cadenas', Array.isArray(cadenas) && cadenas.length === 3);
ok('cada accion trae casoDeEleccion', cadenas[0][2].nombre === 'atacar' && cadenas[0][2].casoDeEleccion === '0');
ok('la casilla se pide como casilla', cadenas[2][0].casoDeEleccion === 'casilla');
ok('la copia no contamina a la potestad', !('orbePhaser' in campesino.listaDeAcciones.habilidades[0]));

const panel = adaptarParaPanel(campesino, 'Aliados');
ok('el panel recibe nombre de familia', panel.nombre === 'Campesino');
ok('el panel recibe vida con techo', panel.vida.vidaActual === 3 && panel.vida.vidaMaxima === 7);
ok('el panel recibe los iconos', panel.acciones[0].imagen.endsWith('S_Holy03.png'));

// ─── Cobertura: toda accion declarada tiene funcion ──────────────────────────
const sinFuncion = registro.todos().flatMap(({ potestad }) =>
  Object.values(potestad.listaDeAcciones).flat()
    .filter((a) => !CATALOGO_DE_ACCIONES[a.nombre])
    .map((a) => `${potestad.arquetipo}.${a.nombre}`));
ok('toda accion declarada existe en acciones/', sinFuncion.length === 0, sinFuncion.join(', '));

console.log(fallos === 0 ? '\nTODO CORRECTO' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
