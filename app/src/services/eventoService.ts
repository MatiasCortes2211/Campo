import { db } from "../db/database";
import type {
  Categoria,
  Evento,
  EventoDetalle,
  TipoEvento,
} from "../types/domain";

function uid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface LineaEvento {
  categoriaOrigen: Categoria;
  cantidad: number;
  categoriaDestino?: Categoria; // solo para recategorización
}

/**
 * Calcula el delta de stock que produce una línea de evento.
 * Devuelve una lista de (categoria, delta) a aplicar.
 * - nacimiento/compra: +cantidad en categoriaOrigen
 * - muerte/venta: -cantidad en categoriaOrigen
 * - recategorizacion: -cantidad en origen, +cantidad en destino
 * - ajuste: +cantidad en categoriaOrigen (puede ser negativo si el usuario carga un ajuste hacia abajo)
 */
function calcularDeltas(
  tipo: TipoEvento,
  linea: LineaEvento
): { categoria: Categoria; delta: number }[] {
  switch (tipo) {
    case "nacimiento":
    case "compra":
      return [{ categoria: linea.categoriaOrigen, delta: linea.cantidad }];
    case "muerte":
    case "venta":
      return [{ categoria: linea.categoriaOrigen, delta: -linea.cantidad }];
    case "recategorizacion":
      if (!linea.categoriaDestino) {
        throw new Error("La recategorización necesita categoría destino");
      }
      return [
        { categoria: linea.categoriaOrigen, delta: -linea.cantidad },
        { categoria: linea.categoriaDestino, delta: linea.cantidad },
      ];
    case "ajuste":
      return [{ categoria: linea.categoriaOrigen, delta: linea.cantidad }];
    default:
      return [];
  }
}

async function aplicarDeltaAStock(campoId: string, categoria: Categoria, delta: number) {
  const stockId = `${campoId}:${categoria}`;
  const actual = await db.stock.get(stockId);
  if (actual) {
    await db.stock.update(stockId, {
      cantidadActual: actual.cantidadActual + delta,
    });
  } else {
    await db.stock.put({
      id: stockId,
      campoId,
      categoria,
      cantidadActual: Math.max(delta, 0),
      precioKg: null,
      precioFecha: null,
    });
  }
}

/**
 * Crea un nuevo evento (operación) con una o varias líneas, y aplica
 * los deltas correspondientes al Stock local. Todo esto es 100% offline:
 * no hace ninguna llamada de red.
 */
export async function crearEvento(params: {
  campoId: string;
  tipo: TipoEvento;
  fecha: string;
  comentario?: string;
  lineas: LineaEvento[];
}): Promise<Evento> {
  const evento: Evento = {
    id: uid(),
    campoId: params.campoId,
    tipo: params.tipo,
    fecha: params.fecha,
    comentario: params.comentario,
    estado: "activo",
    eventoCorrigeId: null,
    createdAt: nowIso(),
    sincronizado: false,
  };

  const detalles: EventoDetalle[] = params.lineas.map((linea) => ({
    id: uid(),
    eventoId: evento.id,
    categoriaOrigen: linea.categoriaOrigen,
    cantidad: linea.cantidad,
    categoriaDestino: linea.categoriaDestino ?? null,
  }));

  await db.transaction("rw", db.eventos, db.eventoDetalles, db.stock, async () => {
    await db.eventos.put(evento);
    await db.eventoDetalles.bulkPut(detalles);

    for (const linea of params.lineas) {
      const deltas = calcularDeltas(params.tipo, linea);
      for (const { categoria, delta } of deltas) {
        await aplicarDeltaAStock(params.campoId, categoria, delta);
      }
    }
  });

  return evento;
}

/**
 * Anula un evento existente (no lo borra) y revierte su efecto en el Stock.
 * El registro original queda con estado "anulado" para conservar el historial.
 */
export async function anularEvento(eventoId: string): Promise<void> {
  const evento = await db.eventos.get(eventoId);
  if (!evento || evento.estado === "anulado") return;

  const detalles = await db.eventoDetalles.where("eventoId").equals(eventoId).toArray();

  await db.transaction("rw", db.eventos, db.stock, async () => {
    await db.eventos.update(eventoId, { estado: "anulado", sincronizado: false });

    for (const linea of detalles) {
      const deltas = calcularDeltas(evento.tipo, {
        categoriaOrigen: linea.categoriaOrigen,
        cantidad: linea.cantidad,
        categoriaDestino: linea.categoriaDestino ?? undefined,
      });
      // revertir: aplicar el delta invertido
      for (const { categoria, delta } of deltas) {
        await aplicarDeltaAStock(evento.campoId, categoria, -delta);
      }
    }
  });
}

/**
 * Corrige un evento: lo anula y crea uno nuevo con los datos correctos,
 * dejando la referencia `eventoCorrigeId` para trazabilidad.
 */
export async function corregirEvento(params: {
  eventoOriginalId: string;
  tipo: TipoEvento;
  fecha: string;
  comentario?: string;
  lineas: LineaEvento[];
}): Promise<Evento> {
  await anularEvento(params.eventoOriginalId);

  const nuevo = await crearEvento({
    campoId: (await db.eventos.get(params.eventoOriginalId))!.campoId,
    tipo: params.tipo,
    fecha: params.fecha,
    comentario: params.comentario,
    lineas: params.lineas,
  });

  await db.eventos.update(nuevo.id, {
    eventoCorrigeId: params.eventoOriginalId,
  });

  return { ...nuevo, eventoCorrigeId: params.eventoOriginalId };
}

/** Devuelve el historial de eventos de un campo, más nuevo primero, con sus líneas. */
export async function historialDeCampo(campoId: string) {
  const eventos = await db.eventos
    .where("campoId")
    .equals(campoId)
    .reverse()
    .sortBy("createdAt");

  const result = [];
  for (const evento of eventos) {
    const detalles = await db.eventoDetalles.where("eventoId").equals(evento.id).toArray();
    result.push({ ...evento, detalles });
  }
  return result;
}
