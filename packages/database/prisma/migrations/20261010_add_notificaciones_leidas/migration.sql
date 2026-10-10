-- CreateTable
CREATE TABLE "notificaciones_leidas" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "id_referencia" INTEGER NOT NULL,
    "leida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_leidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificaciones_leidas_tipo_leida_en_idx" ON "notificaciones_leidas"("tipo", "leida_en");

-- CreateIndex
CREATE UNIQUE INDEX "notificaciones_leidas_tipo_id_referencia_key" ON "notificaciones_leidas"("tipo", "id_referencia");
