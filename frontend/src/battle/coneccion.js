/**
 * coneccion.js — Transporte WebSocket del battle system.
 *
 * SPECT: docs/spects/spect010.md
 *
 * QUE SERA: la unica pieza que sabe hablar con el servidor. Vive dentro de
 * battle/ para que el sistema traiga su propia conexion y se pueda copiar a
 * otro proyecto de una pieza. system/characterSelectScene.js lo importa desde
 * aqui para el emparejamiento; PhaserMaster lo usa para el bucle de rondas.
 *
 * El socket es un singleton de modulo: los dos comparten la misma conexion, y
 * eso es intencionado. El emparejamiento y la batalla son la misma sesion.
 *
 * QUE TIENE QUE CAMBIAR EL SPECT 010:
 *
 *   1. Los nombres. Hoy son join_room y room_created, inventados sobre la
 *      marcha. El protocolo de AGENTS.md dice Buscar_Partida,
 *      Partida_Encontrada, Enviar_Config_Acciones, Recibir_Config_Acciones y
 *      las variantes _Final.
 *
 *   2. Faltan las rondas enteras. Hoy no existe ningun mensaje de
 *      configuracion de acciones: el rival era un JSON escrito a mano.
 *
 *   3. FUGA DE LISTENERS en esperar(). El Glosario.md ya la denuncia por su
 *      nombre. Mirando el codigo de abajo: onMessage se anade siempre, pero
 *      solo se quita cuando el tipo coincide. Si el parseo falla se hace
 *      reject SIN quitarlo, y si la promesa nunca se cumple el oyente se queda
 *      para siempre. En un bucle que llama a esperar() una vez por ronda, eso
 *      se acumula durante toda la partida.
 *
 *   4. enviarMensaje() lee socket.readyState sin comprobar que socket exista:
 *      si se llama antes de coneccion(), revienta con un TypeError.
 *
 * ESTADO: rescate sin adaptar. Funciona para el emparejamiento actual.
 */

let socket = null;

/*
    Esta función se encarga de la coneccion con el servidor de websockets.
    y administra el estado de la coneccion.
*/
export function coneccion() {
    return new Promise((resolve, reject) => { 
        socket = new WebSocket('ws://localhost:8080');
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

/*
    Esta función se encarga de enviar mensajes al servidor.
    @param {Object} mensaje - El mensaje a enviar al servidor.
    @returns {Promise} - La promesa que resuelve cuando el mensaje es enviado.
*/
export function enviarMensaje(mensaje) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(mensaje));
    } else {
        console.error('No se puede enviar mensaje, la coneccion no esta abierta');
    }
}

/*
    Esta función se encarga de recibir mensajes del servidor.
    @param {string} type - El tipo de mensaje a recibir.
    @returns {Promise} - La promesa que resuelve con el mensaje recibido.
*/
export function esperar(type) {
    return new Promise((resolve, reject) => {
        function onMessage(message) {
            try {
                const data = JSON.parse(message.data);
                if (data.type === type) {
                    socket.removeEventListener('message', onMessage);
                    resolve(data.data);
                }
            } catch (error) {
                console.error('Error al parsear el mensaje', error);
                reject(error);
            }
        }
        socket.addEventListener('message', onMessage);
    });
}

/*
    Esta función se encarga de cerrar la coneccion con el servidor.
*/
export function cerrarConeccion() {
    socket.close();
}