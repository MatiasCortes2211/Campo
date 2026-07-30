import { db } from "../db/database";
import type { Ocupante, TipoOcupante } from "../types/domain";
import { hoyISO } from "../utils/fecha";

function uid(): string {
  return crypto.randomUUID();
}

// Convención simple: fechaFin === null significa "sigue siendo el
// ocupante hoy, todavía no tiene fecha de salida cargada".
const SIN_FIN = "9999-12-31";

export { hoyISO };

// Por si quedó algún dato viejo guardado con fecha+hora completa en vez
// de solo la fecha, nos quedamos siempre con los primeros 10 caracteres
// (YYYY-MM-DD) antes de comparar.
function soloFecha(valor: string): string {
  return valor.slice(0, 10);
}

export async function haySolapamiento(params: { campoId: string; fechaInicio: string; fechaFin: string | null; excluirId?: string }): Promise<boolean> {
  const periodos = await db.ocupantes.where("campoId").equals(params.campoId).toArray();
  const inicioNuevo = soloFecha(params.fechaInicio);
  const finNuevo = params.fechaFin ? soloFecha(params.fechaFin) : SIN_FIN;

  return periodos.some((p) => {
    if (p.id === params.excluirId) return false;
    const inicioExistente = soloFecha(p.fechaInicio);
    const finExistente = p.fechaFin ? soloFecha(p.fechaFin) : SIN_FIN;
    return inicioNuevo <= finExistente && inicioExistente <= finNuevo;
  });
}

export async function crearOcupante(params: { campoId: string; tipo: TipoOcupante; nombre: string; contacto?: string; cuit?: string; fechaInicio: string; fechaFin: string | null; comentario?: string }): Promise<Ocupante> {
  const nuevo: Ocupante = {
    id: uid(),
    campoId: params.campoId,
    tipo: params.tipo,
    nombre: params.nombre,
    contacto: params.contacto,
    cuit: params.cuit,
    fechaInicio: params.fechaInicio,
    fechaFin: params.fechaFin,
    comentario: params.comentario,
    sincronizado: false,
  };
  await db.ocupantes.put(nuevo);
  return nuevo;
}

type CambiosOcupante = Partial<Pick<Ocupante, "tipo" | "nombre" | "contacto" | "cuit" | "comentario" | "fechaInicio" | "fechaFin">>;

export async function editarOcupante(ocupanteId: string, cambios: CambiosOcupante): Promise<void> {
  await db.ocupantes.update(ocupanteId, { ...cambios, sincronizado: false });
}

/** Borra un período cargado por error. No toca ningún otro período. */
export async function eliminarOcupante(ocupanteId: string): Promise<void> {
  await db.ocupantes.delete(ocupanteId);
}

/** Todos los períodos de un campo, más reciente primero. */
export async function listarPeriodosDeCampo(campoId: string): Promise<Ocupante[]> {
  const periodos = await db.ocupantes.where("campoId").equals(campoId).toArray();
  return periodos.sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1));
}

/**
 * El período que cubre la fecha de hoy (hora local), si hay alguno cargado.
 * Si por algún dato viejo llegaran a solaparse dos períodos en la misma
 * fecha, se prioriza el que sigue abierto ("sigue", sin fecha de fin) por
 * sobre uno que ya tiene fecha de cierre cargada.
 */
export async function obtenerOcupanteDeHoy(campoId: string): Promise<Ocupante | null> {
  const hoy = hoyISO();
  const periodos = await db.ocupantes.where("campoId").equals(campoId).toArray();

  const candidatos = periodos.filter((p) => {
    const inicio = soloFecha(p.fechaInicio);
    const fin = p.fechaFin ? soloFecha(p.fechaFin) : null;
    return inicio <= hoy && (fin === null || fin >= hoy);
  });

  if (candidatos.length === 0) return null;

  const abierto = candidatos.find((p) => p.fechaFin === null);
  if (abierto) return abierto;

  // Si ninguno está abierto, nos quedamos con el que empezó más reciente.
  return candidatos.sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1))[0];
}