/**
 * Uso:
 *   npx tsx scripts/crear-cliente.ts "Nombre del Grupo" "Nombre Usuario" email@ejemplo.com contraseñaTemporal
 *
 * Crea un GrupoDeTrabajo nuevo y un Usuario admin adentro, listo para
 * pasarle las credenciales al cliente. El cliente después puede cambiar
 * su contraseña desde /api/auth/cambiar-password.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/auth";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [nombreGrupo, nombreUsuario, email, password] = process.argv.slice(2);

  if (!nombreGrupo || !nombreUsuario || !email || !password) {
    console.error(
      'Uso: npx tsx scripts/crear-cliente.ts "Nombre del Grupo" "Nombre Usuario" email@ejemplo.com contraseñaTemporal'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("La contraseña temporal debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.error(`Ya existe un usuario con el email ${email}.`);
    process.exit(1);
  }

  const grupo = await prisma.grupoDeTrabajo.create({ data: { nombre: nombreGrupo } });

  const passwordHash = await hashPassword(password);
  const usuario = await prisma.usuario.create({
    data: {
      nombre: nombreUsuario,
      email,
      passwordHash,
      rol: "admin",
      grupoId: grupo.id,
    },
  });

  console.log("Cliente creado con éxito:");
  console.log({ grupoId: grupo.id, grupoNombre: grupo.nombre });
  console.log({ usuarioId: usuario.id, email: usuario.email, rol: usuario.rol });
  console.log("\nPasale al cliente: email + la contraseña temporal que usaste acá.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());