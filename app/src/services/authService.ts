const API_URL = import.meta.env.VITE_API_URL as string;
const TOKEN_KEY = "campo-app:token";
const USUARIO_KEY = "campo-app:usuario";

export interface UsuarioActual {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "colaborador";
  grupoId: string;
}

export async function login(email: string, password: string): Promise<UsuarioActual> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar sesión.");

  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(data.usuario));
  return data.usuario;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsuarioActual(): UsuarioActual | null {
  const raw = localStorage.getItem(USUARIO_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/cambiar-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ passwordActual, passwordNueva }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "No se pudo cambiar la contraseña.");
}

export async function actualizarNombre(nombre: string): Promise<UsuarioActual> {
  const res = await fetch(`${API_URL}/api/auth/actualizar-perfil`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ nombre }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar el nombre.");

  localStorage.setItem(USUARIO_KEY, JSON.stringify(data));
  return data;
}