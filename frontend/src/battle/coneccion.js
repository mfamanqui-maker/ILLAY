// Contexto: este es un archibo ayudante con la logica de la coneccion del servidor

const TIEMPO_MAXIMO_POR_DEFECTO = 30000;

let socket = null;
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

const URL_LOCAL = 'ws://localhost:8080';
/** Pegar el Forwarding de ngrok. Da igual https o wss; aqui se corrige. */
const URL_NGROK = 'https://chasing-uncharted-ambiance.ngrok-free.dev';

function urlPublica() {
    const cruda = String(URL_NGROK || '').trim();
    if (!cruda) return URL_LOCAL;
    return cruda.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://');
}

function urlDelSocket() {
    const host = typeof location === 'undefined' ? '' : location.hostname;
    const esPaginaReal = host === 'alliy.site' || host.endsWith('.alliy.site');
    const url = esPaginaReal ? urlPublica() : URL_LOCAL;
    console.log('[coneccion]', esPaginaReal ? 'alliy.site → ngrok' : 'prueba local → 8080', url);
    return url;
}

const TIEMPO_MAXIMO_CONECCION = 2000;

function esperarReloj(ms) {
    return new Promise((resolve) => { setTimeout(resolve, ms); });
}

function soltarSocket() {
    if (!socket) return;
    socket.removeEventListener('message', alMensaje);
    try { socket.close(); } catch { /* ya estaba muerto */ }
    socket = null;
}

/*
    Abre el socket si no esta abierto. Quien ya lo tiene reusa el mismo.
    Un close o error sin open es servidor apagado: el overlay no puede
    quedarse en el loop de buscar.
*/
export function coneccion() {
    if (socket?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (socket) soltarSocket();
    return new Promise((resolve, reject) => {
        let terminado = false;
        let abrio = false;
        const candidato = new WebSocket(urlDelSocket());

        function fallar(error) {
            if (terminado) return;
            terminado = true;
            clearTimeout(id);
            candidato.removeEventListener('message', alMensaje);
            try { candidato.close(); } catch { /* */ }
            reject(error);
        }

        const id = setTimeout(() => {
            fallar(new Error('Servidor apagado'));
        }, TIEMPO_MAXIMO_CONECCION);

        candidato.addEventListener('message', alMensaje);
        candidato.addEventListener('open', () => {
            if (terminado) {
                try { candidato.close(); } catch { /* */ }
                return;
            }
            terminado = true;
            clearTimeout(id);
            abrio = true;
            socket = candidato;
            resolve();
        });
        candidato.addEventListener('close', () => {
            if (!abrio) fallar(new Error('Servidor apagado'));
        });
        candidato.addEventListener('error', () => {
            fallar(new Error('Servidor apagado'));
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

/** Configs de la ronda anterior no deben resolverse como la jugada nueva. */
export function vaciarBuzonDeConfigs() {
    const tipos = ['Recibir_Config_Acciones', 'Recibir_Config_Acciones_Final'];
    for (let i = buzon.length - 1; i >= 0; i -= 1) {
        if (tipos.includes(buzon[i]?.type)) buzon.splice(i, 1);
    }
}

export function cancelarEsperas(tipos) {
    const lista = Array.isArray(tipos) ? tipos : [tipos];
    for (let i = esperas.length - 1; i >= 0; i -= 1) {
        const espera = esperas[i];
        if (!espera.tipos.some((tipo) => lista.includes(tipo))) continue;
        esperas.splice(i, 1);
        espera.limpiar();
        espera.reject(new Error('espera cancelada'));
    }
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
    return esperar(['Partida_Encontrada', 'Partida_No_Encontrada'], 22000);
}

export { esperarReloj };

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
export async function recibirConfigDelRival(tiempoMaximo) {
    const respuesta = await esperar([
        'Recibir_Config_Acciones',
        'Recibir_Config_Acciones_Final',
        'Resultado_Partida',
    ], tiempoMaximo);
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
    vaciarBuzonDeConfigs,
    enviarPartidaFinalizada,
    esperarResultadoPartida,
    cerrarConeccion,
};
