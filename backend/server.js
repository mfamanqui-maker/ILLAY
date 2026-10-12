const { WebSocketServer, WebSocket } = require('ws');
const PUERTO = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ host: '0.0.0.0', port: PUERTO });
console.log(`WebSocket listo en ws://localhost:${PUERTO} (ngrok apunta a este puerto)`);

const TIEMPO_MAXIMO_COLA = 20000;

const rooms = new Map();
const cola = [];

/** Despachador: type del sobre -> manejador. Un type nuevo es una fila. */
const DESPACHADOR = {
    Buscar_Partida: buscarPartida,
    Enviar_Config_Acciones: (ws, data) => reenviarConfig(ws, data, false),
    Enviar_Config_Acciones_Final: (ws, data) => reenviarConfig(ws, data, true),
    Partida_Finalizada: finalizarPartida,
};

wss.on('error', (error) => {
    console.log('error', error);
});

wss.on('close', () => {
    console.log('servidor cerrado');
});

wss.on('connection', (ws) => {
    console.log('estado del servidor', estadoServidor());

    ws.on('close', () => alCerrar(ws));

    ws.on('message', (message) => {
        let sobre;
        try {
            sobre = JSON.parse(message);
        } catch {
            return;
        }
        const manejador = DESPACHADOR[sobre.type];
        if (!manejador) {
            console.log('mensaje desconocido', sobre);
            return;
        }
        manejador(ws, sobre.data);
    });
});

function buscarPartida(ws, data) {
    const i = cola.findIndex((c) => c.user === ws);
    if (i !== -1) {
        clearTimeout(cola[i].idTemporizador);
        cola.splice(i, 1);
    }
    const salaVieja = salaDe(ws);
    if (salaVieja) cerrarSala(salaVieja);

    const yo = { user: ws, data };
    if (cola.length === 0) {
        yo.idTemporizador = setTimeout(() => agotarCola(yo), TIEMPO_MAXIMO_COLA);
        cola.push(yo);
        return;
    }

    const otro = cola.shift();
    clearTimeout(otro.idTemporizador);
    const room = crearSala([otro, yo]);
    rooms.set(room.id, room);
    avisarPartidaEncontrada(room);
}

function agotarCola(esperando) {
    const i = cola.findIndex((c) => c.user === esperando.user);
    if (i === -1) return;
    cola.splice(i, 1);
    enviar(esperando.user, 'Partida_No_Encontrada', null);
}

/**
 * Siempre al cable. Quien ya nego (type1) esta en recibirConfigDelRival:
 * si guardamos el Recibir en un buzon de sala, no hay segundo flush y
 * se queda esperando para siempre. Quien aun no escucha lo recoge el
 * buzon del cliente (coneccion.js), no este servidor.
 */
function reenviarConfig(ws, configuracion, esFinal) {
    const room = salaDe(ws);
    if (!room || room.status !== 'open') return;

    const yo = miembroDe(room, ws);
    const rival = rivalDe(room, ws);
    if (!yo || !rival) return;

    room.configuraciones[yo.clave] = configuracion;
    room.finalizado[yo.clave] = Boolean(esFinal);

    enviar(
        rival.user,
        esFinal ? 'Recibir_Config_Acciones_Final' : 'Recibir_Config_Acciones',
        configuracion,
    );

    if (room.finalizado.jugadorA && room.finalizado.jugadorB) {
        resetearRonda(room);
    }
}

/**
 * Combina las dos declaraciones. No mira el tablero.
 * victoria+victoria → empate. derrota primero (rendirse) cierra ya.
 */
function finalizarPartida(ws, resultado) {
    const room = salaDe(ws);
    if (!room || room.status !== 'open') return;

    const yo = miembroDe(room, ws);
    if (!yo || room.declaraciones[yo.clave] != null) return;

    const valor = extraerResultado(resultado);
    room.declaraciones[yo.clave] = valor;

    const otraClave = yo.clave === 'jugadorA' ? 'jugadorB' : 'jugadorA';
    const otroValor = room.declaraciones[otraClave];

    if (valor === 'derrota' && otroValor == null) {
        const rival = rivalDe(room, ws);
        enviar(ws, 'Resultado_Partida', 'derrota');
        if (rival) enviar(rival.user, 'Resultado_Partida', 'victoria');
        cerrarSala(room);
        return;
    }

    if (otroValor == null) return;

    const [resA, resB] = resolverDeclaraciones(
        room.declaraciones.jugadorA,
        room.declaraciones.jugadorB,
    );
    const [a, b] = room.miembros;
    enviar(a.user, 'Resultado_Partida', resA);
    enviar(b.user, 'Resultado_Partida', resB);
    cerrarSala(room);
}

