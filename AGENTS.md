# AGENTS.MD - ILLAY - BATTLE SYSTEM

## Projecto

Esta rama de Illay es la encargada de la gestión de las batallas para los jugadores.
Se necesita implementar un sistema de batalla usando Phaser 3 además de WebSockets para la comunicación entre el cliente y el servidor.

La dinamica de la batalla es la siguiente:

1. El jugador selecciona sus potestades (personajes jugables con habilidades y caracteristicas) y los coloca en el tablero.
2. El jugador espera a su rival (si es IA se inicia la batalla automáticamente).
3. El sistema interpreta los datos de su rival y los muestra en pantalla. generando el tablero y los personajes de ambos jugadores.
4. Cada casilla del tablero puede contener informacion de su estado (distintos tipos de casillas) o contener a un personaje.
5. Cada potestad tiene unas habilidades y estadisticas cuya informacion puede ser obtenida por el jugador atraves de un panel de control.
6. Cada potestad tiene una lista de habilidades que puede usar en la batalla.
7. El sistema debe de guardar las acciones que decidio realizar cada potestad en el turno actual. (config 1)
8. El sistema debe de compartir la informacion de las acciones que decidio realizar cada potestad en el turno actual con el servidor y compartirla al rival. 
9. El sistema debe de recibir la informacion de las acciones que decidio realizar cada potestad en el turno actual del rival y mostrarlas en pantalla solo si las potestades del jugador lo necesitan. (config 2)
10. El sistema debe de esperar a que el jugador seleccione la accion que desea realizar cada potedtad que necesita esta nueva informacion. (config 2)
11. El sistema debe de continuar con este proceso de embiar informacion y recibirla hasta que todas las potestades hayan realizado sus acciones. (config n)
12. El sistema debe de confirmar que todas las acciones se han realizado correctamente y confirmacion su ejecucion con el servidor. (precombate)
13. El sistema ordena las acciones de cada potestad y las ejecuta en orden de prioridad.
14. Cada potestad realiza su accion correspondiente y hace su animacion de forma asincrona pero respetando el orden de prioridad.
15. las acciones se guardan para luego generar el informe de la batalla.
16. El jugador tiene acceso a una interfaz de control de la batalla que le permite ver el historial de jugadas, rendirce, pauzar, ignorar la interfaz o confirmar su configuracion de acciones de sus potestades.
17. El sistema debe de hacer esto en bucle hasta que un jugador gane la batalla ya sea por que el otro se rinda, porque todas sus potestades hayan sido eliminadas o porque haya cumplido alguna condicion de victoria o derrota.
18. Se tiene que tener en cuenta que el sistema puede recibir informacion de las configuraciones de acciones de las potestades de su rival de 2 formas: por medio del WebSocket o por medio de un sistema de IA que no vamos a desarrollar en esta rama.

## Protocolo de comunicacion entre el cliente y el servidor

El protocolo de comunicacion entre el cliente y el servidor es el siguiente:

| Tipo de mensaje | Descripcion | Destino |
|-----------------|-----------------|-----------------|
| Buscar_Partida  | Busca una partida para el jugador | Servidor |
| Partida_Encontrada  | Se ha encontrado una partida para el jugador | Cliente |
| Partida_No_Encontrada  | No se ha encontrado una partida para el jugador despues de un tiempo de busqueda| Cliente |
| Partida_Finalizada  | Un ha ganado la partida y embia el resultado al servidor donde se termina quien gana o pierde o si es empate | Servidor |
| Resultado_Partida  |La partida ha finalizado envia el resultado de la batalla al usuario| Cliente |
| Enviar_Config_Acciones  | Se envian las configuraciones de acciones de las potestades del jugador al servidor y necesita más informacion de las acciones de las potestades del rival | Servidor |
| Recibir_Config_Acciones  | Se reciben las configuraciones de acciones de las potestades del rival al cliente y necesita más informacion de las acciones de las potestades del jugador | Cliente |
| Enviar_Config_Acciones_Final  | Se envian las configuraciones de acciones de las potestades del jugador al servidor y no necesita más informacion de las acciones de las potestades del rival | Servidor |
| Recibir_Config_Acciones_Final  | Se reciben las configuraciones de acciones de las potestades del rival al cliente y no necesita más informacion de las acciones de las potestades del rival | Cliente |

## Inputs del cliente

El cliente debe de poder interactuar con la batalla de las siguientes formas:

+ Opciones de la interfaz de control de la batalla.
+ Interactuar con el tablero de la batalla.
+ Interactuar con las potestades de la batalla.
+ Interactuar con las orbes de las potestades.

## Estilos

- Estilo de juego: 2D top down.
- JS + Phaser 3 + WebSockets + HTML + CSS.

## Reglas

- Lee 
- No añades nuevas librerias o frameworks sin consultar al spect previamente.
- No modifiques archivos de spect/ salvo una petición explícita.
