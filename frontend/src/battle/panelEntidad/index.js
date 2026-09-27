import { adaptarParaPanel } from '../datosDePotestades/IndexDePotestades.js';

export {
  abrirPanelEntidad,
  precargarDescripcionesPanelEntidad,
  precargarAssetsPanelEntidad,
} from './panelEntidad.js';

/** Arma el payload y emite abrirPanel. PhaserMaster solo pasa los datos. */
export function abrirPanel(eventos, registro, entidad, escenaAPausar) {
  const entrada = registro.obtenerPorId(entidad?.id);
  const datos = adaptarParaPanel(entidad, entrada?.bando, registro);
  if (!datos) return;
  eventos.emit('abrirPanel', {
    ...datos,
    escenaAPausar,
    onResolverEntidad: (id) => {
      const hallada = registro.obtenerPorId(id);
      return hallada ? adaptarParaPanel(hallada.potestad, hallada.bando, registro) : null;
    },
  });
}

export {
  DESCRIPCIONES,
  DEPTHS,
  COLORES,
  PANEL,
  HEADER,
  LADO_IZQUIERDO,
  LADO_DERECHO,
  LISTAS,
  claveTexturaImagen,
  obtenerDescripcion,
  ICONO_FALLBACK,
  CLAVE_ICONO_FALLBACK,
  TINTES_CATEGORIA,
} from './panelEntidadConfig.js';