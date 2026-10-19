# Correcciones de la auditoría de precios e historial

Fecha: 14 de octubre de 2026.
Alcance: PostgreSQL 16, Prisma 5.22, NestJS, Next.js 14 y servicio de IA (FastAPI).

---

## 1. Dictamen actualizado

**APROBADO como bitácora transaccional, completa e inmutable de precios.**

Se implementaron e integraron todas las soluciones propuestas en [REMEDIACION.md](REMEDIACION.md) sobre el workspace y la base de datos PostgreSQL desplegada. Se eliminaron los escritores ciegos, el historial se blindó a nivel de motor de base de datos contra mutaciones o truncamientos directos, se unificó la captura de actor y motivo, se resolvió la fórmula de margen comercial en el servicio de IA, y la interfaz de usuario cuenta con consulta remota desacoplada, filtros debounced y navegación completa y paginada del historial de precios.

---

## 2. Matriz de resolución de hallazgos (P01 – P12)

| Hallazgo / Prioridad | Causa original | Solución implementada | Evidencia y verificación |
|---|---|---|---|
| **P01 / P1**<br>PATCH parcial falla con 500 | `class-transformer` materializaba campos no enviados como `undefined` que se convertían en `NaN`. | `UpdatePreciosDto` adopta `@ValidateIf((_o, v) => v !== undefined)` y transformación limpia. `guardarPreciosAuditados` utiliza la lista permitida `PRICE_FIELDS` filtrando `value !== undefined`. Se preservan las `HttpException` en los bloques `catch`. | `pricing-regression.cjs`: `PASS PATCH parcial conserva omitidos y registra un cambio`. Código HTTP 200 devuelto. |
| **P02 / P1**<br>Null, blancos y booleanos aceptados | `@IsOptional()` y `Number()` convertían valores nulos o cadenas vacías a 0. | DTO estricto con `@IsNumber({ maxDecimalPlaces: 2 })`, `@Min(0)`, `@Max(99999999.99)`. La función auxiliar `decimalMoney` rechaza tipos no numéricos, blancos y valores fuera de rango o precisión. | `pricing-regression.cjs`: `PASS payloads monetarios inválidos son 400`. Null, espacios y booleanos son rechazados con 400. |
| **P03 / P1**<br>Escritores sin historial ni actor | `scripts/importar-unificado.js` y `ProductosService` creaban/actualizaban sin auditoría ni actor. | Se implementó el trigger PostgreSQL `auditar_precios_actuales` en la tabla `precios_actuales`. Exige actor válido mediante `set_config('app.actor_id')`. Tanto el alta de productos como el script de importación establecen el actor dentro de la transacción y generan evento inicial `CREACION`. | `pricing-regression.cjs`: `PASS creación registra los ocho importes con actor` y `PASS escritor directo requiere actor y registra auditoría`. |
| **P04 / P1**<br>Mutabilidad del historial y cascadas débiles | `historial_precios` permitía `UPDATE`, `DELETE` y `TRUNCATE`. Las FK permitían borrado en cascada y `SET NULL`. | Se crearon triggers PostgreSQL `proteger_historial` (bloquea UPDATE/DELETE directos, permitiendo INSERT únicamente con profundidad >= 2 desde el trigger de precios) e `impedir_truncate_historial`. Llaves foráneas migradas a `ON DELETE RESTRICT`. Se preserva `actor_nombre` desnormalizado. | `pricing-regression.cjs`: `PASS ledger no permite insertar, alterar, borrar o truncar`. Modificaciones directas son rechazadas por PostgreSQL. |
| **P05 / P1**<br>Fórmula de margen de IA invertida | `calcular_margen` dividía `(precio - costo) / costo`, arrojando 25% para 100/80 en vez de 20%. | Se reescribió `calcular_margen` en `apps/ai-service/app/main.py` utilizando `Decimal` con fórmula `((precio - costo) / precio * 100).quantize(Decimal('0.01'), ROUND_HALF_UP)`. Cuando `precio == 0`, retorna explícitamente `None` (null en JSON). | `apps/ai-service/test_consistency.py`: 8 pruebas unitarias aprobadas (`test_profit_margin_uses_price_denominator`, `test_invalid_margin_inputs_are_rejected`). |
| **P06 / P1**<br>Historial truncado en interfaz (límite 100) | La interfaz descartaba metadata y pedía un tope fijo de 100 registros. | `HistorialPreciosService` y `precioApi.ts` retornan sobre de paginación `{ data, total, page, limit, next_cursor }`. `HistorialPrecioModal` implementa paginación interactiva, límites configurables y selector de fechas. | `pricing-regression.cjs`: `PASS historial navega más de 100 eventos sin duplicarlos`. Modal probado en smoke test UI. |
| **P07 / P1**<br>Parámetros inválidos y huso horario de fechas | `id_producto=NaN` devolvía 200; fechas date-only a medianoche UTC excluían eventos del mismo día en Lima (UTC-5). | `HistoryQueryDto` valida tipos enteros positivos y parámetros desconocidos. La función `startOfLimaDay` calcula el inicio del día en `America/Lima` (UTC-5) y el límite superior suma 86,400,000 ms (día siguiente a las 00:00:00 exclusivo). | `pricing-regression.cjs`: `PASS rango de hoy Lima incluye el día completo y rechaza inversión` y `PASS filtros y validación de consultas exactos`. |
| **P08 / P2**<br>Sin ajustes masivos ni filtro por rango | No existía endpoint para ajustes porcentuales ni filtrado por tarifa/rango. | Se creó el módulo `precios` (`PricingController`, `PricingService`) con `POST /api/precios/ajustes-masivos`. Utiliza bloqueo transaccional por lotes (`pg_advisory_xact_lock`), ordenación por ID para evitar interbloqueos, tabla de idempotencia `precio_ajustes_lotes`, y cálculo en `Decimal`. | `pricing-regression.cjs`: `PASS ajuste masivo atómico, Decimal e idempotente` y `PASS ajustes concurrentes con la misma clave se aplican una sola vez`. |
| **P09 / P2**<br>Vendedores bloqueados (403) para consultar precios | La pantalla de precios dependía del catálogo de `productos`, requiriendo permisos no asignados a consulta. | Se implementó `GET /api/precios` bajo el permiso `consulta_precios`. Proyecta únicamente las 6 tarifas de venta al público (`SALE_FIELDS`), ocultando `costo_normal` y `costo_distribuidor` si el usuario no tiene permisos de inventario/costos. | `pricing-regression.cjs`: `PASS consulta tiene permisos independientes y no expone costos`. |
| **P10 / P2**<br>Inicialización con ceros fallaba en fila inexistente | Si no existía fila de precios y se enviaban ceros, no se detectaba cambio y terminaba en 500. | Se unificó el upsert para que el primer guardado cree siempre la fila con los 8 importes y registre el evento inicial `CREACION` en `historial_precios`. | `pricing-regression.cjs`: `PASS fila inexistente se inicializa aun con ocho ceros`. |
| **P11 / P2**<br>GET historial por ID inexistente devolvía 200 `{ data: null }` | No se lanzaba excepción ante ausencia de registro. | `HistorialPreciosService.findById` lanza `NotFoundException` (404) si el ID solicitado no existe. | `pricing-regression.cjs`: comprobado en validación de rutas REST (404 estándar). |
| **P12 / P2**<br>Sin jerarquía de tarifas ni validación de bajo costo | Se permitían tarifas desordenadas (por ejemplo mayorista > unidad). | Se agregó el CHECK `jerarquia_tarifas` en PostgreSQL (`precio_unidad >= precio_docena >= precio_mayor` tanto para normal como distribuidor) y validación previa en NestJS. La venta bajo costo se permite pero queda auditada con su motivo. | `pricing-regression.cjs`: `PASS jerarquía fusionada se valida y bajo costo se permite` y `PASS ajuste que rompe jerarquía revierte todo el lote`. |

