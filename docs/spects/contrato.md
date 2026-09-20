# Contrato comun del battle system

Estas diez reglas van copiadas en la cabecera de los diez spects. Existen por
una razon concreta: cada spect lo desarrolla un modelo distinto que no ve los
otros nueve. Sin un contrato compartido, diez modelos producen diez
convenciones incompatibles y el trabajo de integrarlas cuesta mas que el de
escribirlas.

Si un spect contradice al contrato, manda el contrato. Si hace falta cambiar
una regla, se cambia aqui y en los diez spects, no solo en uno.

---

1. **Dos escenas y solo dos.** `PhaserMaster` (el mundo) y `generarInterfaz`
   (el HUD). Todo lo demas es una clase o una funcion que recibe la escena por
   parametro. Nada mas hereda de `Phaser.Scene`.

2. **Nadie busca a nadie.** Prohibidos `scene.get()` y `scene.settings.data`
   dentro de `battle/`. Las dependencias se inyectan por constructor, o se
   habla por el emisor de eventos que crea PhaserMaster.

3. **Las escenas no se declaran en `main.js`.** Cada una exporta su clase;
   `vista.js` las anade en caliente con `game.scene.add()`. Integrar el sistema
   en otro proyecto tiene que costar un solo import.

4. **El tablero es base 1 hacia afuera.** Coordenadas `{x, y}` empezando en 1,
   igual que en los moldes. Solo `UtilsTablero` indexa en base 0, y solo dentro
   de su propio archivo.

5. **El azar se resuelve antes de enviar.** Lo tira el cliente dueno de la
   potestad, en el momento de confirmar, y el resultado viaja dentro del
   payload. Ninguna accion tira un dado durante la ejecucion del guion: eso
   correria por separado en cada cliente y desincronizaria las dos partidas.

6. **La configuracion serializable es
   `{ id, nombreDeAccion, objetivo, azar }`,** donde `azar` lleva el resultado
   ya resuelto de la regla 5. Las acciones viajan por nombre, nunca como
   funcion: un nombre cabe en un JSON, una closure no.

7. **PhaserMaster es dueno del estado, no del comportamiento.** Metodos de 15
   lineas o menos, archivo por debajo de 300. Si un metodo crece, no es suyo.

8. **`utilidadesDeSeleccion.js` usa Phaser solo para marcas de seleccion**
   (brillo de accionismo, dianas y casillas). No importa orbes, panel ni red.
   Si el archivo empieza a hablar de clics o de WebSocket, el trabajo no es suyo.

9. **`IndexDePotestades.js` no importa panel, orbes ni show.** Expone los datos
   con la forma que piden; no los conoce. Si algun dia los importa, la flecha
   de dependencia se ha invertido.

10. **Orden de fases dentro de un grupo de velocidad:** cancelaciones,
    resolucion contra la foto tomada al inicio del grupo, muertes, animacion.
    `guionSincrono` no avanza al grupo siguiente hasta que `showAsincrono`
    termina el actual.

---

## Convenciones menores

- **Idioma:** el codigo se escribe en espanol, como el resto del repo. Los
  identificadores van sin tildes ni enes; los comentarios y la documentacion,
  con ellas.
- **"Molde"** significa plantilla de nivel (`crearNiveles/Molde001.json`) y
  solo eso. La plantilla de un sprite se llama `plantillaSprite`.
- **"Potestad"** es el personaje jugable. No "entidad", no "aliado", no
  "personaje".
- **Nombres del protocolo de red:** los de `AGENTS.md`, con guion bajo y
  mayuscula inicial en cada palabra (`Enviar_Config_Acciones_Final`).
- **Bando:** siempre `'Aliados'` o `'Enemigos'`, como dato, nunca como clase.

## Como leer un spect

Cada uno trae: objetivo en una frase, archivos que crea y que borra, contrato
de cada archivo (que exporta, que recibe, que devuelve), codigo rescatado con
su origen, invariantes del modulo, decisiones ya tomadas que no se discuten, y
criterio de cierre.

El esqueleto ya esta en el repo. Cada archivo de `frontend/src/battle/` lleva
en su cabecera que sera y a que spect pertenece, y trae dentro el codigo
rescatado del sistema viejo, marcado con el archivo y las lineas de origen.
Empezar leyendo el archivo, no la pagina en blanco.
