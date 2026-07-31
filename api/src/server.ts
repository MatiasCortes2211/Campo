import "dotenv/config";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, verificarPassword, firmarToken, verificarToken, TokenPayload } from "./auth";

declare module "fastify" {
  interface FastifyRequest {
    usuario?: TokenPayload;
  }
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const app = Fastify({ logger: true });

/**
 * Exige un JWT válido en el header Authorization: Bearer <token>.
 * Cuelga los datos del token en req.usuario para que las rutas los usen
 * — el grupoId SIEMPRE sale de acá, nunca de lo que mande el cliente en
 * el body o la query, así ningún usuario puede pedir/escribir datos de
 * un grupo que no es el suyo.
 */
async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Falta el token de autenticación." });
  }
  try {
    req.usuario = verificarToken(header.slice("Bearer ".length));
  } catch {
    return reply.code(401).send({ error: "Token inválido o vencido." });
  }
}

async function main() {
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  // ---------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------

  app.post("/api/auth/login", async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return reply.code(400).send({ error: "Faltan email y/o password." });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email: body.email } });
    if (!usuario) {
      return reply.code(401).send({ error: "Email o contraseña incorrectos." });
    }

    const passwordOk = await verificarPassword(body.password, usuario.passwordHash);
    if (!passwordOk) {
      return reply.code(401).send({ error: "Email o contraseña incorrectos." });
    }

    const token = firmarToken({
      usuarioId: usuario.id,
      grupoId: usuario.grupoId,
      rol: usuario.rol as "admin" | "colaborador",
    });

    return reply.send({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, grupoId: usuario.grupoId },
    });
  });

  app.post("/api/auth/cambiar-password", { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as { passwordActual?: string; passwordNueva?: string };
    if (!body.passwordActual || !body.passwordNueva) {
      return reply.code(400).send({ error: "Faltan passwordActual y/o passwordNueva." });
    }
    if (body.passwordNueva.length < 8) {
      return reply.code(400).send({ error: "La contraseña nueva debe tener al menos 8 caracteres." });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.usuarioId } });
    if (!usuario) return reply.code(404).send({ error: "Usuario no encontrado." });

    const actualOk = await verificarPassword(body.passwordActual, usuario.passwordHash);
    if (!actualOk) {
      return reply.code(401).send({ error: "La contraseña actual no coincide." });
    }

    const nuevoHash = await hashPassword(body.passwordNueva);
    await prisma.usuario.update({ where: { id: usuario.id }, data: { passwordHash: nuevoHash } });

    return reply.send({ ok: true });
  });

  // ---------------------------------------------------------------
  // USUARIOS (alta de colaboradores dentro del propio grupo — solo admin)
  // ---------------------------------------------------------------

  app.post("/api/usuarios", { preHandler: requireAuth }, async (req, reply) => {
    if (req.usuario!.rol !== "admin") {
      return reply.code(403).send({ error: "Solo un admin puede crear usuarios." });
    }
    const body = req.body as { nombre?: string; email?: string; password?: string };
    if (!body.nombre || !body.email || !body.password) {
      return reply.code(400).send({ error: "Faltan nombre, email y/o password." });
    }

    const passwordHash = await hashPassword(body.password);
    const nuevo = await prisma.usuario.create({
      data: {
        nombre: body.nombre,
        email: body.email,
        passwordHash,
        rol: "colaborador",
        grupoId: req.usuario!.grupoId,
      },
    });

    return reply.code(201).send({ id: nuevo.id, nombre: nuevo.nombre, email: nuevo.email });
  });

  // ---------------------------------------------------------------
  // SYNC (protegido — el grupoId sale siempre del token, nunca del cliente)
  // ---------------------------------------------------------------

  app.post("/api/sync/push", { preHandler: requireAuth }, async (req, reply) => {
    const grupoId = req.usuario!.grupoId;
    const body = req.body as {
      campos?: any[];
      ocupantes?: any[];
      stock?: any[];
      eventos?: any[];
      eventoDetalles?: any[];
    };

    // Los campos que llegan del cliente se filtran/forzán a este grupoId,
    // por si alguien manipulara el payload a mano — nunca confiamos en
    // el grupoId que venga en el body.
    const campos = (body.campos ?? []).map((c) => ({ ...c, grupoId }));

    const resultado = await prisma.$transaction(async (tx) => {
      const camposGuardados = [];
      for (const c of campos) {
        camposGuardados.push(
          await tx.campo.upsert({
            where: { id: c.id },
            create: {
              id: c.id,
              grupoId,
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

      // Para ocupantes/stock/eventos, verificamos que el campoId que
      // mandan pertenezca efectivamente a este grupo antes de guardar.
      const camposDelGrupo = await tx.campo.findMany({ where: { grupoId }, select: { id: true } });
      const idsValidos = new Set(camposDelGrupo.map((c) => c.id));

      const ocupantes = [];
      for (const o of body.ocupantes ?? []) {
        if (!idsValidos.has(o.campoId)) continue;
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
        if (!idsValidos.has(s.campoId)) continue;
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
        if (!idsValidos.has(e.campoId)) continue;
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

      return { campos: camposGuardados, ocupantes, stock, eventos, eventoDetalles };
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

  app.get("/api/sync/pull", { preHandler: requireAuth }, async (req, reply) => {
    const grupoId = req.usuario!.grupoId;
    const query = req.query as { since?: string };
    const since = query.since ? new Date(query.since) : new Date(0);

    const campos = await prisma.campo.findMany({ where: { grupoId, updatedAt: { gt: since } } });
    const todosLosCamposDelGrupo = await prisma.campo.findMany({
      where: { grupoId },
      select: { id: true },
    });
    const campoIds = todosLosCamposDelGrupo.map((c) => c.id);

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