import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  // ---------------------------------------------------------------
  // GRUPOS (por ahora solo alta simple, sin auth — se suma después)
  // ---------------------------------------------------------------
  app.post("/api/grupos", async (req, reply) => {
    const body = req.body as { nombre: string };
    const grupo = await prisma.grupoDeTrabajo.create({ data: { nombre: body.nombre } });
    return reply.code(201).send(grupo);
  });

  // ---------------------------------------------------------------
  // SYNC
  //
  // Modelo simple de dos operaciones:
  // - PUSH: el cliente manda todo lo que cargó offline. Cada registro
  //   se sube con upsert (create si no existe, update si ya existe),
  //   así el mismo endpoint sirve para altas y ediciones, y es seguro
  //   reintentar un push que falló a mitad de camino.
  // - PULL: el cliente pide "todo lo que cambió después de tal fecha"
  //   para un grupo, para traer a otros dispositivos lo que se cargó
  //   en el campo (o viceversa).
  // ---------------------------------------------------------------

  app.post("/api/sync/push", async (req, reply) => {
    const body = req.body as {
      campos?: any[];
      ocupantes?: any[];
      stock?: any[];
      eventos?: any[];
      eventoDetalles?: any[];
    };

    const resultado = await prisma.$transaction(async (tx) => {
      const campos = [];
      for (const c of body.campos ?? []) {
        campos.push(
          await tx.campo.upsert({
            where: { id: c.id },
            create: {
              id: c.id,
              grupoId: c.grupoId,
              nombre: c.nombre,
              ubicacion: c.ubicacion,
              hectareas: c.hectareas,
              renspa: c.renspa,
            },
            update: {
              nombre: c.nombre,
              ubicacion: c.ubicacion,
              hectareas: c.hectareas,
              renspa: c.renspa,
            },
          })
        );
      }

      const ocupantes = [];
      for (const o of body.ocupantes ?? []) {
        ocupantes.push(
          await tx.ocupante.upsert({
            where: { id: o.id },
            create: {
              id: o.id,
              campoId: o.campoId,
              tipo: o.tipo,
              nombre: o.nombre,
              contacto: o.contacto ?? null,
              cuit: o.cuit ?? null,
              fechaInicio: o.fechaInicio,
              fechaFin: o.fechaFin ?? null,
              comentario: o.comentario ?? null,
            },
            update: {
              tipo: o.tipo,
              nombre: o.nombre,
              contacto: o.contacto ?? null,
              cuit: o.cuit ?? null,
              fechaInicio: o.fechaInicio,
              fechaFin: o.fechaFin ?? null,
              comentario: o.comentario ?? null,
            },
          })
        );
      }

      const stock = [];
      for (const s of body.stock ?? []) {
        stock.push(
          await tx.stock.upsert({
            where: { id: s.id },
            create: {
              id: s.id,
              campoId: s.campoId,
              categoria: s.categoria,
              cantidadActual: s.cantidadActual,
              precioKg: s.precioKg ?? null,
              precioFecha: s.precioFecha ? new Date(s.precioFecha) : null,
            },
            update: {
              cantidadActual: s.cantidadActual,
              precioKg: s.precioKg ?? null,
              precioFecha: s.precioFecha ? new Date(s.precioFecha) : null,
            },
          })
        );
      }

      const eventos = [];
      for (const e of body.eventos ?? []) {
        eventos.push(
          await tx.evento.upsert({
            where: { id: e.id },
            create: {
              id: e.id,
              campoId: e.campoId,
              tipo: e.tipo,
              fecha: e.fecha,
              comentario: e.comentario ?? null,
              estado: e.estado,
              eventoCorrigeId: e.eventoCorrigeId ?? null,
            },
            update: {
              estado: e.estado,
              comentario: e.comentario ?? null,
            },
          })
        );
      }

      const eventoDetalles = [];
      for (const d of body.eventoDetalles ?? []) {
        eventoDetalles.push(
          await tx.eventoDetalle.upsert({
            where: { id: d.id },
            create: {
              id: d.id,
              eventoId: d.eventoId,
              categoriaOrigen: d.categoriaOrigen,
              cantidad: d.cantidad,
              categoriaDestino: d.categoriaDestino ?? null,
            },
            update: {},
          })
        );
      }

      return { campos, ocupantes, stock, eventos, eventoDetalles };
    });

    return reply.send({
      ok: true,
      subidos: {
        campos: resultado.campos.length,
        ocupantes: resultado.ocupantes.length,
        stock: resultado.stock.length,
        eventos: resultado.eventos.length,
        eventoDetalles: resultado.eventoDetalles.length,
      },
    });
  });

  app.get("/api/sync/pull", async (req, reply) => {
    const query = req.query as { grupoId?: string; since?: string };
    if (!query.grupoId) {
      return reply.code(400).send({ error: "Falta el parámetro grupoId" });
    }
    const since = query.since ? new Date(query.since) : new Date(0);

    const campos = await prisma.campo.findMany({
      where: { grupoId: query.grupoId, updatedAt: { gt: since } },
    });
    const campoIds = campos.length
      ? campos.map((c) => c.id)
      : (
          await prisma.campo.findMany({ where: { grupoId: query.grupoId }, select: { id: true } })
        ).map((c) => c.id);

    const [ocupantes, stock, eventos] = await Promise.all([
      prisma.ocupante.findMany({ where: { campoId: { in: campoIds }, updatedAt: { gt: since } } }),
      prisma.stock.findMany({ where: { campoId: { in: campoIds }, updatedAt: { gt: since } } }),
      prisma.evento.findMany({
        where: { campoId: { in: campoIds }, updatedAt: { gt: since } },
        include: { detalles: true },
      }),
    ]);

    return reply.send({
      serverTime: new Date().toISOString(),
      campos,
      ocupantes,
      stock,
      eventos,
      eventoDetalles: eventos.flatMap((e) => e.detalles),
    });
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});