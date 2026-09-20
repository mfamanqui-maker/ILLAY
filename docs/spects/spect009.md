# Spect 009 — Crear niveles

> **Contrato comun.** Estas diez reglas mandan sobre lo que diga este spect.
> Fuente canonica: [contrato.md](contrato.md).
>
> 1. Dos escenas y solo dos: `PhaserMaster` (mundo) y `generarInterfaz` (HUD). Todo lo demas recibe la escena por parametro.
> 2. Nadie busca a nadie: prohibidos `scene.get()` y `scene.settings.data`. Se inyecta, o se habla por el emisor de eventos de PhaserMaster.
> 3. Las escenas no se declaran en `main.js`; `vista.js` las anade con `game.scene.add()`.
> 4. El tablero es base 1 hacia afuera. Solo `UtilsTablero` indexa en base 0.
> 5. El azar se resuelve en el cliente dueno de la potestad al confirmar, **antes de enviar**, y el resultado viaja en el payload.
> 6. La configuracion serializable es `{ id, nombreDeAccion, objetivo, azar }`. Las acciones viajan por nombre, nunca como funcion.
> 7. PhaserMaster es dueno del estado, no del comportamiento: metodos de 15 lineas, archivo por debajo de 300.
> 8. `utilidadesDeSeleccion.js`: funciones puras, cero imports de Phaser.
> 9. `IndexDePotestades.js` no importa panel, orbes ni show.
> 10. Orden de fases por grupo de velocidad: cancelaciones, resolucion contra la foto, muertes, animacion. El guion no avanza hasta que el show termina.

---



## Objetivo

Cambiar la forma en que se generan los niveles para que sea mas facil para los colaboradores. Dar a los colaboradores unos pocos moldes de ejemplo y las herramientas para
generar niveles infinitos alterandolos, sin escribir un JSON por cada uno. 

## Este spect es fundacional

Fija la forma del molde, que es la entrada de todo el sistema. `vista.js` lo
recibe, `AdministradorTablero` construye el tablero con el, `IndexDePotestades`
instancia las potestades con el, y `finalidad.js` lee de el a donde ir al
terminar. Cambiar el molde despues obliga a tocar los cuatro.

## Archivos

```
frontend/src/battle/crearNiveles/
  Molde001.json           arena 5x5 simetrica, rescatado de data/prueva.json
  Molde002.json           pasillo 8x4 con obstaculos en el centro
  Molde_Multiplayer.json  tablero fijo 7x7, equipos vacios
  TabuladorDeMoldes.js
```



## Forma del molde

```json
{
  "nombre": "texto libre",
  "configTablero": { "filas": 5, "columnas": 5, "casillaArquetipo": "cesped", "tamaño": 400 },
  "casillasEspeciales": [ { "arquetipo": "vacio", "posicion": { "x": 3, "y": 3 } } ],
  "equipos": {
    "Aliados":  [ { "arquetipo": "lumel", "invetario": [], "nivel": 5, "posicion": { "x": 1, "y": 1 } } ],
    "Enemigos": [ ... ]
  },
  "reglasExtra": {
    "tiempoDeReflexion": 100000, // en milisegundos
    "condicionesVictoriaExtra": "",
    "clima": "soleado",
    "retiradas": true,
    "muertesPermanentes": false,
    "gestiondelGuion": "porVelocidad", // "porVelocidad" o "caos"
    "destino": { "victoria": { "key": "globalMap", "x": 222, "y": 690 }, "derrota": {...}, "empate": {...} }
  }
}
```

Coordenadas base 1 (regla 4). `"casillaArquetipo": "cesped"` es el tipo de casilla por defecto;
`casillasEspeciales` sobreescribe casillas sueltas, y `"arquetipo": "vacio"` significa hueco.
ahora se usa "arquetipo" en vez de "casillaId" para que sea mas claro.

## Contrato de TabuladorDeMoldes.js


| Funcion                                   | Que hace                                           |
| ----------------------------------------- | -------------------------------------------------- |
| `MOLDES`                                  | mapa clave → ruta del JSON                         |
| `cargarMolde(escena, clave)`              | devuelve el JSON parseado                          |
| `validarMolde(molde)`                     | `{ valido, errores[] }`                            |
| `alterarMolde(molde, opciones)`           | devuelve una copia alterada, sin tocar el original |
| `generarSerie(molde, cantidad, opciones)` | una tanda de niveles                               |


`alterarMolde` es la pieza central. Deberia poder cambiar el tamaño del
tablero, repartir casillas especiales, subir o bajar niveles y cambiar
arquetipos, siempre dejando el molde de entrada intacto.

## Solo modo historia

El multijugador usa `Molde_Multiplayer.json`, que es fijo. Los dos clientes
tienen que jugar el mismo tablero y ninguno puede generarlo por su cuenta: si
cada uno tabulase el suyo, jugarian partidas distintas creyendo que juegan la
misma.

Por eso la regla 5 no aplica a este archivo. Nada de lo que produce viaja por
red, asi que puede usar `Math.random` sin mas.

Los equipos de `Molde_Multiplayer.json` estan vacios a proposito: los tuyos los
pone el selector de personaje, y los del rival llegan por `Partida_Encontrada`.

## Vocabulario

Aqui **molde** significa plantilla de nivel y solo eso. El codigo viejo usaba
la misma palabra para la plantilla de un sprite (`phaserMoldFactory`,
`moldePhaser`); ese sentido queda retirado, y en `PotestadesTablero.js` se
llama `plantillaSprite`.

## Lo que el validador tiene que atrapar

El molde de ejemplo ya traia dos defectos que un colaborador va a repetir:

1. `posicion.y` **como texto.** Una entrada de `prueva.json` tenia `"y": "3"`
  en vez de `3`. Las comparaciones de rango con texto dan resultados falsos
   sin lanzar ningun error, que es la peor clase de bug.
2. `invetario` **mal escrito.** Se conserva porque es la convencion que ya usa
  el codigo, pero el validador tiene que aceptarla **explicitamente** para
   que nadie la "arregle" y rompa la carga en silencio.

Y lo obvio, antes de generar nada:

- Ninguna potestad en una casilla con `id: 0`.
- Ni dos potestades en la misma casilla.
- Ids unicos entre los dos bandos, no por bando.
- Toda `posicion` dentro de `filas` x `columnas`.
- Todo `arquetipo` resoluble por `IndexDePotestades.resolverClase`.



## Invariantes

- `alterarMolde` nunca modifica su entrada. Copia y devuelve.
- Un molde alterado sigue pasando `validarMolde`. Generar un nivel invalido es
peor que no generar ninguno.
- El molde no contiene funciones. Es JSON y tiene que seguir siendolo.



## Decisiones ya tomadas

- Los moldes son JSON, no modulos JS. Un colaborador que quiera hacer un nivel
no deberia tener que escribir codigo.
- `Molde001.json` es `prueva.json` limpiado: se le quito el envoltorio `prueva1`
y se corrigio el `"3"`. Los numeros de las potestades no se han tocado.
- `tamaño` con ene se conserva. Ya esta en el codigo.



## Criterio de cierre

- Los tres moldes pasan `validarMolde` sin errores.
- Un molde con `"y": "3"` produce un error del validador que dice el campo, la
potestad y que se esperaba un numero.
- `generarSerie(Molde001, 20)` da veinte niveles distintos, todos validos, y
`Molde001` sigue igual que antes de llamarla.
- Cargar `Molde_Multiplayer.json` y pasarselo a `iniciarBatalla` levanta un
tablero 7x7 vacio sin lanzar nada.

