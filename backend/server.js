const { WebSocketServer, WebSocket } = require('ws');
const wss = new WebSocketServer({ port: 8080 });

const rooms = new Map();
const clients = []

wss.on('error', (error) => {
    console.log('error', error);
});

wss.on('close', () => {
    console.log('servidor cerrado');
});

wss.on('connection', (ws, req) => {
    console.log('estado del servidor', estadoServidor());
    const ip = req.socket.remoteAddress;

    ws.on('close', () => {
        const i = clients.findIndex((c) => c.user === ws);
        if (i !== -1) clients.splice(i, 1);
    });

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch {
            return;
        }
        switch (data.type) {
            case 'join_room':
                const yo = { user: ws, data: data.data };
                if (clients.length === 0) {
                    clients.push(yo);
                    break;
                }
                const otro = clients.shift();
                const room = createRoom([otro, yo]);
                rooms.set(room.id, room);
                avisarSalaCreada(room);
                break;
            default:
                console.log('mensaje desconocido', data);
                break;
        }
    });
});

/**
 * Crea una sala con los miembros proporcionados
 * @param {Array} miembros - Los miembros de la sala
 * @returns {Object} - La sala creada
 */
function createRoom(miembros) { 
    const room = {
        id: crypto.randomUUID(),
        miembros: miembros,
        mensajes: [],
        status: 'open',
    }
    return room;
}

/**
 * Avisa a los 2 miembros: cada uno recibe el id de sala y el equipo del otro.
 */
function avisarSalaCreada(room) {
    const [a, b] = room.miembros;
    enviar(a.user, 'room_created', { id: room.id, rival: b.data });
    enviar(b.user, 'room_created', { id: room.id, rival: a.data });
}

function enviar(ws, type, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data: payload }));
    }
}

function estadoServidor() {
    return {
        enCola: clients.length,
        salas: [...rooms.values()].map((r) => ({
            id: r.id,
            miembros: r.miembros.length,
            mensajes: r.mensajes.length,
            status: r.status,
        })),
        socketsVivos: wss.clients.size,
    }
}