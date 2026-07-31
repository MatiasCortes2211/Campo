export interface SugerenciaUbicacion {
  ciudad: string;
  provincia: string;
}

// API pública oficial (Georef, Ministerio de Economía) para normalizar
// nombres de localidades de Argentina. No hace falta API key.
const GEOREF_URL = "https://apis.datos.gob.ar/georef/api/localidades";

export async function buscarLocalidades(query: string): Promise<SugerenciaUbicacion[]> {
  if (query.trim().length < 3) return [];

  const url = `${GEOREF_URL}?nombre=${encodeURIComponent(query)}&campos=nombre,provincia&max=8`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Georef respondió ${res.status}`);

  const data = await res.json();
  const localidades: { nombre: string; provincia: { nombre: string } }[] = data.localidades ?? [];

  // Georef devuelve los nombres en MAYÚSCULAS — los normalizamos a
  // formato "Título" para que se vea bien en la UI.
  return localidades.map((l) => ({
    ciudad: aTitulo(l.nombre),
    provincia: aTitulo(l.provincia.nombre),
  }));
}

function aTitulo(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .map((p) => (p.length > 0 ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}