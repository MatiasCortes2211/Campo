/**
 * Fecha de HOY en formato YYYY-MM-DD, con hora LOCAL (no UTC).
 */
export function hoyISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formatea "YYYY-MM-DD" a "DD/MM/AAAA" sin pasar por Date/timezone.
 * new Date("2026-07-30").toLocaleDateString() en UTC-3 muestra 29/7,
 * porque parsea el string como medianoche UTC y al bajar a hora local
 * retrocede al día anterior. Acá evitamos por completo ese parseo.
 */
export function formatearFecha(fecha: string): string {
  const [yyyy, mm, dd] = fecha.slice(0, 10).split("-");
  return `${dd}/${mm}/${yyyy}`;
}