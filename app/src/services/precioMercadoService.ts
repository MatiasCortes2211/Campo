import { db } from "../db/database";
import type { Categoria } from "../types/domain";

// Categorías sin cotización estándar de mercado (ver diseño: Toro queda
// siempre en null, no se autocompleta).
const CATEGORIAS_SIN_MERCADO: Categoria[] = ["Toro"];

/**
 * Actualiza el precio de mercado de todas las categorías de un campo.
 * Esta función necesita internet (llama a una API/backend propio que a su
 * vez trae el índice del Mercado Agroganadero). Si no hay conexión, la
 * función simplemente no hace nada: la app sigue mostrando el último
 * precio guardado localmente, con su `precioFecha` para que se note que
 * no es de hoy.
 *
 * TODO: reemplazar por la llamada real al backend cuando esté armado
 * (GET /precios-mercado -> { categoria, precioKg }[]).
 */
export async function actualizarPreciosDeMercado(campoId: string): Promise<void> {
  if (!navigator.onLine) return;

  try {
    // Placeholder: acá va el fetch real al backend propio.
    // const res = await fetch("/api/precios-mercado");
    // const precios: { categoria: Categoria; precioKg: number }[] = await res.json();
    const precios: { categoria: Categoria; precioKg: number }[] = [];

    const hoy = new Date().toISOString();
    for (const { categoria, precioKg } of precios) {
      if (CATEGORIAS_SIN_MERCADO.includes(categoria)) continue;
      const stockId = `${campoId}:${categoria}`;
      const actual = await db.stock.get(stockId);
      if (actual) {
        await db.stock.update(stockId, { precioKg, precioFecha: hoy });
      }
    }
  } catch {
    // Sin conexión o backend no disponible: no rompemos la app, seguimos
    // mostrando el último precio local.
  }
}
