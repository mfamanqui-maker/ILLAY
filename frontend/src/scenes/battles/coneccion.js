/*
    Este archivo se encarga de la coneccion con el servidor de websockets.
    además de enviar y recibir mensajes del servidor.
    no lo leas w vas a acabar mareado.
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