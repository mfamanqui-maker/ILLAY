# Constitución

Reglas que la IA debe seguir al leer, proponer o modificar archivos de este repositorio.  
**No** es la especificación del juego. El dominio, el ciclo de batalla y el protocolo de red viven en `AGENTS.md` y en `spect/`.

---

## 1. Alcance de este archivo

- Este documento manda sobre **cómo se trabaja**.
- `AGENTS.md` y `spect/` mandan sobre **qué se construye**.
- Si una regla de trabajo choca con la spec, se pregunta. No se “arregla” la spec desde el código.
- No se usa esta constitución para volcar arquitectura, lore, ni listas de mensajes.

---

## 2. Antes de tocar un archivo

1. Leer el archivo (y sus vecinos inmediatos) antes de editarlo.
2. Hacer preguntas antes de editar para evitar ambiguedades.
3. Crear el spect del cambio antes de editar si no existe.
4. Decir qué archivos se van a cambiar y por qué.
5. Decir el impacto sobre lo que ya existe: qué se conserva y qué no se rompe.
6. Si el cambio es una refactorización grande, esperar confirmación. No reescribir por iniciativa propia.
7. No ampliar el alcance. Se hace lo pedido, no una limpieza general del repo.

---

## 3. Archivos y dependencias

- No modificar `spect/` salvo petición explícita.
- No añadir librerías ni frameworks sin consultar la spec primero.
- Stack ya permitido: JavaScript (ES6+), Phaser 3, `ws` / WebSockets, HTML, CSS.
- No inventar `type` de red, nombres de dominio ni convenciones nuevas si ya existen en `AGENTS.md` o en el código.
- No mover, renombrar ni fusionar módulos “para dejarlo más limpio” si no se pidió.

---

## 4. Cómo se escribe el código

Este proyecto es el juego **y** el material de aprendizaje de su autor. Las dos cosas pesan igual.

- Se puede (y se debe) usar código sofisticado cuando el problema lo pide: patrones, encapsulación, máquinas de estado, despachadores, etc.
- Sofisticado no autoriza código oscuro. Cada pieza avanzada tiene que poder entenderse.
- Comentarios de **intención e invariantes**, no narración de lo obvio.
- Si se usa un patrón o un término técnico, se nombra y se define en una frase (o se apunta al glosario).
- Se explica por qué esa solución es mejor que la alternativa más simple.
- Se respetan nombres y separación que el archivo ya tenga. No se traduce el dominio a jerga genérica si el proyecto ya tiene palabra.

Prohibido:

- Parches que “funcionan” y nadie puede explicar.
- Simplificar hasta mentir el problema, solo para que se lea fácil.
- Comentarios de relleno, TODOs de adorno, o documentar el proyecto entero dentro de un módulo.

---

## 5. Cómo se explica al autor

Al proponer o entregar un cambio:

- Tono de mentor: claro, corto, preciso.
- Primero la decisión, después el detalle.
- Definir lo que no sea obvio. No dar una clase de todo el sistema.
- Si hay una mejora real de rendimiento, modularidad o escalabilidad en lo que se está tocando, se menciona. No se convierte en otro trabajo.

---

## 6. Criterio para considerar un cambio cerrado

El cambio está cerrado cuando:

- Hace solo lo que se pidió.
- Compila con las reglas de los archivos tocados (imports, responsabilidades, estilo local).
- El autor puede seguir el hilo: qué cambió, por qué, y qué patrón se usó.
- No se tocaron `spect/`, dependencias ni protocolos sin permiso.

---

## 7. Enmiendas

Estas reglas solo se cambian si el autor lo pide. El código no las enmienda en silencio.
