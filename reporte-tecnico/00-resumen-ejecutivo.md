# Resumen Ejecutivo — Reporte Técnico de Actualización de Software

**Proyecto:** Sistema de Información Web para Incrementar la Eficiencia de la Gestión de Cotizaciones en Importaciones y Exportaciones Gold Continent EIRL

**Repositorio:** `C:\Users\REYNA\Desktop\sistema-cotizaciones` (monorepo `pnpm` + Turborepo)

**Fecha de análisis:** 24 de octubre de 2026

**Estado del repositorio:** último commit `9e5f189` "fix" (2026-10-19); 268 archivos modificados sin commitear (−19.094 / +3.214 líneas), 166 archivos eliminados del árbol de trabajo.

**Método de inspección:** lectura completa del código fuente (frontend, backend, microservicio de IA, migraciones SQL, configuración) y consulta directa a la base de datos PostgreSQL en ejecución.

---

## 1. Cambios clave detectados entre el código actual y versiones previas

| Área | Cambio clave |
|---|---|
| **IA / recomendaciones** | El microservicio pasó de `TfidfVectorizer(stop_words='english')` con **5** ítems por categoría (commit `ab39fcb`) a `TfidfVectorizer(ngram_range=(1,2))` **sin stop-words** y **3** ítems por categoría, además de agregar `foto_url` en la respuesta (commit `9e5f189` + árbol de trabajo). |
| **Auditoría de IA** | Nueva tabla `ia_interacciones` con `tipo_sugerencia='SIMILITUD_COSENO_TFIDF'` y nuevo endpoint `POST /api/cotizaciones/registrar-accion-ia` (`ACEPTADO`/`RECHAZADO`): antes no existía trazabilidad de las sugerencias. |
| **Generación de PDF** | Flujo ahora asíncrono y con *fail-fast*: cola BullMQ `cotizacion-pdfs`, worker dedicado (`PDF_ROLE`, entrypoint `pdf-worker`, puerto 3002), hash de PDF (`pdf_hash`, `pdf_key`, `pdf_generado_en`) y respuesta **503 en 3 s si Redis está caído**. |
| **Esquema de base de datos** | 10 migraciones de Prisma: integridad de inventario, jerarquía de precios (`unidad ≥ docena ≥ mayor`), auditoría de precios, índices de consulta, `precio_ajustes_lotes`, notificaciones. |
| **Identidad visual** | Marca completamente migrada a **Gold Continent**; cero rastros de "Artes y Flores" (verificado también en todo el historial de git). |
| **Venta por cajas / mayorista** | Solo existe el campo `productos.unidades_por_caja`; no hay modelo de venta por cajas con unidades variables. |
| **Frontend** | Next.js 16 + React 19 + Turbopack; llamadas HTTP con `fetch` nativo (sin Axios); React Query 5 para estado de servidor. |
| **Limpieza del repositorio** | Eliminados 166 archivos: suites de tests (`.test.ts` / `.spec.ts`), documentación (`README.md`, `ARQUITECTURA.md`, `ENDPOINTS.md`, `MODULOS.md`, `TECNOLOGIA.md`), capturas de QA y scripts de diagnóstico. |

---

## 2. Estado cuantitativo del sistema (medido en vivo)

| Métrica | Valor |
|---|---|
| Productos en `productos` | 1.695 totales / **1.664 activos** (universo indexado por la IA) |
| Interacciones IA registradas (`ia_interacciones`) | 40 (0 con `accion_usuario` ACEPTADO/RECHAZADO) |
| Cotizaciones | 40 (22 `aprobada`, 18 `enviada`) |
| Registros de historial de precios | 11.179 |
| Clientes | 32 (18 `normal` / 14 `distribuidor`) |
| Tablas en el esquema | 21 tablas de negocio + `_prisma_migrations` |

---

## 3. Resumen por apartado

