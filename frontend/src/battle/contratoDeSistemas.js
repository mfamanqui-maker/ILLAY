/**
 * contratoDeSistemas.js — Lo que PhaserMaster pide a los sistemas que monta.
 *
 * SPECT: docs/spects/spect004.md
 *
 * QUE ES: la lista de peticiones de PhaserMaster a los dos sistemas de los que
 * depende para montar una batalla, y a los tres que consumen sus inputs. Es
 * documentacion ejecutable de nada: NO CONTIENE CODIGO, no exporta y nadie lo
 * importa, asi que no puede romper ni condicionar a nadie.
 *
 * POR QUE UN ARCHIVO Y NO UN SPECT: los spects los escribe el autor y no se
 * tocan. Esto es el otro lado de la mesa —lo que el consumidor necesita— y
 * cambia mientras se negocia. Cuando los spects 003 y 006 cierren, este archivo
 * es la lista de verificacion y despues se borra.
 *
 * COMO LEERLO. Los nombres que aparecen entre parentesis son solo la pista de
 * donde vive hoy cada cosa, no un compromiso: los dos sistemas estan en
 * desarrollo y sus firmas van a cambiar. Lo que este archivo fija son tres
 * cosas que sobreviven a cualquier reescritura:
 *
 *   1. QUIEN llama a quien. PhaserMaster pide; los sistemas responden. Ninguno
 *      busca a nadie (regla 2) ni decide por el coordinador.
 *   2. EN QUE ORDEN. El orden esta en PhaserMaster.js, en los comentarios de
 *      preload() y create(); aqui esta el detalle de cada paso.
 *   3. CON QUE FORMA DE DATO. Esto es lo unico que no se puede cambiar sin
 *      hablarlo: si cambia la forma, cambia el contrato.
 */

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA 1 — tablero (spect 003)
// ═══════════════════════════════════════════════════════════════════════════
//
// QUE LE PASA PHASERMASTER
//   - En preload: la escena, para que cargue el spritesheet de hierba.
//   - Al construir: la escena del mundo y el emisor de eventos. Los dos por
//     parametro, porque nada se busca solo.
//   - Al montar: el molde entero. De ahi salen las dimensiones, el arquetipo de
//     casilla por defecto y la lista de casillas especiales.
//   - Durante la batalla: resaltar una casilla.
//   - Al cerrar: que destruya sus objetos y retire sus listeners.
//
// QUE ESPERA RECIBIR: el array bidimensional, base 1 hacia afuera (regla 4).
//
//   tablero[fila - 1][col - 1] -> casilla
//
//   Y cada casilla, con estos tres datos y estos nombres:
//     id            numero. 0 significa casilla inexistente: no se dibuja, no
//                   se pisa y no cuenta para el rango de ninguna accion.
//     entidad       la potestad que la ocupa, o false si esta vacia. false, no
//                   null ni undefined: PhaserMaster pregunta por identidad.
//     casillaPhaser el objeto de pantalla del suelo, para poder resaltarlo.
//
//   PhaserMaster nunca escribe ese `- 1`. Indexar en base 0 es de un solo
//   archivo del sistema del tablero, y de nadie mas.
//
// INTERACCION. El administrador registra zoom, paneo, hover y clic. El hover
// resalta la casilla mientras el cursor esta encima. El paneo es Espacio +
// click arrastrando. El zoom es Ctrl + rueda. El clic suelto detecta y emite;
// no decide. Sus tres eventos entran por RUTAS_DE_INPUT de PhaserMaster:
//     casillaPulsada        { col, fila, casilla }
//     potestadPulsada       { entidad, col, fila }
//     potestadDoblePulsada  { entidad, col, fila }
//
// DOS DECISIONES QUE ESTE CONTRATO CIERRA AHI, NO EN PHASERMASTER
//   a) El tamano de casilla tiene que estar resuelto en UN SOLO SITIO. Hoy vive
//      en el molde (configTablero.tamano) y tambien escrito a mano dentro del
//      sistema. Manda el molde: el sistema lo toma de ahi y lo expone, y
//      PhaserMaster lo lee de ahi para dar la escala a quien coloca los
//      cuerpos. Ningun otro archivo vuelve a escribir el numero.
//   b) La traduccion de arquetipo de casilla ('cesped', 'vacio', lo que venga)
//      a casilla existente o hueco vive ahi. PhaserMaster no interpreta
//      vocabulario de tablero: pregunta si la casilla existe y ya.
//
// ASSET DEL SUELO. grass.png es un spritesheet de 3 por 3 con frames de 46 por
// 46 pixeles. Cada casilla existente elige al azar uno de sus nueve patrones.
// Ese azar es solo visual: no cambia datos ni participa en la sincronizacion.
//
// QUE NO SE LE PIDE: saber nada de potestades, mas alla de guardar la que
// ocupa cada casilla. Ni estadisticas, ni acciones, ni turnos.

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA 2 — datosDePotestades (spect 006)
// ═══════════════════════════════════════════════════════════════════════════
//
// Cuatro peticiones, en el orden en que PhaserMaster las necesita.
//
// 1) EN PRELOAD: que texturas hay que cargar para este molde.
//    Se le pasan los equipos del molde y devuelve descriptores de spritesheet:
//      { clave, archivo, ancho, alto }
//    Los que no salen de disco porque se fabrican en memoria vienen marcados
//    (hoy con archivo en null) y PhaserMaster los salta.
//    POR QUE ASI: preload corre antes de que exista ninguna potestad. Si esta
//    lista solo se pudiera obtener instanciandolas, habria que instanciarlas en
//    preload, que es demasiado pronto: quedarian a medias y con sus texturas sin
//    cargar. Es la unica peticion del sistema que no puede llegar por el
//    registro, y por eso va aparte.
//
// 2) EN CREATE: el registro de la partida.
//    Se le pasan los equipos del molde y la escena (la escena porque hay cuerpos
//    que fabrican su textura en ella). Devuelve algo consultable:
//      - dame la entrada de este id  ->  { bando, potestad }
//      - dame todas
//      - dame las de un bando        ->  'Aliados' | 'Enemigos'
//    El bando es un dato, nunca una clase: en multijugador las potestades del
//    rival son de las mismas familias que las tuyas.
//    Los ids son unicos entre los dos bandos, no por bando, y los asigna quien
//    monta la partida. Un id ausente o repetido es un error temprano, no un
//    valor por defecto: dos clientes numerando distinto no podrian casar sus
//    configuraciones de turno.
//
// 3) PARA PODER PINTARLA: de cada potestad, su cuerpo y su animacion.
//      - la configuracion de animacion estatica: que textura, que fotograma,
//        que escala y que animacion reproducir en reposo.
//      - las definiciones de animacion a registrar en el AnimationManager.
//    PhaserMaster registra las animaciones y le pasa la configuracion a quien
//    crea el sprite. No la interpreta.
//
// 4) PARA PODER REPARTIR LOS INPUTS: de cada potestad, sus datos ya con la
//    forma que pide cada consumidor. Son tres formas distintas del mismo dato:
//      - para las orbes: sus acciones en las tres cadenas (habilidades,
//        objetos, movimiento), cada una con nombre, alcance, velocidad, si esta
//        disponible ahora mismo, su icono, y que informacion le falta al jugador
//        para poder elegirla (nada, una entidad, una casilla, o saber que hizo
//        el rival). Lo ultimo es lo que decide si el turno abre otra ronda.
//      - para el panel: estadisticas, efectos, vida e inventario.
//      - para el guion: velocidad y la funcion ya resuelta (spect 007).
//    Las acciones viajan por nombre, nunca como funcion (regla 6).
//
// QUE NO SE LE PIDE: que sepa donde esta en pantalla, que se coloque sola, ni
// que conozca al panel, a las orbes o al guion. Da los datos con la forma que
// piden; no los conoce (regla 9).

