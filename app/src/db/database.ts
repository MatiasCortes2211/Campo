import Dexie, { type Table } from "dexie";
import type {
  Campo,
  Evento,
  EventoDetalle,
  GrupoDeTrabajo,
  Ocupante,
  Stock,
  Usuario,
} from "../types/domain";

// Base local en IndexedDB. Todo lo que entra acá funciona sin conexión.
// El "sync" (más adelante) es lo único que necesita internet, y solo
// para llevar/traer datos contra el backend — la app nunca depende de
// la red para operar.
export class CampoDatabase extends Dexie {
  grupos!: Table<GrupoDeTrabajo, string>;
  usuarios!: Table<Usuario, string>;
  campos!: Table<Campo, string>;
  ocupantes!: Table<Ocupante, string>;
  stock!: Table<Stock, string>;
  eventos!: Table<Evento, string>;
  eventoDetalles!: Table<EventoDetalle, string>;

  constructor() {
    super("campo-app-db");

    this.version(1).stores({
      grupos: "id",
      usuarios: "id, grupoId",
      campos: "id, grupoId, sincronizado",
      ocupantes: "id, campoId, fechaFin",
      stock: "id, campoId, categoria",
      eventos: "id, campoId, fecha, estado, sincronizado",
      eventoDetalles: "id, eventoId, categoriaOrigen",
    });
  }
}

export const db = new CampoDatabase();
