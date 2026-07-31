import { db } from "../db/database";

const API_URL = import.meta.env.VITE_API_URL as string;
const LAST_SYNC_KEY = "campo-app:lastSync";

function getLastSync(): string {
  return localStorage.getItem(LAST_SYNC_KEY) ?? new Date(0).toISOString();
}

function setLastSync(iso: string) {
  localStorage.setItem(LAST_SYNC_KEY, iso);
}

export interface ResultadoSync {
  ok: boolean;
  mensaje: string;
}

/**
 * Sube todo lo que se cargó offline (campos, ocupantes, eventos + sus
 * detalles, y el stock completo) y después baja lo que haya cambiado
 * en el servidor desde la última sincronización. Pensado para correr
 * cuando el dispositivo recupera señal — no asume que hay conexión.
 */
export async function sincronizar(grupoId: string): Promise<ResultadoSync> {
  if (!navigator.onLine) {
    return { ok: false, mensaje: "Sin conexión — no se puede sincronizar ahora." };
  }

  try {
    await push(grupoId);
    await pull(grupoId);
    return { ok: true, mensaje: "Sincronizado correctamente." };
  } catch (err) {
    console.error("Error de sync:", err);
    return { ok: false, mensaje: "Falló la sincronización. Se reintenta la próxima vez." };
  }
}

async function push(grupoId: string) {
  // Los Campos son una tabla chica (pocas filas por grupo) — se mandan
  // siempre completos, igual que el Stock. Esto garantiza que cualquier
  // Ocupante/Stock/Evento que dependa de un campoId nunca choque contra
  // una foreign key, sin importar si ese Campo ya se había marcado como
  // sincronizado en una corrida anterior.
  const campos = await db.campos.where("grupoId").equals(grupoId).toArray();
  const campoIds = (await db.campos.where("grupoId").equals(grupoId).toArray()).map((c) => c.id);

  const ocupantes = await db.ocupantes
    .where("campoId")
    .anyOf(campoIds)
    .filter((o) => o.sincronizado === false)
    .toArray();

  const eventos = await db.eventos
    .where("campoId")
    .anyOf(campoIds)
    .filter((e) => e.sincronizado === false)
    .toArray();

  const eventoIds = eventos.map((e) => e.id);
  const eventoDetalles = eventoIds.length
    ? await db.eventoDetalles.where("eventoId").anyOf(eventoIds).toArray()
    : [];

  // El stock se manda completo (es una tabla chica: pocas filas por
  // campo), no hace falta trackear "sincronizado" ahí.
  const stock = campoIds.length ? await db.stock.where("campoId").anyOf(campoIds).toArray() : [];

  if (
    campos.length === 0 &&
    ocupantes.length === 0 &&
    eventos.length === 0 &&
    stock.length === 0
  ) {
    return; // nada pendiente para subir
  }

  const res = await fetch(`${API_URL}/api/sync/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campos, ocupantes, stock, eventos, eventoDetalles }),
  });

  if (!res.ok) throw new Error(`push falló: ${res.status}`);

  // Marcar como sincronizado localmente lo que se subió con éxito.
  await db.transaction("rw", db.campos, db.ocupantes, db.eventos, async () => {
    for (const c of campos) await db.campos.update(c.id, { sincronizado: true });
    for (const o of ocupantes) await db.ocupantes.update(o.id, { sincronizado: true });
    for (const e of eventos) await db.eventos.update(e.id, { sincronizado: true });
  });
}

async function pull(grupoId: string) {
  const since = getLastSync();
  const res = await fetch(
    `${API_URL}/api/sync/pull?grupoId=${grupoId}&since=${encodeURIComponent(since)}`
  );
  if (!res.ok) throw new Error(`pull falló: ${res.status}`);

  const data = await res.json();

  await db.transaction(
    "rw",
    db.campos,
    db.ocupantes,
    db.stock,
    db.eventos,
    db.eventoDetalles,
    async () => {
      for (const c of data.campos ?? []) await db.campos.put({ ...c, sincronizado: true });
      for (const o of data.ocupantes ?? []) await db.ocupantes.put({ ...o, sincronizado: true });
      for (const s of data.stock ?? []) await db.stock.put(s);
      for (const e of data.eventos ?? []) await db.eventos.put({ ...e, sincronizado: true });
      for (const d of data.eventoDetalles ?? []) await db.eventoDetalles.put(d);
    }
  );

  setLastSync(data.serverTime);
}