// ═══════════════════════════════════════════════════════════════════════════
// EL PUENTE — quien pone el cuerpo en la casilla (hoy PotestadesTablero)
// ═══════════════════════════════════════════════════════════════════════════
//
// Entre los dos sistemas anteriores hay un trabajo que no es de ninguno:
// recorrer el registro, crear el cuerpo de cada potestad, ponerlo en su casilla
// y dejar la casilla marcada como ocupada. Colocar es aritmetica de tablero, no
// conocimiento de la potestad, y por eso no vive en el sistema 2.
//
// QUE LE PASA PHASERMASTER: la escena, el array del tablero, el registro y el
// tamano de casilla. La orientacion del sprite sale del bando.
//
// QUE ESPERA RECIBIR
//   - Poder preguntar por el cuerpo de un id. Los inputs llegan con la potestad,
//     y para animarla o resaltarla hace falta su objeto de pantalla.
//   - Poder ESPERAR a que termine. Colocar es asincrono (la animacion no puede
//     arrancar en el mismo tick en que se crea el sprite), asi que el montaje
//     necesita saber cuando esta hecho antes de dar el turno al jugador.
//   - El efecto lateral sobre el tablero: la casilla queda ocupada por la
//     potestad. Una casilla sostiene como maximo una.
//   - La casilla apunta a la potestad. La potestad no apunta de vuelta a la
//     casilla ni al array: eso era el objeto infinito de las versiones viejas.

