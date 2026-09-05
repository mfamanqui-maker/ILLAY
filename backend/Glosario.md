## De redes y sockets

**Socket** — el canal abierto entre dos programas. En tu servidor, cada ws es un jugador conectado.
**Handshake** — el saludo inicial en el que cliente y servidor acuerdan hablar por WebSocket. Empieza como una petición HTTP normal y se "asciende" (upgrade).
**Frame / trama** — la unidad mínima que viaja por el cable. Un mensaje tuyo es una trama.
**readyState** — el estado del socket: conectando, abierto, cerrándose, cerrado. Por eso compruebas === WebSocket.OPEN antes de enviar.
**Buffer** — datos binarios crudos. ws te entrega los mensajes así, por eso necesitas .toString().
**Heartbeat / latido (ping-pong)** — mandar señales periódicas para detectar conexiones muertas que no avisaron.
**Broadcast / difundir** — mandar el mismo mensaje a varios destinatarios.
**ECONNREFUSED** — "marqué y no contestó nadie". 
**EADDRINUSE** — "ese puerto ya lo está usando otro programa".

## De protocolo

**Payload** — la carga útil, los datos de verdad del mensaje. En tu código es la propiedad data.
**Envelope / sobre** — la estructura fija que envuelve todo: { type, data }. El sobre dice qué es; el payload es el contenido.
**Serializar** — convertir un objeto en texto para mandarlo (JSON.stringify). Deserializar es lo contrario. Solo se puede serializar lo que sean números, textos, booleanos, arrays y objetos simples: nunca funciones ni sprites.
**Despachador (dispatch table)** — la tabla que asocia cada type con la función que lo atiende.
**Idempotencia** — que repetir la misma operación no cambie el resultado. Importante para que un mensaje duplicado no se aplique dos veces.

## De arquitectura

**Handler / manejador** — la función que atiende un suceso concreto.
**Listener / oyente** — una función suscrita a un evento. Fuga de listeners es cuando los añades sin quitarlos y se acumulan; tu esperar() tiene exactamente eso.
**EventEmitter / emisor de eventos** — objeto que permite "avísame cuando pase X". Sirve para lo que las promesas no: sucesos que ocurren muchas veces.
**Singleton** — que solo exista una instancia de algo en todo el programa. Tu socket en coneccion.js lo es.
**Inyección de dependencias** — pasarle a un objeto lo que necesita por el constructor en vez de que se lo fabrique él.
**Máquina de estados** — modelar algo como una lista cerrada de estados y transiciones legales. Tu sala tiene un campo status que ya apunta a esto.
**Fuente única de verdad** — que un dato viva en un solo sitio y todos lo consulten ahí.
**Servidor autoritativo** — el servidor decide y los clientes obedecen. Tú elegiste lo contrario a propósito.

## De estado compartido y sincronía

**Lockstep determinista** — la arquitectura que elegiste: mandar solo las acciones, y que cada cliente calcule el resultado por su cuenta.
**Determinismo** — que las mismas entradas produzcan siempre exactamente la misma salida.
**Desincronización (desync)** — cuando dos clientes dejan de coincidir. El fallo característico del lockstep.
**Checksum** — un número resumen del estado para detectar desincronización pronto.
**Semilla (seed) y PRNG** — un generador de números "aleatorios" que, arrancando del mismo número inicial, produce la misma secuencia en las dos máquinas.
**Condición de carrera (race condition)** — cuando el resultado depende de qué llegó antes. En red es la fuente principal de bugs imposibles de reproducir.

## De memoria

**Referencia** — los objetos no se copian al asignarlos; se comparten. Dos variables pueden apuntar al mismo objeto.
**Recolector de basura (garbage collector)** — JavaScript libera solo lo que ya nadie referencia. Si tu Map guarda una sala, esa sala nunca se libera aunque el jugador se haya ido.
**Fuga de memoria (memory leak)** — memoria que se acumula y no se libera. 
**O(1) y O(n)** — cuánto crece el coste de una operación con el tamaño. Buscar en un Map por clave es O(1) (instantáneo); recorrer un array es O(n) (crece con la lista).