-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "cargo" TEXT;

-- CreateTable
CREATE TABLE "usuario_permisos" (
    "id_usuario" INTEGER NOT NULL,
    "modulo" "PermisoModulo" NOT NULL,
    "nivel" "NivelPermiso" NOT NULL,

    CONSTRAINT "usuario_permisos_pkey" PRIMARY KEY ("id_usuario","modulo")
);

-- CreateIndex
CREATE INDEX "usuario_permisos_id_usuario_idx" ON "usuario_permisos"("id_usuario");

-- AddForeignKey
ALTER TABLE "usuario_permisos" ADD CONSTRAINT "usuario_permisos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;