// ═══════════════════════════════════════════════════════════════════════════
// LOS TRES CONSUMIDORES DE INPUT — que les tiene que dar PhaserMaster
// ═══════════════════════════════════════════════════════════════════════════
//
// Es la otra mitad del cableado: el hub recibe eventos, pero tambien tiene que
// alimentar a quien los produce. Los dos primeros hoy se lo buscan por su
// cuenta, con acoplamientos que la regla 2 prohibe; el contrato queda escrito
// aunque quien lo cumpla sea otro spect.
//
// PANEL DE ENTIDAD (spect 005)
//   - Los datos de la potestad ya adaptados.
//   - La escena sobre la que dibujarse: la del HUD, no la del mundo.
//   - Que escena tiene que congelar mientras esta abierto. Hay que pasarselo
//     explicito: si no se le dice, hoy se pone a buscar una escena por su
//     nombre, que es exactamente lo que se esta quitando del sistema.
//   - Como resolver la potestad siguiente cuando el jugador navega con sus
//     flechas, para que el panel no tenga que conocer el registro.
//   - Devuelve un aviso al cerrarse.
//
// ORBES (spect 005)
//   - Las tres cadenas de acciones de la potestad seleccionada.
//   - Con que contar para calcular objetivos validos: el array del tablero,
//     quien esta vivo en cada bando y donde esta cada uno. Hoy lo lee de una
//     escena que ya no existe, asi que hay que inyectarlo.
//   - Devuelve, cuando el jugador ha elegido accion y objetivo, la fila
//     serializable de la regla 6:
//         { id, nombreDeAccion, objetivo, azar }
//     El objetivo es un id de potestad, o coordenadas base 1 si la accion
//     apunta a una casilla. El azar ya viene resuelto por este cliente, que es
//     el dueno de la potestad: se tira al confirmar y nunca al ejecutar.
//
// INTERFAZ / HUD (spect 002)
//   - El emisor, inyectado al lanzarla. Es lo unico que necesita.
//   - El aviso de cambio de fase, para habilitar o deshabilitar botones: durante
//     la ejecucion del guion solo deben responder pausa y rendirse.
//   - Devuelve sus cinco botones como eventos y ahi acaba su trabajo. La red no
//     pasa por aqui.

// ═══════════════════════════════════════════════════════════════════════════
// LISTA DE VERIFICACION (para cuando 003 y 006 cierren)
// ═══════════════════════════════════════════════════════════════════════════
//
//   [ ] El array del tablero se indexa en base 1 desde fuera y cada casilla
//       trae los tres datos con esos nombres.
//   [ ] El tamano de casilla sale del molde y esta escrito en un solo sitio.
//   [ ] Los tres eventos del tablero llegan con la carga descrita arriba.
//   [ ] Los descriptores de spritesheet se pueden pedir sin instanciar nada.
//   [ ] El registro resuelve por id, por bando y completo, y los ids son unicos
//       entre bandos.
//   [ ] Colocar los cuerpos se puede esperar y deja las casillas ocupadas.
//   [ ] Panel y orbes reciben lo que necesitan y no buscan escenas por nombre.
//   [ ] Las orbes devuelven { id, nombreDeAccion, objetivo, azar } y nada mas.
