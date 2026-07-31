import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "Falta JWT_SECRET en el .env — generá uno con `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"` y pegalo ahí."
  );
}

const SALT_ROUNDS = 10;

export async function hashPassword(passwordPlano: string): Promise<string> {
  return bcrypt.hash(passwordPlano, SALT_ROUNDS);
}

export async function verificarPassword(passwordPlano: string, hash: string): Promise<boolean> {
  return bcrypt.compare(passwordPlano, hash);
}

export interface TokenPayload {
  usuarioId: string;
  grupoId: string;
  rol: "admin" | "colaborador";
}

export function firmarToken(payload: TokenPayload): string {
  // 30 días: pensado para un dispositivo de uso diario en el campo, no
  // para una sesión de banca — no tiene sentido hacer re-login seguido
  // cuando el celular puede pasar días sin señal para renovar nada.
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "30d" });
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
}