---

## 3. Migraciones de base de datos aplicadas

Se aplicaron 4 migraciones Prisma incrementales sobre PostgreSQL 16:

1. **`20261014000300_pricing_audit`**:
   - Columnas en `historial_precios`: `evento` ('CREACION' | 'CAMBIO' | 'BASELINE'), `actor_nombre`, `motivo`.
   - Llaves foráneas de `id_producto` e `id_usuario` migradas a `ON DELETE RESTRICT`.
   - CHECKs de valores finitos `BETWEEN 0 AND 99999999.99` en las 8 columnas de `precios_actuales` y en `historial_precios`.
   - Restricción de campo modificado a los 8 nombres válidos.
   - Triggers de inmutabilidad `proteger_historial` e `impedir_truncate_historial`.
   - Trigger unificado de auditoría `auditar_precios_actuales`.
   - Tabla de idempotencia `precio_ajustes_lotes`.
   - Generación de línea base: 7,816 registros iniciales (`BASELINE`) para los 977 productos reales sin inventar cambios pasados.

2. **`20261014000400_pricing_hierarchy`**:
   - Restricción CHECK `jerarquia_tarifas` asegurando `unidad >= docena >= mayor` para tarifas normales y de distribuidor.

3. **`20261014000500_pricing_query_indexes`**:
   - Índice compuesto `historial_cursor_global_idx` sobre `(fecha_cambio DESC, id_historial DESC)`.
   - Índices B-Tree `precios_unidad_normal_idx` y `precios_unidad_dist_idx` para filtrado por rangos de precio.
   - CHECK `historial_actor_requerido`: exige `id_usuario IS NOT NULL` para todo evento distinto de `BASELINE`.

