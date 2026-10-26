const { WebSocketServer, WebSocket } = require('ws');
const PUERTO = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ host: '0.0.0.0', port: PUERTO });
console.log(`WebSocket listo en ws://localhost:${PUERTO} (ngrok apunta a este puerto)`);

const TIEMPO_MAXIMO_COLA = 20000;
const TIEMPO_RESPUESTA_VIDA = 5000;

const rooms = new Map();
const cola = [];

/** Despachador: type del sobre -> manejador. Un type nuevo es una fila. */
const DESPACHADOR = {
    Buscar_Partida: buscarPartida,
    Enviar_Config_Acciones: (ws, data) => reenviarConfig(ws, data, false),
    Enviar_Config_Acciones_Final: (ws, data) => reenviarConfig(ws, data, true),
    Preguntar_Rival_Vivo: preguntarRivalVivo,
    Responder_Rival_Vivo: responderRivalVivo,
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

function estadoJugada() {
    return {
        configuracion: null,
        modificable: true,
        bloqueada: false,
        finalizado: false,
        solicitaRival: false,
    };
}

function normalizarJugada(data, ronda) {
    if (Array.isArray(data)) {
        return { configuracion: data, modificable: true, ronda };
    }
    return {
        configuracion: data?.configuracion,
        modificable: data?.modificable === true,
        ronda: Number(data?.ronda),
        solicitudId: data?.solicitudId ?? null,
        bloquearRival: data?.bloquearRival === true,
    };
}

function esConfigEstable(estado) {
    return Array.isArray(estado?.configuracion);
}

function confirmarCambio(ws, jugada, aceptada, motivo = null) {
    enviar(ws, 'Estado_Config_Acciones', {
        solicitudId: jugada.solicitudId,
        ronda: jugada.ronda,
        aceptada,
        modificable: aceptada,
        estado: aceptada ? 'cambiante' : 'invariable',
        ...(motivo ? { motivo } : {}),
    });
}

function marcarCambiante(room, ws, yo, jugada) {
    const estado = room.jugadas[yo.clave];
    if (jugada.ronda !== room.ronda) {
        confirmarCambio(ws, jugada, false, 'ronda_cerrada');
        return;
    }
    if (!estado.modificable || estado.bloqueada) {
        confirmarCambio(ws, jugada, false, 'jugada_invariable');
        return;
    }
    estado.configuracion = 'cambiante';
    estado.finalizado = false;
    estado.solicitaRival = false;
    room.entregas = { jugadorA: null, jugadorB: null };
    confirmarCambio(ws, jugada, true);
}

function bloquearRivalSiHaceFalta(room, clave) {
    const yo = room.jugadas[clave];
    const otraClave = clave === 'jugadorA' ? 'jugadorB' : 'jugadorA';
    const rival = room.jugadas[otraClave];
    if (!yo.solicitaRival || !esConfigEstable(yo) || !esConfigEstable(rival)) return;
    rival.bloqueada = true;
    rival.modificable = false;
}

function firmaEntrega(rival, propio) {
    return JSON.stringify([
        rival.configuracion,
        rival.modificable,
        rival.finalizado,
        propio.modificable,
    ]);
}

function entregarJugada(room, receptor, rival) {
    const propia = room.jugadas[receptor.clave];
    const ajena = room.jugadas[rival.clave];
    const firma = firmaEntrega(ajena, propia);
    if (room.entregas[receptor.clave] === firma) return;
    room.entregas[receptor.clave] = firma;
    enviar(
        receptor.user,
        ajena.finalizado ? 'Recibir_Config_Acciones_Final' : 'Recibir_Config_Acciones',
        {
            configuracion: ajena.configuracion,
            modificable: ajena.modificable,
            propiaModificable: propia.modificable,
            ronda: room.ronda,
        },
    );
}

function resolverIntercambio(room) {
    const [a, b] = room.miembros;
    const estadoA = room.jugadas.jugadorA;
    const estadoB = room.jugadas.jugadorB;
    if (!esConfigEstable(estadoA) || !esConfigEstable(estadoB)) return;

    bloquearRivalSiHaceFalta(room, 'jugadorA');
    bloquearRivalSiHaceFalta(room, 'jugadorB');
    entregarJugada(room, a, b);
    entregarJugada(room, b, a);

    if (estadoA.finalizado && estadoB.finalizado) resetearRonda(room);
}

/**
 * Cada jugada es `{ configuracion, modificable, ronda }`.
 * `configuracion: "cambiante"` se acepta solo mientras el servidor conserve
 * `modificable: true`. Una peticion tipo 1 bloquea atomicamente al rival.
 */
function reenviarConfig(ws, data, esFinal) {
    const room = salaDe(ws);
    if (!room || room.status !== 'open') return;

    const yo = miembroDe(room, ws);
    if (!yo) return;
    const jugada = normalizarJugada(data, room.ronda);
    if (jugada.configuracion === 'cambiante') {
        marcarCambiante(room, ws, yo, jugada);
        return;
    }
    if (jugada.ronda !== room.ronda || !Array.isArray(jugada.configuracion)) return;

    const estado = room.jugadas[yo.clave];
    estado.configuracion = jugada.configuracion;
    estado.modificable = estado.bloqueada ? false : jugada.modificable;
    estado.finalizado = Boolean(esFinal);
    estado.solicitaRival = !esFinal || jugada.bloquearRival;
    resolverIntercambio(room);
}

function preguntarRivalVivo(ws) {
    const room = salaDe(ws);
    if (!room || room.status !== 'open') return;
    if (room.desafioVida) {
        enviar(ws, 'Rival_Vivo_Confirmado', { ocupado: true });
        return;
    }
    const yo = miembroDe(room, ws);
    const rival = rivalDe(room, ws);
    if (!yo || !rival) return;

    const id = crypto.randomUUID();
    const idTemporizador = setTimeout(() => agotarRespuestaVida(room, id), TIEMPO_RESPUESTA_VIDA);
    room.desafioVida = {
        id,
        solicitante: yo.clave,
        consultado: rival.clave,
        idTemporizador,
    };
    enviar(rival.user, 'Preguntar_Rival_Vivo', {
        id,
        tiempoMaximo: TIEMPO_RESPUESTA_VIDA,
    });
}

function responderRivalVivo(ws, data) {
    const room = salaDe(ws);
    const desafio = room?.desafioVida;
    const yo = room ? miembroDe(room, ws) : null;
    if (!room || !desafio || !yo) return;
    if (desafio.id !== data?.id || desafio.consultado !== yo.clave) return;

    clearTimeout(desafio.idTemporizador);
    const solicitante = room.miembros.find((m) => m.clave === desafio.solicitante);
    room.desafioVida = null;
    if (solicitante) {
        enviar(solicitante.user, 'Rival_Vivo_Confirmado', { id: desafio.id });
    }
}

function agotarRespuestaVida(room, id) {
    const desafio = room?.desafioVida;
    if (!desafio || desafio.id !== id || room.status !== 'open') return;
    const solicitante = room.miembros.find((m) => m.clave === desafio.solicitante);
    const consultado = room.miembros.find((m) => m.clave === desafio.consultado);
    if (solicitante) enviar(solicitante.user, 'Resultado_Partida', 'victoria');
    if (consultado) enviar(consultado.user, 'Resultado_Partida', 'derrota');
    cerrarSala(room);
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
        jugadas: { jugadorA: estadoJugada(), jugadorB: estadoJugada() },
        entregas: { jugadorA: null, jugadorB: null },
        desafioVida: null,
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
    room.jugadas = { jugadorA: estadoJugada(), jugadorB: estadoJugada() };
    room.entregas = { jugadorA: null, jugadorB: null };
}

function cerrarSala(room) {
    if (room.desafioVida?.idTemporizador) {
        clearTimeout(room.desafioVida.idTemporizador);
    }
    room.desafioVida = null;
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
            jugadas: Object.fromEntries(Object.entries(r.jugadas).map(([clave, j]) => [
                clave,
                {
                    estado: Array.isArray(j.configuracion) ? 'estable' : j.configuracion,
                    modificable: j.modificable,
                    finalizado: j.finalizado,
                },
            ])),
            status: r.status,
        })),
        socketsVivos: wss.clients.size,
    };
}
