import { describe, it, expect } from "vitest";
import { hashPassword, verificarPassword } from "./auth";

describe("hash de contraseñas", () => {
  it("verifica correctamente una contraseña válida", async () => {
    const hash = await hashPassword("miClaveSegura123");
    expect(await verificarPassword("miClaveSegura123", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("miClaveSegura123");
    expect(await verificarPassword("otraClave", hash)).toBe(false);
  });
});