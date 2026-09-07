/*
 Como usar este archivo:
 1. Importar el archivo de molde.
 2. Llamar a la funcion precargarMoldes(escena) en preload.
 3. Llamar a la funcion cargarMolde(escena, clave) para obtener el molde.
 4. Llamar a la funcion validarMolde(molde) para validar el molde.
 5. Llamar a la funcion alterarMolde(molde, opciones) para alterar el molde. (si se desea generar niveles aleatorios)
 6. Llamar a la funcion generarSerie(molde, cantidad, opciones) para generar una serie de moldes.
*/

import { resolverClase } from '../datosDePotestades/IndexDePotestades.js';

export const MOLDES = {
  molde001: 'src/battle/AlmacenDeMoldes/Molde001.json',
  molde002: 'src/battle/AlmacenDeMoldes/Molde002.json',
  multiplayer: 'src/battle/AlmacenDeMoldes/Molde_Multiplayer.json',
};

const BANDOS = ['Aliados', 'Enemigos'];
const GESTIONES_DE_GUION = new Set(['porVelocidad', 'caos']);
const RESULTADOS_DESTINO = ['victoria', 'derrota', 'empate'];

/** Copia profunda por JSON: si habia una funcion, deja de existir. */
function clonar(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function esNumeroFinito(valor) {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function esEnteroPositivo(valor) {
  return Number.isInteger(valor) && valor > 0;
}

function claveCasilla(x, y) {
  return `${x},${y}`;
}

function etiquetaPotestad(bando, indice, fila) {
  if (fila && fila.id !== undefined && fila.id !== null && fila.id !== '') {
    return `equipos.${bando} id ${fila.id}`;
  }
  return `equipos.${bando}[${indice}]`;
}

function listarPotestades(molde) {
  const lista = [];
  for (const bando of BANDOS) {
    const filas = molde?.equipos?.[bando];
    if (!Array.isArray(filas)) continue;
    filas.forEach((fila, indice) => {
      lista.push({ bando, indice, fila });
    });
  }
  return lista;
}

function contarHuecos(molde) {
  return (molde.casillasEspeciales ?? []).filter((c) => c?.arquetipo === 'vacio').length;
}

function esHueco(molde, x, y) {
  const especial = (molde.casillasEspeciales ?? []).find(
    (c) => c?.posicion?.x === x && c?.posicion?.y === y,
  );
  if (especial) return especial.arquetipo === 'vacio';
  return molde.configTablero?.casillaArquetipo === 'vacio';
}

function posicionesOcupadas(molde) {
  const ocupadas = new Set();
  for (const { fila } of listarPotestades(molde)) {
    const x = fila?.posicion?.x;
    const y = fila?.posicion?.y;
    if (esNumeroFinito(x) && esNumeroFinito(y)) {
      ocupadas.add(claveCasilla(x, y));
    }
  }
  return ocupadas;
}

function casillasDelTablero(molde) {
  const filas = molde.configTablero.filas;
  const columnas = molde.configTablero.columnas;
  const celdas = [];
  for (let y = 1; y <= filas; y++) {
    for (let x = 1; x <= columnas; x++) {
      celdas.push({ x, y });
    }
  }
  return celdas;
}

function casillasLibres(molde, extraOcupadas = []) {
  const ocupadas = posicionesOcupadas(molde);
  for (const extra of extraOcupadas) ocupadas.add(extra);
  return casillasDelTablero(molde).filter((c) => !ocupadas.has(claveCasilla(c.x, c.y)));
}

function barajar(array) {
  const copia = array.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function enteroAleatorio(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function opcionesVacias(opciones) {
  return !opciones || Object.keys(opciones).length === 0;
}

function reclamarNumero(errores, valor, ruta, etiqueta) {
  if (typeof valor === 'string') {
    errores.push(`${etiqueta} ${ruta} es texto "${valor}"; se esperaba un numero`);
    return false;
  }
  if (!esNumeroFinito(valor)) {
    errores.push(`${etiqueta} ${ruta} no es un numero`);
    return false;
  }
  return true;
}

/**
 * Phaser carga en preload. Sin esto, cargarMolde no tiene nada en cache.
 * @param {Phaser.Scene} escena
 */
export function precargarMoldes(escena) {
  for (const [clave, ruta] of Object.entries(MOLDES)) {
    if (!escena.cache.json.exists(clave)) {
      escena.load.json(clave, ruta);
    }
  }
}

/**
 * @param {Phaser.Scene} escena
 * @param {string} clave  una de las claves de MOLDES
 * @returns {object} copia del JSON parseado
 */
export function cargarMolde(escena, clave) {
  if (!Object.prototype.hasOwnProperty.call(MOLDES, clave)) {
    throw new Error(`[TabuladorDeMoldes] Clave de molde desconocida: "${clave}".`);
  }
  if (!escena.cache.json.exists(clave)) {
    throw new Error(
      `[TabuladorDeMoldes] El molde "${clave}" no esta en cache. Llama a precargarMoldes(escena) en preload.`,
    );
  }
  return clonar(escena.cache.json.get(clave));
}

/**
 * @param {object} molde
 * @returns {{ valido: boolean, errores: string[] }}
 */
export function validarMolde(molde) {
  const errores = [];

  if (molde === null || typeof molde !== 'object' || Array.isArray(molde)) {
    return { valido: false, errores: ['el molde tiene que ser un objeto JSON'] };
  }

  if (typeof molde.nombre !== 'string') {
    errores.push('nombre tiene que ser texto');
  }

  const tablero = molde.configTablero;
  if (!tablero || typeof tablero !== 'object') {
    errores.push('falta configTablero');
  } else {
    if (Object.prototype.hasOwnProperty.call(tablero, 'casillaId')) {
      errores.push('configTablero.casillaId esta retirado; usa casillaArquetipo');
    }
    if (typeof tablero.casillaArquetipo !== 'string' || tablero.casillaArquetipo.trim() === '') {
      errores.push('configTablero.casillaArquetipo tiene que ser texto no vacio');
    }
    if (!esEnteroPositivo(tablero.filas)) {
      errores.push('configTablero.filas tiene que ser un entero positivo');
    }
    if (!esEnteroPositivo(tablero.columnas)) {
      errores.push('configTablero.columnas tiene que ser un entero positivo');
    }
    if (!esNumeroFinito(tablero.tamaño)) {
      errores.push('configTablero.tamaño tiene que ser un numero');
    }
  }

  if (!Array.isArray(molde.casillasEspeciales)) {
    errores.push('casillasEspeciales tiene que ser un array');
  } else {
    molde.casillasEspeciales.forEach((casilla, indice) => {
      const etiqueta = `casillasEspeciales[${indice}]`;
      if (!casilla || typeof casilla !== 'object') {
        errores.push(`${etiqueta} tiene que ser un objeto`);
        return;
      }
      if (typeof casilla.arquetipo !== 'string' || casilla.arquetipo.trim() === '') {
        errores.push(`${etiqueta}.arquetipo tiene que ser texto no vacio`);
      }
      const pos = casilla.posicion;
      if (!pos || typeof pos !== 'object') {
        errores.push(`${etiqueta}.posicion tiene que ser un objeto {x, y}`);
        return;
      }
      const xOk = reclamarNumero(errores, pos.x, 'posicion.x', etiqueta);
      const yOk = reclamarNumero(errores, pos.y, 'posicion.y', etiqueta);
      if (xOk && yOk && tablero && esEnteroPositivo(tablero.filas) && esEnteroPositivo(tablero.columnas)) {
        if (pos.x < 1 || pos.x > tablero.columnas || pos.y < 1 || pos.y > tablero.filas) {
          errores.push(`${etiqueta}.posicion (${pos.x}, ${pos.y}) esta fuera de ${tablero.columnas}x${tablero.filas}`);
        }
      }
    });
  }

  const equipos = molde.equipos;
  if (!equipos || typeof equipos !== 'object') {
    errores.push('falta equipos');
  } else {
    for (const bando of BANDOS) {
      if (!Array.isArray(equipos[bando])) {
        errores.push(`equipos.${bando} tiene que ser un array`);
      }
    }
  }

  const idsVistos = new Map();
  const casillasPotestad = new Map();

  if (equipos && typeof equipos === 'object') {
    for (const { bando, indice, fila } of listarPotestades(molde)) {
      const etiqueta = etiquetaPotestad(bando, indice, fila);
      if (!fila || typeof fila !== 'object') {
        errores.push(`${etiqueta} tiene que ser un objeto`);
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(fila, 'inventario')) {
        errores.push(`${etiqueta} usa "inventario"; la convencion del codigo es "invetario"`);
      }
      if (!Object.prototype.hasOwnProperty.call(fila, 'invetario')) {
        errores.push(`${etiqueta} tiene que declarar invetario (array, aunque este vacio)`);
      } else if (!Array.isArray(fila.invetario)) {
        errores.push(`${etiqueta}.invetario tiene que ser un array`);
      }

      if (!esNumeroFinito(fila.id)) {
        if (typeof fila.id === 'string') {
          errores.push(`${etiqueta} id es texto "${fila.id}"; se esperaba un numero`);
        } else {
          errores.push(`${etiqueta} id tiene que ser un numero unico entre los dos bandos`);
        }
      } else if (idsVistos.has(fila.id)) {
        errores.push(`${etiqueta} id ${fila.id} esta repetido (tambien en ${idsVistos.get(fila.id)})`);
      } else {
        idsVistos.set(fila.id, etiqueta);
      }

      if (!reclamarNumero(errores, fila.nivel, 'nivel', etiqueta)) {
        /* ya anotado */
      }

      const pos = fila.posicion;
      if (!pos || typeof pos !== 'object') {
        errores.push(`${etiqueta}.posicion tiene que ser un objeto {x, y}`);
      } else {
        const xOk = reclamarNumero(errores, pos.x, 'posicion.x', etiqueta);
        const yOk = reclamarNumero(errores, pos.y, 'posicion.y', etiqueta);
        if (xOk && yOk) {
          if (tablero && esEnteroPositivo(tablero.filas) && esEnteroPositivo(tablero.columnas)) {
            if (pos.x < 1 || pos.x > tablero.columnas || pos.y < 1 || pos.y > tablero.filas) {
              errores.push(`${etiqueta}.posicion (${pos.x}, ${pos.y}) esta fuera de ${tablero.columnas}x${tablero.filas}`);
            }
          }
          const clave = claveCasilla(pos.x, pos.y);
          if (casillasPotestad.has(clave)) {
            errores.push(`${etiqueta} comparte casilla (${pos.x}, ${pos.y}) con ${casillasPotestad.get(clave)}`);
          } else {
            casillasPotestad.set(clave, etiqueta);
          }
          if (Array.isArray(molde.casillasEspeciales) && esHueco(molde, pos.x, pos.y)) {
            errores.push(`${etiqueta} esta en un hueco (${pos.x}, ${pos.y}); ninguna potestad en casilla vacio`);
          }
        }
      }

      try {
        resolverClase(fila);
      } catch (error) {
        errores.push(`${etiqueta} arquetipo "${fila.arquetipo}" no resuelve: ${error.message}`);
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(molde, 'otros') || Object.prototype.hasOwnProperty.call(molde, 'reglas')) {
    errores.push('las reglas van en reglasExtra, no en otros ni en reglas');
  }

  const reglas = molde.reglasExtra;
  if (!reglas || typeof reglas !== 'object') {
    errores.push('falta reglasExtra');
  } else {
    if (!esNumeroFinito(reglas.tiempoDeReflexion)) {
      errores.push('reglasExtra.tiempoDeReflexion tiene que ser un numero (milisegundos)');
    }
    if (typeof reglas.condicionesVictoriaExtra !== 'string') {
      errores.push('reglasExtra.condicionesVictoriaExtra tiene que ser texto');
    }
    if (typeof reglas.clima !== 'string') {
      errores.push('reglasExtra.clima tiene que ser texto');
    }
    if (typeof reglas.retiradas !== 'boolean') {
      errores.push('reglasExtra.retiradas tiene que ser boolean');
    }
    if (typeof reglas.muertesPermanentes !== 'boolean') {
      errores.push('reglasExtra.muertesPermanentes tiene que ser boolean');
    }
    if (!GESTIONES_DE_GUION.has(reglas.gestiondelGuion)) {
      errores.push('reglasExtra.gestiondelGuion tiene que ser "porVelocidad" o "caos"');
    }
    const destino = reglas.destino;
    if (!destino || typeof destino !== 'object') {
      errores.push('falta reglasExtra.destino');
    } else {
      for (const resultado of RESULTADOS_DESTINO) {
        const rama = destino[resultado];
        if (!rama || typeof rama !== 'object') {
          errores.push(`falta reglasExtra.destino.${resultado}`);
          continue;
        }
        if (typeof rama.key !== 'string' || rama.key.trim() === '') {
          errores.push(`reglasExtra.destino.${resultado}.key tiene que ser texto`);
        }
        if (!esNumeroFinito(rama.x) || !esNumeroFinito(rama.y)) {
          errores.push(`reglasExtra.destino.${resultado} necesita x e y numericos`);
        }
      }
    }
  }

  return { valido: errores.length === 0, errores };
}

function reubicarPotestadesFuera(copia) {
  const { filas, columnas } = copia.configTablero;
  const ocupadas = new Set();
  const pendientes = [];

  for (const entrada of listarPotestades(copia)) {
    const { x, y } = entrada.fila.posicion ?? {};
    const dentro = esNumeroFinito(x) && esNumeroFinito(y) && x >= 1 && y >= 1 && x <= columnas && y <= filas;
    if (dentro) {
      ocupadas.add(claveCasilla(x, y));
    } else {
      pendientes.push(entrada);
    }
  }

  const libres = casillasDelTablero(copia).filter((c) => !ocupadas.has(claveCasilla(c.x, c.y)));
  const barajadas = barajar(libres);
  for (const entrada of pendientes) {
    const destino = barajadas.pop();
    if (!destino) {
      throw new Error('[TabuladorDeMoldes] No hay casillas libres para reubicar potestades al cambiar el tamano.');
    }
    entrada.fila.posicion = { x: destino.x, y: destino.y };
  }
}

function filtrarEspecialesDentro(copia) {
  const { filas, columnas } = copia.configTablero;
  copia.casillasEspeciales = (copia.casillasEspeciales ?? []).filter((c) => {
    const x = c?.posicion?.x;
    const y = c?.posicion?.y;
    return esNumeroFinito(x) && esNumeroFinito(y) && x >= 1 && y >= 1 && x <= columnas && y <= filas;
  });
}

function apartarHuecosDePotestades(copia) {
  const ocupadas = posicionesOcupadas(copia);
  const especiales = copia.casillasEspeciales ?? [];
  const conservadas = [];
  const huecosAMover = [];

  for (const casilla of especiales) {
    const clave = claveCasilla(casilla.posicion.x, casilla.posicion.y);
    if (casilla.arquetipo === 'vacio' && ocupadas.has(clave)) {
      huecosAMover.push(casilla);
    } else {
      conservadas.push(casilla);
    }
  }

  const usadas = new Set(conservadas.map((c) => claveCasilla(c.posicion.x, c.posicion.y)));
  const libres = casillasLibres(copia, [...usadas]);
  const barajadas = barajar(libres);

  for (const hueco of huecosAMover) {
    const destino = barajadas.pop();
    if (!destino) continue;
    hueco.posicion = { x: destino.x, y: destino.y };
    conservadas.push(hueco);
  }

  copia.casillasEspeciales = conservadas;
}

function repartirHuecos(copia, cantidad) {
  const otras = (copia.casillasEspeciales ?? []).filter((c) => c.arquetipo !== 'vacio');
  const usadas = new Set(otras.map((c) => claveCasilla(c.posicion.x, c.posicion.y)));
  const libres = barajar(casillasLibres(copia, [...usadas]));
  const n = Math.max(0, Math.min(cantidad, libres.length));
  const huecos = libres.slice(0, n).map((c) => ({
    arquetipo: 'vacio',
    posicion: { x: c.x, y: c.y },
  }));
  copia.casillasEspeciales = [...otras, ...huecos];
}

function aplicarNiveles(copia, opciones) {
  if (esNumeroFinito(opciones.deltaNivel)) {
    for (const { fila } of listarPotestades(copia)) {
      fila.nivel = Math.max(1, fila.nivel + opciones.deltaNivel);
    }
  }
  const rango = opciones.rangoNivel;
  if (rango && esNumeroFinito(rango.min) && esNumeroFinito(rango.max)) {
    const min = Math.max(1, Math.min(rango.min, rango.max));
    const max = Math.max(min, rango.max, rango.min);
    for (const { fila } of listarPotestades(copia)) {
      fila.nivel = enteroAleatorio(min, max);
    }
  }
}

function aplicarArquetipos(copia, opciones) {
  if (opciones.sustituirArquetipo && typeof opciones.sustituirArquetipo === 'object') {
    const { de, a } = opciones.sustituirArquetipo;
    for (const { fila } of listarPotestades(copia)) {
      if (fila.arquetipo === de) fila.arquetipo = a;
    }
  }
  if (Array.isArray(opciones.arquetipos) && opciones.arquetipos.length > 0) {
    for (const { fila } of listarPotestades(copia)) {
      fila.arquetipo = opciones.arquetipos[enteroAleatorio(0, opciones.arquetipos.length - 1)];
    }
  }
}

/**
 * Copia, altera y valida. La entrada no se toca.
 * @param {object} molde
 * @param {object} [opciones]
 * @returns {object}
 */
export function alterarMolde(molde, opciones = {}) {
  const copia = clonar(molde);

  if (esEnteroPositivo(opciones.filas)) copia.configTablero.filas = opciones.filas;
  if (esEnteroPositivo(opciones.columnas)) copia.configTablero.columnas = opciones.columnas;
  if (typeof opciones.casillaArquetipo === 'string' && opciones.casillaArquetipo.trim() !== '') {
    copia.configTablero.casillaArquetipo = opciones.casillaArquetipo;
  }

  if (Array.isArray(opciones.casillasEspeciales)) {
    copia.casillasEspeciales = clonar(opciones.casillasEspeciales);
  }

  reubicarPotestadesFuera(copia);
  filtrarEspecialesDentro(copia);

  if (opciones.huecos && esNumeroFinito(opciones.huecos.cantidad)) {
    repartirHuecos(copia, Math.max(0, Math.floor(opciones.huecos.cantidad)));
  }

  aplicarNiveles(copia, opciones);
  aplicarArquetipos(copia, opciones);
  apartarHuecosDePotestades(copia);

  const resultado = validarMolde(copia);
  if (!resultado.valido) {
    throw new Error(
      `[TabuladorDeMoldes] alterarMolde produjo un molde invalido:\n- ${resultado.errores.join('\n- ')}`,
    );
  }
  return copia;
}

function jitterPorDefecto(molde) {
  const opciones = {};
  const potestades = listarPotestades(molde);
  const niveles = potestades.map((p) => p.fila.nivel).filter(esNumeroFinito);
  if (niveles.length > 0) {
    const min = Math.min(...niveles);
    const max = Math.max(...niveles);
    opciones.rangoNivel = { min: Math.max(1, min - 1), max: max + 1 };
  }
  const nHuecos = contarHuecos(molde);
  if (nHuecos > 0) {
    opciones.huecos = { cantidad: nHuecos };
  } else if (potestades.length === 0) {
    opciones.huecos = { cantidad: 1 };
  }
  return opciones;
}

function firmaMolde(molde) {
  return JSON.stringify(molde);
}

/**
 * Tanda de niveles distintos. El molde de entrada no cambia.
 * @param {object} molde
 * @param {number} cantidad
 * @param {object} [opciones]
 * @returns {object[]}
 */
export function generarSerie(molde, cantidad, opciones = {}) {
  if (!esEnteroPositivo(cantidad)) {
    throw new Error('[TabuladorDeMoldes] generarSerie necesita una cantidad entera positiva.');
  }

  const original = firmaMolde(molde);
  const serie = [];
  const vistos = new Set();
  const maxIntentos = Math.max(cantidad * 80, 80);

  for (let intento = 0; intento < maxIntentos && serie.length < cantidad; intento++) {
    const combinadas = opcionesVacias(opciones)
      ? jitterPorDefecto(molde)
      : intento === 0
        ? { ...opciones }
        : { ...opciones, ...jitterPorDefecto(molde) };

    let candidato;
    try {
      candidato = alterarMolde(molde, combinadas);
    } catch {
      continue;
    }

    const firma = firmaMolde(candidato);
    if (firma === original || vistos.has(firma)) continue;
    vistos.add(firma);
    serie.push(candidato);
  }

  if (serie.length < cantidad) {
    throw new Error(
      `[TabuladorDeMoldes] generarSerie solo produjo ${serie.length} de ${cantidad} niveles distintos.`,
    );
  }

  if (firmaMolde(molde) !== original) {
    throw new Error('[TabuladorDeMoldes] generarSerie muto el molde de entrada.');
  }

  return serie;
}