function alCerrar(ws) {
    const i = cola.findIndex((c) => c.user === ws);
    if (i !== -1) {
        clearTimeout(cola[i].idTemporizador);
        cola.splice(i, 1);
        return;
    }

    const room = salaDe(ws);
    if (!room) return;
    const rival = rivalDe(room, ws);
    if (rival) enviar(rival.user, 'Resultado_Partida', 'victoria');
    cerrarSala(room);
}

function crearSala(miembros) {
    return {
        id: crypto.randomUUID(),
        miembros: [
            { ...miembros[0], clave: 'jugadorA' },
            { ...miembros[1], clave: 'jugadorB' },
        ],
        ronda: 1,
        configuraciones: { jugadorA: null, jugadorB: null },
        finalizado: { jugadorA: false, jugadorB: false },
        declaraciones: { jugadorA: null, jugadorB: null },
        status: 'open',
    };
}

function avisarPartidaEncontrada(room) {
    const [a, b] = room.miembros;
    try {
        a.data?.equipo?.Aliados?.forEach((personaje) => {
            personaje.id = crypto.randomUUID();
        });
        b.data?.equipo?.Aliados?.forEach((personaje) => {
            personaje.id = crypto.randomUUID();
        });
    } catch (error) {
        console.error('no se pudo etiquetar el equipo', error);
    }
    enviar(a.user, 'Partida_Encontrada', { id: room.id, rival: b.data, aliados: a.data });
    enviar(b.user, 'Partida_Encontrada', { id: room.id, rival: a.data, aliados: b.data });
}

function resetearRonda(room) {
    room.ronda += 1;
    room.configuraciones = { jugadorA: null, jugadorB: null };
    room.finalizado = { jugadorA: false, jugadorB: false };
}

function cerrarSala(room) {
    room.status = 'cerrada';
    rooms.delete(room.id);
}

function enCola(ws) {
    return cola.some((c) => c.user === ws);
}

function salaDe(ws) {
    for (const room of rooms.values()) {
        if (room.miembros.some((m) => m.user === ws)) return room;
    }
    return null;
}

function miembroDe(room, ws) {
    return room.miembros.find((m) => m.user === ws);
}

function rivalDe(room, ws) {
    return room.miembros.find((m) => m.user !== ws);
}

function extraerResultado(resultado) {
    if (resultado && typeof resultado === 'object') return resultado.resultado;
    return resultado;
}

function resolverDeclaraciones(a, b) {
    if (a === 'victoria' && b === 'victoria') return ['empate', 'empate'];
    if (a === 'empate' && b === 'empate') return ['empate', 'empate'];
    if (a === 'victoria') return ['victoria', 'derrota'];
    if (b === 'victoria') return ['derrota', 'victoria'];
    return ['empate', 'empate'];
}

/**
 * No decide quien gano. Solo refleja el veredicto del que cierra
 * para el asiento contrario: victoria <-> derrota, empate se queda.
 */
function invertirResultado(resultado) {
    const valor = resultado && typeof resultado === 'object'
        ? resultado.resultado
        : resultado;
    const invertido = valor === 'victoria' ? 'derrota'
        : valor === 'derrota' ? 'victoria'
        : valor;
    if (resultado && typeof resultado === 'object') {
        return { ...resultado, resultado: invertido };
    }
    return invertido;
}

function enviar(ws, type, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data: payload }));
    }
}

function estadoServidor() {
    return {
        enCola: cola.length,
        salas: [...rooms.values()].map((r) => ({
            id: r.id,
            miembros: r.miembros.length,
            ronda: r.ronda,
            finalizado: r.finalizado,
            status: r.status,
        })),
        socketsVivos: wss.clients.size,
    };
}
