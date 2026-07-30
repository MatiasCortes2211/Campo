import { db } from "../db/database";
import { CATEGORIAS, type Campo } from "../types/domain";

function uid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function crearCampo(params: {
  grupoId: string;
  nombre: string;
  ubicacion: string;
  hectareas: number;
  renspa: string;
}): Promise<Campo> {
  const campo: Campo = {
    id: uid(),
    grupoId: params.grupoId,
    nombre: params.nombre,
    ubicacion: params.ubicacion,
    hectareas: params.hectareas,
    renspa: params.renspa,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    sincronizado: false,
  };

  await db.transaction("rw", db.campos, db.stock, async () => {
    await db.campos.put(campo);
    // Se inicializa el stock en cero para todas las categorías,
    // así la pantalla de detalle siempre tiene una fila por categoría.
    for (const categoria of CATEGORIAS) {
      await db.stock.put({
        id: `${campo.id}:${categoria}`,
        campoId: campo.id,
        categoria,
        cantidadActual: 0,
        precioKg: null,
        precioFecha: null,
      });
    }
  });

  return campo;
}

export async function listarCamposDeGrupo(grupoId: string): Promise<Campo[]> {
  return db.campos.where("grupoId").equals(grupoId).toArray();
}

export async function obtenerStockDeCampo(campoId: string) {
  return db.stock.where("campoId").equals(campoId).toArray();
}
