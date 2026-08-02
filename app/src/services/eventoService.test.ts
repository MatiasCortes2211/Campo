import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db/database";
import { crearEvento, anularEvento } from "./eventoService";

describe("eventoService", () => {
  beforeEach(async () => {
    await db.campos.clear();
    await db.stock.clear();
    await db.eventos.clear();
    await db.eventoDetalles.clear();
    await db.campos.add({
      id: "campo-1",
      grupoId: "grupo-1",
      nombre: "Test",
      ubicacion: "",
      hectareas: 100,
      renspa: "",
      createdAt: "",
      updatedAt: "",
      sincronizado: false,
    });
  });

  it("un nacimiento suma cabezas a Ternero", async () => {
    await crearEvento({
      campoId: "campo-1",
      tipo: "nacimiento",
      fecha: "2026-01-01",
      lineas: [{ categoriaOrigen: "Ternero", cantidad: 5 }],
    });
    const stock = await db.stock.get("campo-1:Ternero");
    expect(stock?.cantidadActual).toBe(5);
  });

  it("anular un evento revierte el delta aplicado", async () => {
    const evento = await crearEvento({
      campoId: "campo-1",
      tipo: "muerte",
      fecha: "2026-01-01",
      lineas: [{ categoriaOrigen: "Vaca", cantidad: 3 }],
    });
    await db.stock.put({ id: "campo-1:Vaca", campoId: "campo-1", categoria: "Vaca", cantidadActual: 10, precioKg: null, precioFecha: null });
    await anularEvento(evento.id);
    const stock = await db.stock.get("campo-1:Vaca");
    expect(stock?.cantidadActual).toBe(10); // vuelve al valor antes de la muerte
  });
});