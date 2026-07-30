import { db } from "./database";

// Por ahora la app es "single profile": no hay login ni multi-grupo real
// todavía, pero ya modelamos todo alrededor de un Grupo de Trabajo para
// no tener que migrar el esquema el día que se sume auth y más de un grupo.
export const GRUPO_POR_DEFECTO_ID = "grupo-default";

export async function asegurarGrupoPorDefecto() {
  const existente = await db.grupos.get(GRUPO_POR_DEFECTO_ID);
  if (existente) return existente;

  const nuevo = {
    id: GRUPO_POR_DEFECTO_ID,
    nombre: "Mi familia",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.grupos.put(nuevo);
  return nuevo;
}