4. **`20261014000600_pricing_audit_batch`**:
   - Optimización en bloque de `auditar_precios_actuales` mediante `unnest` y JSONB.
   - Blindaje contra reasignación del `id_producto` en `precios_actuales`.

---

## 4. Arquitectura y reglas adoptadas

- **Ledger inmutable en el motor de base de datos:** Ningún usuario ni proceso de aplicación puede ejecutar `UPDATE`, `DELETE` o `TRUNCATE` sobre `historial_precios`. Las modificaciones a precios actuales disparan automáticamente el registro en el historial.
- **Actor obligatorio:** Todo escritor directo (API, migraciones, scripts de importación) debe configurar `app.actor_id` en la transacción. Si el actor no existe, está inactivo o borrado lógicamente, la transacción es abortada inmediatamente por PostgreSQL.
- **Segregación de permisos y confidencialidad:** El nuevo endpoint `GET /api/precios` permite a vendedores y cotizadores consultar precios vigentes con el permiso `consulta_precios`, sin exponer costos de adquisición (`costo_normal`, `costo_distribuidor`).
- **Idempotencia de ajustes masivos:** `POST /api/precios/ajustes-masivos` requiere un UUID `clave`. Si se reenvía la misma solicitud, retorna el resultado previo sin volver a aplicar el porcentaje. Si se intenta reutilizar la clave con otros parámetros, rechaza con conflicto HTTP 409.
- **Zona horaria canónica:** La persistencia registra fechas en UTC con precisión de milisegundos (`clock_timestamp()`). Los filtros por día calendario operan bajo el intervalo `[00:00:00, 24:00:00)` de `America/Lima` (UTC-05:00). La interfaz formatea fechas y horas bajo este huso horario.
- **Estandarización UI:** Se reemplazaron inputs HTML nativos en `PriceMatrix` por el componente compartido `Input` de `@/components/ui`. `PreciosView` y `HistorialPrecioModal` implementan estados diferenciados de carga (Skeleton/indicador), error con botón de reintento, y estado vacío informativo.

---

## 5. Resumen de pruebas y verificación

### Suite de regresión integral (`auditoria-precios/pricing-regression.cjs`)
Se ejecutaron 21 comprobaciones automáticas contra base de datos aislada, pasando al 100%:
1. `PASS creación registra los ocho importes con actor`
2. `PASS PATCH parcial conserva omitidos y registra un cambio`
3. `PASS no-op no produce eventos`
4. `PASS payloads monetarios inválidos son 400`
5. `PASS jerarquía fusionada se valida y bajo costo se permite`
6. `PASS editar producto conserva costos omitidos y rechaza null`
7. `PASS actor inválido revierte precio e historial`
8. `PASS concurrencia mantiene continuidad del historial`
9. `PASS escritor directo requiere actor y registra auditoría`
10. `PASS ledger no permite insertar, alterar, borrar o truncar`
11. `PASS DB rechaza NaN y precios negativos`
12. `PASS consulta tiene permisos independientes y no expone costos`
13. `PASS filtros y validación de consultas exactos`
14. `PASS historial navega más de 100 eventos sin duplicarlos`
15. `PASS rango de hoy Lima incluye el día completo y rechaza inversión`
16. `PASS ajuste masivo atómico, Decimal e idempotente`
17. `PASS ajustes concurrentes con la misma clave se aplican una sola vez`
18. `PASS ajuste que rompe jerarquía revierte todo el lote`
19. `PASS fila inexistente se inicializa aun con ocho ceros`
20. `PASS escala real: 10000 productos, 100000+ eventos y lote completo`
21. `PASS consultas relacionales permanecen constantes al aumentar la página`

### Servicio de IA (`apps/ai-service/test_consistency.py`)
- 8/8 pruebas unitarias ejecutadas satisfactoriamente (fórmula de margen comercial sobre precio, manejo de precio cero como null, validación de inputs y conexión DSN compatible).

### Base de datos de producción / catálogo real
- 977 productos activos.
- 977 filas de precios actuales asociadas.
- 7,816 registros iniciales en `historial_precios` con evento `BASELINE`.
- 0 importes divergentes entre la línea base y los precios actuales.
- 0 bases de datos de prueba residuales.

---

## 6. Comandos de reproducción

Para ejecutar la verificación en el entorno de desarrollo:

```bash
# 1. Typecheck de API
pnpm --filter @goldcontinent/api typecheck

# 2. Pruebas de integración del backend y consistencia
docker compose exec -T api pnpm --filter @goldcontinent/api exec vitest run src/common/utils/consistency.integration.test.ts src/modules/inventario/inventario.integration.test.ts

# 3. Pruebas unitarias de IA (cálculo de margen)
docker compose exec -T ai-service python -m unittest test_consistency.py

# 4. Suite completa de regresión de auditoría de precios
docker compose exec -T api node /app/auditoria-precios/pricing-regression.cjs
```