### Apartado 1 — Arquitectura tecnológica y dependencias
Backend **NestJS 11 sobre Express 5** con Prisma 5 + PostgreSQL, BullMQ/Redis, MinIO, JWT y Swagger. PDF generados con **Puppeteer 25** (`page.pdf`, formato A4) en `apps/api/src/modules/cotizaciones/pdf/`. Microservicio de IA en **FastAPI** (un archivo, `apps/ai-service/app/main.py`) con scikit-learn, numpy, scipy, psycopg2 y pydantic; rutas `/health`, `/admin/refresh-cache` y `/suggest`. Frontend **Next.js 16 + React 19** con React Query 5, Zustand, react-hook-form + Zod, Recharts y Tailwind 4, consumiendo la API mediante **`fetch` nativo** (`apps/web/src/lib/apiClient.ts`).

### Apartado 2 — Lógica y algoritmos de recomendación (IA)
Motor de **TF-IDF (bigramas) + similitud del coseno** sobre `descripcion + nombre_categoria`, con snapshot en memoria y reentrenamiento en arranque y tras crear/editar productos. Entrada: producto base + cliente + almacén + esquema de precio (1 de 6). Salida: **3 categorías de 3 ítems** (`similar`, `upsell`, `equilibrio`), etiquetadas en la UI como **SIMILAR / MEJOR OPCIÓN / EQUILIBRIO** (ya no "Mayor similitud / Más económico / Equilibrio"). El motor no tiene un número fijo de productos: indexa todos los activos (**1.664** hoy) y lo expone en `GET /health` (`total_productos`).

### Apartado 3 — Base de datos y cambios en el esquema
El motor es **PostgreSQL** (no MySQL), gestionado con Prisma. 21 tablas; estado de cotizaciones con 7 valores (`borrador`, `enviada`, `parcialmente_pagada`, `aprobada`, `rechazada`, `expirada`, `convertida_a_venta`). Existencia confirmada de `ia_interacciones` (auditoría IA), `historial_precios` y `precio_ajustes_lotes`. Para cajas solo está `productos.unidades_por_caja`; no hay `precio_caja` ni tabla de cajas.

### Apartado 4 — Reglas de negocio y funcionalidades mayoristas
Matriz de 6 precios (Tienda/Distribuidor × Unidad/Docena/Mayor) calculada en el frontend; el backend solo valida `precio_unitario ≥ 0` y calcula `subtotal`, `IGV 18 %` y `carreta 15`. La venta por cajas **no está modelada**: `unidades_por_caja` es únicamente metadato de empaque y en inventario "caja" es sinónimo de "mayor".

### Apartado 5 — Identidad visual y marca
Marca activa **Import & Export Gold Continent** en login, sidebar, metadata, favicon, PDF, Swagger, servicio IA, Docker y base de datos. **Cero restos de "Artes y Flores".** Persisten inconsistencias internas (nombre legal no usado, variantes "SAC"/"E.I.R.L.", RUC divergente entre PDF y UI).

---

## 4. Riesgos y deuda técnica identificada

1. **Precios "confianza del cliente":** el backend no recalcula ni valida `precio_unitario` contra `precios_actuales`.
2. **IGV divergente:** la UI muestra `total = subtotal + carreta` sin IGV; la BD guarda el total con IGV 18 %; el PDF declara "precios incluyen IGV".
3. **Bug de rehidratación:** `CotizacionEditarLoader.tsx` compara contra `'tienda'` cuando la BD guarda `'normal'` ⇒ cotizaciones Tienda se rehidratan como DISTRIBUIDOR.
4. **Migración mal formada:** `20240000000_add_costo_unidad.migration.sql` usa `ALTER TABLE producto` (la tabla real es `productos`) y un nombre fuera del formato Prisma.
5. **Tests y documentación eliminados** del árbol de trabajo (166 archivos): `pnpm check` no podría ejecutar la fase de pruebas.
6. **Marca sin parametrizar:** la tabla `configuracion` no tiene seed de `empresa_nombre` / `empresa_ruc`, por lo que el PDF usa valores hardcodeados.

---

## Índice de documentos del reporte

| Documento | Apartado |
|---|---|
| `00-resumen-ejecutivo.md` | Este documento |
| `01-arquitectura-tecnologica-y-dependencias.md` | Apartado 1 |
| `02-logica-algoritmos-recomendacion-ia.md` | Apartado 2 |
| `03-base-de-datos-y-esquema.md` | Apartado 3 |
| `04-reglas-negocio-mayoristas.md` | Apartado 4 |
| `05-identidad-visual-y-marca.md` | Apartado 5 |
