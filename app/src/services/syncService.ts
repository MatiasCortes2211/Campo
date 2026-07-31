import { db } from "../db/database";
import { getToken, logout } from "./authService";

const API_URL = import.meta.env.VITE_API_URL as string;
const LAST_SYNC_KEY = "campo-app:lastSync";

function getLastSync(): string {
  return localStorage.getItem(LAST_SYNC_KEY) ?? new Date(0).toISOString();
}

function setLastSync(iso: string) {
  localStorage.setItem(LAST_SYNC_KEY, iso);
}

function authHeaders(): HeadersInit {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

export interface ResultadoSync {
  ok: boolean;
  mensaje: string;
}

export async function sincronizar(grupoId: string): Promise<ResultadoSync> {
  if (!navigator.onLine) {
    return { ok: false, mensaje: "Sin conexión — no se puede sincronizar ahora." };
  }
  if (!getToken()) {
    return { ok: false, mensaje: "Sesión no iniciada." };
  }

  try {
    await push(grupoId);
    await pull();
    return { ok: true, mensaje: "Sincronizado correctamente." };
  } catch (err) {
    if (err instanceof Error && err.message === "SESION_VENCIDA") {
      logout();
      return { ok: false, mensaje: "Tu sesión venció. Iniciá sesión de nuevo." };
    }
    console.error("Error de sync:", err);
    return { ok: false, mensaje: "Falló la sincronización. Se reintenta la próxima vez." };
  }
}

function chequearRespuesta(res: Response) {
  if (res.status === 401) throw new Error("SESION_VENCIDA");
  if (!res.ok) throw new Error(`request falló: ${res.status}`);
}

async function push(grupoId: string) {
  const campos = await db.campos.where("grupoId").equals(grupoId).toArray();
  const campoIds = campos.map((c) => c.id);

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

  const stock = campoIds.length ? await db.stock.where("campoId").anyOf(campoIds).toArray() : [];

  if (campos.length === 0 && ocupantes.length === 0 && eventos.length === 0 && stock.length === 0) {
    return;
  }

  const res = await fetch(`${API_URL}/api/sync/push`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ campos, ocupantes, stock, eventos, eventoDetalles }),
  });
  chequearRespuesta(res);

  await db.transaction("rw", db.campos, db.ocupantes, db.eventos, async () => {
    for (const c of campos) await db.campos.update(c.id, { sincronizado: true });
    for (const o of ocupantes) await db.ocupantes.update(o.id, { sincronizado: true });
    for (const e of eventos) await db.eventos.update(e.id, { sincronizado: true });
  });
}

async function pull() {
  const since = getLastSync();
  const res = await fetch(`${API_URL}/api/sync/pull?since=${encodeURIComponent(since)}`, {
    headers: authHeaders(),
  });
  chequearRespuesta(res);

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