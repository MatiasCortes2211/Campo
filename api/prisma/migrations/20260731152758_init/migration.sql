-- CreateEnum
CREATE TYPE "TipoOcupante" AS ENUM ('propio', 'alquilado');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('Ternero', 'Ternera', 'Novillo', 'Vaquillona', 'Vaca', 'Toro');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('nacimiento', 'muerte', 'compra', 'venta', 'recategorizacion', 'ajuste');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('activo', 'anulado');

-- CreateTable
CREATE TABLE "GrupoDeTrabajo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrupoDeTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "hectareas" DOUBLE PRECISION NOT NULL,
    "renspa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ocupante" (
    "id" TEXT NOT NULL,
    "campoId" TEXT NOT NULL,
    "tipo" "TipoOcupante" NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "cuit" TEXT,
    "fechaInicio" TEXT NOT NULL,
    "fechaFin" TEXT,
    "comentario" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ocupante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "campoId" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "cantidadActual" INTEGER NOT NULL,
    "precioKg" DOUBLE PRECISION,
    "precioFecha" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "campoId" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "fecha" TEXT NOT NULL,
    "comentario" TEXT,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'activo',
    "eventoCorrigeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoDetalle" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "categoriaOrigen" "Categoria" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "categoriaDestino" "Categoria",

    CONSTRAINT "EventoDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Campo_grupoId_idx" ON "Campo"("grupoId");

-- CreateIndex
CREATE INDEX "Ocupante_campoId_idx" ON "Ocupante"("campoId");

-- CreateIndex
CREATE INDEX "Stock_campoId_idx" ON "Stock"("campoId");

-- CreateIndex
CREATE INDEX "Evento_campoId_idx" ON "Evento"("campoId");

-- CreateIndex
CREATE INDEX "EventoDetalle_eventoId_idx" ON "EventoDetalle"("eventoId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoDeTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campo" ADD CONSTRAINT "Campo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoDeTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocupante" ADD CONSTRAINT "Ocupante_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "Campo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "Campo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "Campo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoDetalle" ADD CONSTRAINT "EventoDetalle_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
