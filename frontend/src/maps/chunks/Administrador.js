
export default class AdministradorMapas {
  constructor(baseDatos) {
    this.baseDatos = baseDatos;
    this.seed = baseDatos.obtenerSemilla();
    this.configuracion = baseDatos.obtenerConfiguracion();

    this.mundo = null;
    this.iniciado = false;
  }

  // Generador pseudoaleatorio reproducible.
  // La misma semilla produce la misma secuencia.
  crearAleatorio(seed) {
    let estado = seed >>> 0;

    return () => {
      estado = (estado + 0x6D2B79F5) >>> 0;

      let t = estado;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  mezclar(array, random) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  iniciarGeneracion() {
    // Permite volver a reconstruir el mismo mundo.
    const random = this.crearAleatorio(this.seed);

    console.group(
      `[Illay] Generando mundo | Semilla: ${this.seed}`
    );

    try {
      console.log("Fase 1/3: calculando dimensiones.");

      const n = this.configuracion.chunksPorLado;
      const centro = Math.floor(n / 2);

      this.mundo = {
        seed: this.seed,
        versionGenerador: this.baseDatos.obtenerVersionGenerador(),
        ancho: n,
        alto: n,
        centro: { x: centro, y: centro },
        hoyoCentral: {
          x: centro - 2,
          y: centro - 2,
          ancho: 5,
          alto: 5,
          tipo: "aldea-principal"
        },
        regiones: {},
        aldeas: {}
      };

      console.log("Dimensiones:", `${n} × ${n} chunks`);
      console.log("Centro reservado:", this.mundo.hoyoCentral);

      console.log("Fase 2/3: asignando los biomas.");

      const biomas = this.mezclar([
        "bosque",
        "pradera",
        "montana",
        "pantano"
      ], random);

      const mitad = Math.floor(n / 2);
      const margen = this.configuracion.distanciaBordeBiomas;

      const esquinas = [
        {
          nombre: "noroeste",
          xMin: margen,
          xMax: mitad - 4,
          yMin: margen,
          yMax: mitad - 4
        },
        {
          nombre: "noreste",
          xMin: mitad + 3,
          xMax: n - margen - 1,
          yMin: margen,
          yMax: mitad - 4
        },
        {
          nombre: "suroeste",
          xMin: margen,
          xMax: mitad - 4,
          yMin: mitad + 3,
          yMax: n - margen - 1
        },
        {
          nombre: "sureste",
          xMin: mitad + 3,
          xMax: n - margen - 1,
          yMin: mitad + 3,
          yMax: n - margen - 1
        }
      ];

      esquinas.forEach((zona, i) => {
        const bioma = biomas[i];

        this.mundo.regiones[bioma] = {
          bioma,
          esquina: zona.nombre,
          limites: { ...zona },
          estado: "reservada"
        };
      });

      console.table(
        Object.values(this.mundo.regiones).map(region => ({
          bioma: region.bioma,
          esquina: region.esquina
        }))
      );

      console.log("Fase 3/3: calculando las aldeas.");

      this.mundo.aldeas.principal = {
        tipo: "principal",
        x: centro,
        y: centro,
        mapa: null,
        estado: "reservada"
      };

      for (const bioma of biomas) {
        const region = this.mundo.regiones[bioma];
        const zona = region.limites;

        const x = zona.xMin + Math.floor(
          random() * (zona.xMax - zona.xMin + 1)
        );

        const y = zona.yMin + Math.floor(
          random() * (zona.yMax - zona.yMin + 1)
        );

        this.mundo.aldeas[bioma] = {
          tipo: bioma,
          x,
          y,
          mapa: null,
          estado: "reservada"
        };
      }

      // La aldea secundaria se mantiene pendiente
      // hasta definir con precisión los bosques laterales.
      this.mundo.aldeas.secundaria = {
        tipo: "secundaria",
        x: null,
        y: null,
        mapa: null,
        estado: "pendiente-de-region"
      };

      console.table(
        Object.entries(this.mundo.aldeas).map(([nombre, aldea]) => ({
          aldea: nombre,
          x: aldea.x,
          y: aldea.y,
          estado: aldea.estado
        }))
      );

      this.iniciado = true;
      console.log("Generación determinista completada.");

      return this.mundo;
    } finally {
      console.groupEnd();
    }
  }

  obtenerMundo() {
    if (!this.mundo) {
      throw new Error(
        "Primero debes ejecutar iniciarGeneracion()."
      );
    }

    return this.mundo;
  }
}
