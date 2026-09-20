/**
 * coneccion.js — Transporte WebSocket del battle system.
 *
 * SPECT: docs/spects/spect010.md
 *
 * QUE ES: la unica pieza que sabe hablar con el servidor. Vive dentro de
 * battle/ para que el sistema traiga su propia conexion y se pueda copiar a
 * otro proyecto de una pieza. characterSelectScene lo importa desde aqui
 * para el emparejamiento; PhaserMaster lo usa para el bucle de rondas.
 *
 * El socket es un singleton de modulo: emparejamiento y batalla son la
 * misma sesion. El negociador recibe el objeto `transporte`, no el socket:
 * sustituir el WebSocket por una IA local no deberia tocar nada mas.
 *
 * Invariantes:
 *   - Todo mensaje es { type, data }. Sin excepciones.
 *   - Los type son exactamente los de AGENTS.md.
 *   - esperar() siempre termina: resuelve, o rechaza por tiempo o parseo.
 *   - Un _Final propio no cierra la escucha del rival.
 *
 * ESTADO: primitivas, API de protocolo y buzon de entrada. El servidor
 * reenvia con los type de AGENTS.md y guarda Recibir hasta que el rival
 * entra en la ronda.
 */

const TIEMPO_MAXIMO_POR_DEFECTO = 30000;

let socket = null;
/** Cola FIFO de sobres. Un solo oyente permanente; esperar() consume.
 *  Sin esto, un Recibir que llega antes del listener se pierde. */
const buzon = [];
const esperas = [];

/**
 * Sobre del protocolo: type dice que es, data es la carga.
 * Un helper evita que alguien mande el payload suelto, sin type.
 */
function sobre(type, data) {
    return { type, data };
}

function exigirSocketAbierto() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('No hay conexion. Llama a coneccion() primero.');
    }
}

/*
    Abre el socket si no esta abierto. Quien ya lo tiene reusa el mismo.
*/
export function coneccion() {
    if (socket?.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
        socket = new WebSocket('wss://chasing-uncharted-ambiance.ngrok-free.dev');
        socket.addEventListener('message', alMensaje);
        socket.addEventListener('open', () => {
            resolve();
        });
        socket.addEventListener('close', () => {
            console.error('Coneccion cerrada');
        });
        socket.addEventListener('error', (e) => {
            console.error('Error de coneccion', e);
            reject(e);
        });
    });
}

function alMensaje(message) {
    let recibido;
    try {
        recibido = JSON.parse(message.data);
    } catch (error) {
        const espera = esperas.shift();
        if (!espera) return;
        espera.limpiar();
        espera.reject(error);
        return;
    }
    buzon.push(recibido);
    entregarDelBuzon();
}

function entregarDelBuzon() {
    for (let i = 0; i < esperas.length; i += 1) {
        const espera = esperas[i];
        const idx = buzon.findIndex((m) => espera.tipos.includes(m.type));
        if (idx === -1) continue;
        const recibido = buzon.splice(idx, 1)[0];
        esperas.splice(i, 1);
        espera.limpiar();
        resolverEspera(espera, recibido);
        i -= 1;
    }
}

function resolverEspera(espera, recibido) {
    if (espera.tipos.length === 1) {
        espera.resolve(recibido.data);
        return;
    }
    espera.resolve({ type: recibido.type, data: recibido.data });
}

/*
    Envia un sobre { type, data }. Sin socket abierto el mensaje se perdia
    en un console.error; ahora falla en voz alta para que el llamador lo vea.
*/
export function enviarMensaje(mensaje) {
    exigirSocketAbierto();
    socket.send(JSON.stringify(mensaje));
}

/*
    Espera un type, o el primero de una lista. Lee el buzon antes de
    bloquearse: el oyente permanente ya guardo lo que llego temprano.
    El timeout sigue siendo el cierre si nadie manda. Un type resuelve
    data. Varios resuelven { type, data }.
*/
export function esperar(tipo, tiempoMaximo = TIEMPO_MAXIMO_POR_DEFECTO) {
    const tipos = Array.isArray(tipo) ? tipo : [tipo];
    return new Promise((resolve, reject) => {
        if (!socket) {
            reject(new Error('No hay conexion. Llama a coneccion() primero.'));
            return;
        }

        let terminado = false;
        let idTiempo;
        const espera = { tipos, resolve, reject, limpiar };

        function limpiar() {
            if (terminado) return;
            terminado = true;
            clearTimeout(idTiempo);
        }

        const idx = buzon.findIndex((m) => tipos.includes(m.type));
        if (idx !== -1) {
            const recibido = buzon.splice(idx, 1)[0];
            resolverEspera(espera, recibido);
            return;
        }

        idTiempo = setTimeout(() => {
            const i = esperas.indexOf(espera);
            if (i !== -1) esperas.splice(i, 1);
            limpiar();
            reject(new Error(`Tiempo agotado esperando ${tipos.join(', ')}`));
        }, tiempoMaximo);

        esperas.push(espera);
    });
}

/*
    Cierra si hay socket. Sin guarda, socket.close() revienta con TypeError.
*/
export function cerrarConeccion() {
    if (!socket) return;
    socket.removeEventListener('message', alMensaje);
    socket.close();
    buzon.length = 0;
    esperas.length = 0;
}

/** El negociador pregunta esto, no el readyState del socket. */
export function estaConectado() {
    return socket?.readyState === WebSocket.OPEN;
}

export function buscarPartida(equipo) {
    enviarMensaje(sobre('Buscar_Partida', { equipo }));
}

export function esperarPartida() {
    return esperar(['Partida_Encontrada', 'Partida_No_Encontrada']);
}

export function enviarConfigAcciones(configuracion) {
    enviarMensaje(sobre('Enviar_Config_Acciones', configuracion));
}

export function enviarConfigAccionesFinal(configuracion) {
    enviarMensaje(sobre('Enviar_Config_Acciones_Final', configuracion));
}

/** Delegado de PhaserMaster._enviarConfiguracion: esFinal elige el type. */
export function enviarConfiguracion(configuracion, esFinal) {
    if (esFinal) {
        enviarConfigAccionesFinal(configuracion);
        return;
    }
    enviarConfigAcciones(configuracion);
}

/**
 * Escucha al rival sin asumir que ya cerro. Resultado_Partida entra para
 * que una pestana cerrada no deje esta promesa abierta.
 */
export async function recibirConfigDelRival() {
    const respuesta = await esperar([
        'Recibir_Config_Acciones',
        'Recibir_Config_Acciones_Final',
        'Resultado_Partida',
    ]);
    return {
        type: respuesta.type,
        data: respuesta.data,
        esFinal: respuesta.type === 'Recibir_Config_Acciones_Final',
    };
}

export function enviarPartidaFinalizada(resultado) {
    enviarMensaje(sobre('Partida_Finalizada', resultado));
}

export function esperarResultadoPartida() {
    return esperar('Resultado_Partida');
}

/** Superficie inyectable. PhaserMaster recibe esto, no el socket. */
export const transporte = {
    coneccion,
    estaConectado,
    buscarPartida,
    esperarPartida,
    enviarConfigAcciones,
    enviarConfigAccionesFinal,
    enviarConfiguracion,
    recibirConfigDelRival,
    enviarPartidaFinalizada,
    esperarResultadoPartida,
    cerrarConeccion,
};
