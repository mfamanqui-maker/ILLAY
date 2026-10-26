/**
 * Respuesta del rival cuando la partida no tiene socket (partida del mapa).
 *
 * Devuelve filas serializables. `correrTurno` las une a la configuracion
 * del jugador y con eso arma la pila de tareas, antes del guion y el show.
 *
 * Cada fila: { id, nombreDeAccion, objetivo, azar }
 * `id` tiene que ser el de una potestad enemiga que exista en el registro.
 */

let primeraVez = true;

export function respuestaDeIA() {
  if (primeraVez) {
    const muestra = {}
    const analisis = obtenerAnalisis(muestra)
    console.log(analisis)
  } else {
    
  }
}

async function obtenerAnalisis(muestra) {
  try {
    const respuesta = await fetch('https://api.ejemplo.com/recurso', {
      method: 'POST',
      headers: {
        'Content-Type': 'aplication/json' //esto puede estar mal
      },
      body: JSON.stringify(muestra) 
    })
    if (!respuesta) throw new Error('Hubo un error al conectar con el Api')
    const datos = JSON.parse(respuesta)
    return datos
  } catch (error) {
    console.error('Error en la peticion', error)
  }
}

async function obtenerConfiguración() {

}
