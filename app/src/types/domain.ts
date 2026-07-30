// Modelo de dominio de la app de gestión de campo.
// Refleja el diseño acordado: Grupo de Trabajo -> Campo -> Ocupante / Stock / Evento.

export type Categoria =
  | "Ternero"
  | "Ternera"
  | "Novillo"
  | "Vaquillona"
  | "Vaca"
  | "Toro";

export const CATEGORIAS: Categoria[] = [
  "Ternero",
  "Ternera",
  "Novillo",
  "Vaquillona",
  "Vaca",
  "Toro",
];

export type TipoOcupante = "propio" | "alquilado";

export type TipoEvento =
  | "nacimiento"
  | "muerte"
  | "compra"
  | "venta"
  | "recategorizacion"
  | "ajuste";

export const TIPOS_EVENTO: { value: TipoEvento; label: string }[] = [
  { value: "nacimiento", label: "Nacimiento" },
  { value: "muerte", label: "Muerte" },
  { value: "compra", label: "Compra" },
  { value: "venta", label: "Venta" },
  { value: "recategorizacion", label: "Recategorización" },
  { value: "ajuste", label: "Ajuste" },
];

export interface GrupoDeTrabajo {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  grupoId: string;
  createdAt: string;
}

export interface Campo {
  id: string;
  grupoId: string;
  nombre: string;
  ubicacion: string;
  hectareas: number;
  renspa: string;
  createdAt: string;
  updatedAt: string;
  // marca de sincronización, para el modelo offline-first
  sincronizado: boolean;
}

export interface Ocupante {
  id: string;
  campoId: string;
  tipo: TipoOcupante;
  nombre: string;
  contacto?: string;
  cuit?: string;
  fechaInicio: string;
  fechaFin: string | null; // null = ocupante actual
  comentario?: string;
  sincronizado: boolean;
}

export interface Stock {
  // clave compuesta lógica: campoId + categoria
  id: string; // `${campoId}:${categoria}`
  campoId: string;
  categoria: Categoria;
  cantidadActual: number;
  precioKg: number | null; // null si la categoría no tiene precio de mercado (ej: Toro)
  precioFecha: string | null;
}

export interface EventoDetalle {
  id: string;
  eventoId: string;
  categoriaOrigen: Categoria;
  cantidad: number;
  categoriaDestino: Categoria | null; // solo aplica si el evento es recategorización
}

export interface Evento {
  id: string;
  campoId: string;
  tipo: TipoEvento;
  fecha: string;
  comentario?: string;
  estado: "activo" | "anulado";
  eventoCorrigeId: string | null;
  createdAt: string;
  sincronizado: boolean;
}

// Tipo compuesto útil para mostrar un evento con sus líneas ya cargadas
export interface EventoConDetalle extends Evento {
  detalles: EventoDetalle[];
}

export interface PesoReferencia {
  categoria: Categoria;
  pesoPromedioKg: number;
}

export const PESOS_REFERENCIA: PesoReferencia[] = [
  { categoria: "Ternero", pesoPromedioKg: 180 },
  { categoria: "Ternera", pesoPromedioKg: 170 },
  { categoria: "Novillo", pesoPromedioKg: 450 },
  { categoria: "Vaquillona", pesoPromedioKg: 350 },
  { categoria: "Vaca", pesoPromedioKg: 480 },
  { categoria: "Toro", pesoPromedioKg: 700 },
];
