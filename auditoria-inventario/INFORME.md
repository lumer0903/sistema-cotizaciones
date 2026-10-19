# Auditoría integral del módulo de inventario

> Estado posterior: las correcciones funcionales se implementaron. Véase [CORRECCIONES.md](CORRECCIONES.md). Este informe conserva los hallazgos y mediciones previos a la corrección.

Fecha: 14 de octubre de 2026. Entorno: Docker local, PostgreSQL 16.15, NestJS 11, Next.js 16 / React 19.

## Dictamen y alcance

**No aprobar todavía el módulo para gestión completa ni certificar crecimiento sin degradación.** La base transaccional es sólida y los saldos actuales concilian, pero hay filtros inoperantes, alertas incompletas y productos inaccesibles desde los selectores.

Se inspeccionaron esquema, migraciones, restricciones e índices desplegados, controladores, DTO, servicios, utilidades y componentes React. Se ejecutaron 18 solicitudes HTTP autenticadas, conciliaciones SQL y pruebas de servicios compilados contra PostgreSQL real. Un producto y dos almacenes temporales permitieron probar altas, transferencias, fallos intermedios y concurrencia. Al terminar quedaron **cero productos y cero almacenes de auditoría**. Los saldos de productos existentes no se modificaron.

Se midieron consultas con 100 y 10.000 productos sintéticos en transacciones revertidas; también una tabla temporal con los mismos índices y ANALYZE. Las secuencias de IDs pueden avanzar pese al rollback; no se reiniciaron. No se alteró código funcional: las correcciones siguientes son propuestas, no cambios desplegados ni compilados.

**Límites:** frontend inspeccionado estáticamente, sin recorrido visual autenticado, prueba completa de accesibilidad o responsive. Rendimiento puntual local, sin carga sostenida ni p95/p99; dataset sintético de productos, no múltiples almacenes y millones de movimientos. Las pruebas de servicios usan el código compilado del contenedor y sus resultados se contrastaron con el fuente.

Evidencias en esta carpeta: diagnostico.sql, diagnostico-db.txt, audit.cjs, resultados.json, escala.sql y escala-db.txt. El runner crea datos temporales: usar solo en desarrollo.

## 1. 🟢 Funcionalidades verificadas y aprobadas

| Pilar | Resultado verificado | Límites |
|---|---|---|
| Persistencia | Alta de producto, precios, stock y movimiento inicial en transacción; edición y movimientos también usan transacciones. | Alertas no integradas en todas las rutas. |
| Transferencia atómica | Descuento, incremento, dos movimientos y alertas en una transacción. Un error FK P2003 después del descuento revirtió stock y movimientos. | Probado contra PostgreSQL real. |
| Concurrencia | SELECT FOR UPDATE del producto serializa mutaciones. Dos salidas de 10 con saldo 15: un éxito, un rechazo, saldo final 5. | No protege escritores externos que omitan el bloqueo. |
| Agregados | sincronizarStock recalcula stock_total y stock_principal desde stock_actual. Transferencia conservó total 25. | Conciliación real: cero diferencias. |
| Kárdex | Cero diferencias entre stock actual y suma de deltas; cero discontinuidades de cadena por id_movimiento. | Datos actuales, no prevención de escrituras futuras inválidas. |
| Relaciones | FK, código único y par producto/almacén único realmente desplegados. | Faltan CHECK y unicidad de alertas. |
| Paginación principal | GET productos usa skip/take en SQL, con tope HTTP de 1.000. Kárdex normal tiene tope 500. | Stock y alertas no tienen límites; export es distinto. |
| Sin N+1 observado | Listado con precios, categoría y stock: 6 consultas tanto para 1 como para 50 productos. | Kárdex usa select relacional y no tiene bucle por fila en código; no se instrumentó su conteo. |
| Índices | GIN gin_trgm_ops de codigo/descripcion; índices de movimientos por producto/fecha y almacén/fecha presentes. | Existencia confirmada, uso por cada consulta no garantizado. |
| DTO de escritura | ValidationPipe global transforma, aplica whitelist y rechaza propiedades desconocidas. Cantidad negativa: HTTP 400. | Query sueltos y coherencia tipo/origen no cubiertos. |
| Permisos | JwtAuthGuard valida sesión y permiso productos: lectura en GET, edición en mutaciones. | Inspección de código; matriz completa de roles no ejecutada. |
| Frontend | Debounce de búsqueda 300 ms, skeleton, estado vacío, reintento y modales con UI compartida. Zod en movimiento/transferencia. | Revisión estática; errores y selectores requieren cambios. |

Evidencias: apps/api/src/common/utils/stock.util.ts:3; inventario.service.ts:109,245; productos.service.ts:405,568; InventarioView.tsx:36; InventarioTable.tsx:33,101; jwt-auth.guard.ts:9.

La base inicial tenía **977 productos, 977 stocks y 977 movimientos**. Cero valores negativos en stocks/productos/precios verificados. Cero alertas duplicadas y cero alertas activas con cantidades/mínimos desactualizados. Las cuatro migraciones registradas estaban aplicadas.

## 2. 🔴 Fallos críticos y brechas

### F01 · P1 · Filtros ignorados y orden únicamente por página

InventarioView.tsx:76–78 envía id_categoria, id_almacen y stock_estado. ProductosController.findAll:51–69 solo lee page, limit, search, stock_status e include. sortBy/sortOrder también se ignoran; activo no se soporta. La opción React suficiente no coincide con disponible del servidor.

Pruebas: categoría inexistente y almacén inexistente devuelven los mismos **977** productos. stock_estado=bajo devuelve 977; stock_status=bajo devuelve **62**. El orden de stock bajo se aplica en React después de paginar, solo sobre ocho filas visibles.

**Impacto:** filtros que aparentan funcionar pero entregan otro conjunto. Almacén + bajo stock debe comparar cantidad del almacén con el mínimo; stock_total mantiene significado global. Aplicar filtros y orden estable antes de paginar. UpdateProductoDto tampoco permite activo: hereda CreateProductoDto sin ese campo.

### F02 · P1 · Alta en almacén incorrecto

CreateProductoDto exige id_almacen. ProductosService.create:406,503,511 busca ALM-001 y coloca stock allí, ignorando el almacén enviado. update:556 descarta explícitamente id_almacen; ProductoModal permite elegirlo.

Prueba: alta con almacén temporal **12** terminó en almacén **1**.

**Corrección:** honrar id_almacen para stock inicial y kárdex, o rechazar expresamente otro almacén si el contrato es exclusivamente stock_principal. No interpretar editar ubicación como transferencia: usar la ruta transaccional dedicada.

### F03 · P1 · Alertas incompletas y contrato incompatible

checkStockAlert se llama desde movimientos/transferencias, pero no desde alta/edición de productos ni al cambiar stock_minimo. Hay **43 existencias bajo mínimo sin alerta activa**. Algunas podrían estar reconocidas/resueltas: la cifra por sí sola no identifica la causa de cada caso.

Pruebas específicas: alta con stock 5/mínimo 10 sin alerta; edición a stock 1 también sin alerta. Reconocer una alerta la marca resuelta aunque siga bajo mínimo. El enum reconoce el estado reconocida, pero API/UI no lo usan.

La API devuelve **productos/almacenes**, mientras AlertaStockResponse y AlertasStockTable esperan **producto/almacen**: nombres vacíos. Todas omite estado; el servicio aplica activa por defecto y solo devuelve activas. No hay unicidad por par o por incidencia abierta: findFirst no protege contra otros escritores duplicados.

### F04 · P1 · Selector de operaciones limitado a 500 productos

MovimientoModal.tsx:131, TransferenciaModal.tsx:112 y KardexModal.tsx:75 cargan únicamente los primeros 500. ProductoSearchField filtra ese array local; no busca en API al escribir. Preselección de movimiento/transferencia también depende de ese array.

Con 977 productos quedan **477 fuera del selector global**; con 10.000, 9.500. Implementar búsqueda remota limitada y debounced; resolver preselección por ID. Subir limit a 10.000 trasladaría el problema a memoria/red.

### F05 · P1 · Listas sin paginación

getStockActual:454 descarga todo con findMany y filtra soloBajoMinimo en Node.js. getAlertasStock:509 tampoco limita filas. Controladores no leen page/limit.

Prueba: **GET stock?limit=1&page=1 devolvió 977 filas**. El tipo React promete total/page/limit que no se devuelven. Aplicar WHERE, LIMIT y COUNT en SQL; comparación cantidad vs stock_minimo requiere JOIN, no un FieldRef entre modelos diferentes.

### F06 · P1 · Kárdex pierde el día final y acepta queries inválidas

InventarioController:133–134 convierte YYYY-MM-DD a Date; el servicio aplica lte a medianoche UTC. Excluye casi todo el día final y el inicio tampoco coincide con el día de Lima.

Prueba: producto con movimiento el **2026-10-10** devuelve **cero** al pedir inicio y fin 2026-10-10. fecha_inicio=invalid y tipo=invalid devuelven **500**. id_almacen=NaN devuelve 200 omitiendo filtro. Rangos invertidos no se validan. page/limit=1.5 se aceptan con 200 en productos.

Agregar Query DTO estricto, rechazar parámetros desconocidos, validar calendario y rango, usar [inicio local, día siguiente al fin local). Swagger y DTO de body no validan Query sueltos.

### F07 · P1 · Sin CHECK de integridad en PostgreSQL

pg_constraint muestra FK/PK pero **ningún CHECK** en productos, stock_actual, precios_actuales o inventario_movimientos. Hoy no hay negativos, pero SQL directo/importaciones/futuros escritores pueden introducirlos.

Agregar stocks/mínimos/precios/costos >=0, unidades_por_caja>0, saldos de movimientos >=0 y congruencia entrada/salida. Alta con stock cero registra movimiento de cantidad cero: corregirlo antes de imponer cantidad>0. Revisar ON DELETE CASCADE de movimientos según política de conservación histórica.

### F08 · P2 · Endpoints y respuestas incompletas

- GET /inventario/movimientos: **404**, aunque existen método de servicio y cliente React.
- PATCH /inventario/:id/stock: declarado en cliente, sin ruta. No se confirmó un consumidor activo; deuda de contrato.
- Detalle inexistente: **200 con data=null**, no 404. Kárdex inexistente devuelve 200 vacío; documentar o validar existencia.
- Transferencia devuelve salida.id_referencia=null aunque ya está persistida. Prueba: null devuelto, **1003** persistido. Se devuelve el objeto previo al update.

### F09 · P2 · Ajustes, trazabilidad y combinaciones ambiguas

- tipo ajuste siempre suma cantidad positiva; no permite reducción ni stock físico absoluto con esa semántica. Disminuir exige salida + ajuste_fisico o editar producto.
- Se rechaza tipo transferencia, pero se permite origen transferencia en movimientos unilaterales. También entrada + merma: enums válidos, combinación inválida.
- Alta y ajuste por edición no registran actor en movimiento; update ya recibe actorId. UI los atribuye a Sistema.
- costo_unitario=0 se convierte en null por truthiness en inventario.service.ts:163.
- update no excluye deleted_at; movimiento valida existencia antes de bloquear y borrado lógico no participa del bloqueo. Revalidar dentro de transacción y definir política para inactivos/eliminados.

### F10 · P2 · CSV truncado y sin escape

Export carga máximo 10.000 movimientos y concatena CSV en memoria. Historial mayor se **trunca silenciosamente**. Comas/comillas/saltos rompen columnas; campos textuales con =,+,-,@ pueden ser fórmulas al abrir en Excel. Exportar por cursor/lotes, incluir almacén, escapar y neutralizar fórmulas textuales.

### F11 · P2 · Errores y respuestas antiguas en React

InventarioView:85–90 convierte todo fallo en desconexión del puerto 3001, incluso 400/403/500. apiClient pierde status. parseError espera message string; class-validator envía array y .replace termina en API Error.

KardexModal conserva filas anteriores al fallar; AlertasStockTable solo registra el fallo en consola. No hay cancelación ni control de solicitud vigente: una respuesta vieja puede sobrescribir filtros recientes. El debounce no resuelve esa carrera.

ProductoModal.tsx:421 usa Number(stock_minimo) || 10: mínimo válido **0 se convierte en 10**.

## 3. Cobertura REST

| Necesidad | Ruta bajo /api | Dictamen |
|---|---|---|
| Catálogo | GET /productos | Parcial: búsqueda/paginación/stock_status; faltan categoría/almacén/activo/orden solicitado. |
| Detalle multialmacén | GET /productos/:id?include=precios,categoria,stock | Existe; 404 defectuoso. |
| Alta/edición/borrado | POST /productos; PATCH/DELETE /productos/:id | Persistencia transaccional; almacén/alertas/actor defectuosos; activo no admite DTO. |
| Entrada/salida/merma | POST /inventario/movimientos | Existe; merma requiere salida; falta validación cruzada. |
| Ajuste físico | Misma ruta, tipo ajuste | Solo aditivo positivo. |
| Transferencia | POST /inventario/transferencia | Atómica; referencia devuelta desactualizada. |
| Movimientos generales | GET /inventario/movimientos | Ausente. |
| Kárdex producto/almacén/fechas | GET /inventario/kardex/:id | Existe; fechas/Query defectuosos. |
| Export | GET /inventario/kardex/:id/export | Existe; truncamiento/escape. |
| Stock | GET /inventario/stock | Existe; sin límites ni envelope paginado. |
| Alertas/reconocer | GET /inventario/alertas; PATCH /inventario/alertas/:id/reconocer | Existe; nombres, estados y Todas defectuosos. |
| Legacy stock | PATCH /inventario/:id/stock | Cliente sin implementación; retirar o sustituir por ajuste auditable. |

## 4. 🟡 Escalabilidad y deuda técnica

| Medición puntual | Tamaño | Resultado |
|---|---:|---:|
| Servicio listado con relaciones | take 1 / 50 | 10,07 / 25,99 ms; **6 queries en ambos** |
| HTTP listado | 8 filas / 977 reales | 46,08 ms |
| HTTP stock completo | 977 filas | 76,24 ms |
| Búsqueda selectiva, tabla temporal analizada | 100 / 10.000 exactos | 0,381 / 15,966 ms; Seq Scan |
| Búsqueda corta, tabla temporal analizada | 10.000 | 13,805 ms; Seq Scan |
| OFFSET 9000, tabla temporal analizada | 10.000 | 4,655 ms; escaneo + ordenación |

Sobre tabla real más inserciones revertidas: selectiva 2,210/17,480 ms para +100/+10.000. Estas pruebas incluyen el catálogo base y producto temporal, sin actualizar estadísticas de tabla real. No confundirlas con tamaños exactos del benchmark temporal.

**Índices presentes no significan uso garantizado:** en los planes medidos el optimizador eligió Seq Scan. Depende de tamaño, estadísticas, distribución, selectividad y mantenimiento de GIN; los lotes recién insertados también influyen. Un escaneo secuencial pequeño no es por sí solo un error. La búsqueda actual es subcadena ILIKE, no full-text lingüístico con tsvector. PostgreSQL documenta soporte trigram para LIKE/ILIKE y degradación para patrones sin trigramas extraíbles: [documentación primaria pg_trgm](https://www.postgresql.org/docs/16/pgtrgm.html).

Recomendaciones:

1. Corregir filtros, límites y selector remoto antes de optimización opcional: ya fallan con 977 productos.
2. Añadir idempotencia de movimientos/transferencias para evitar duplicados al reintentar; el bloqueo evita carreras, no duplicación semántica.
3. Orden estable: created_at + ID. Para kárdex grande considerar índice (id_producto,id_almacen,created_at,id_movimiento) y cursor, según EXPLAIN del SQL real.
4. count y página ejecutados con Promise.all fuera de snapshot pueden discrepar con escrituras concurrentes. Usar RepeatableRead cuando se exija consistencia; para autocompletado considerar hasNextPage sin count.
5. Evitar MinIO/red dentro de transacción de alta: subidas exitosas no se revierten con PostgreSQL y latencia prolonga locks. Upload previo + compensación o tarea posterior.
6. Centralizar escritores de stock/alertas; conciliación periódica como detección, no sustituto de atomicidad.
7. Sustituir any y contratos duplicados por tipos compartidos. Alinear reconocida, nombres relacionales y envelopes.
8. Medir p50/p95/p99, locks, pool, payload y heap con 10.000 productos, varios almacenes y 100.000–1.000.000 movimientos. Ese escenario no se ejecutó aquí.

## 5. Remediation code: correcciones propuestas

**No aplicado.** Fragmentos para integrar y acompañar de regresiones. Los snippets de integración usan nombres del servicio/DTO receptor; no se presentan como archivos autónomos ya compilados.

### A. Query DTO estricto y fecha inclusiva en Lima

Usar @Query() query: KardexQueryDto en consulta y export. Añadir ID de producto opcional al DTO derivado para exponer GET movimientos generales. No normalizar valores inválidos silenciosamente.

~~~ts
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Min, Max } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { Prisma, TipoMovimiento, OrigenMovimiento } from '@prisma/client';
export class KardexQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  id_almacen?: number;
  @IsOptional() @IsEnum(TipoMovimiento) tipo?: TipoMovimiento;
  @IsOptional() @IsEnum(OrigenMovimiento) origen?: OrigenMovimiento;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_inicio?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_fin?: string;
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}
function inicioDiaLima(value: string): Date {
  const utc = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== value)
    throw new BadRequestException('Fecha de calendario inválida');
  return new Date(utc.getTime() + 5 * 60 * 60 * 1000);
}
function rangoFechas(q: KardexQueryDto): Prisma.DateTimeFilter | undefined {
  const start = q.fecha_inicio ? inicioDiaLima(q.fecha_inicio) : undefined;
  const end = q.fecha_fin ? inicioDiaLima(q.fecha_fin) : undefined;
  if (start && end && start > end) throw new BadRequestException('Rango invertido');
  return start || end ? {
    ...(start ? { gte: start } : {}),
    ...(end ? { lt: new Date(end.getTime() + 86_400_000) } : {}),
  } : undefined;
}
// Dentro de getKardex, aplicar created_at: rangoFechas(query).
// Ordenar por [{created_at:'desc'}, {id_movimiento:'desc'}].
~~~

Offset fijo válido para Lima; para otras zonas usar biblioteca de zona horaria. DTO anterior acepta días de formulario: no reutilizar para timestamps sin definir otro contrato.

### B. Filtros exactos, stock por almacén y paginación en SQL

Alinear UI a stock_status=disponible/bajo/agotado. Agregar DTO con IDs positivos, activo boolean estricto, page/limit enteros <=100 e include validado. No usar Type(Boolean), que convierte la cadena false en true.

El siguiente patrón devuelve IDs paginados y count sobre el mismo snapshot; hidrata relaciones únicamente de la página. Ver los fragmentos completos con Prisma.sql parametrizado en [remediacion-consultas.md](remediacion-consultas.md).

1. JOIN de productos con stock_actual por id_producto y almacén elegido.
2. stock_scope = stock_total sin almacén, cantidad del almacén cuando se selecciona.
3. WHERE deleted_at IS NULL, categoría, activo, búsqueda y estado sobre stock_scope.
4. COUNT y SELECT IDs con LIMIT/OFFSET en RepeatableRead.
5. findMany para IDs de esa página con include; reordenar según los IDs y exponer stock_filtrado sin cambiar stock_total.

Para GET stock, comparar s.cantidad <= p.stock_minimo en SQL antes de LIMIT. No descargar todos los IDs o existencias para luego filtrar en Node.

### C. Alertas centralizadas y unicidad

Elegir una alerta mutable por par o historial de eventos. Este ejemplo conserva una por par: agregar @@unique([id_producto,id_almacen]) y migración después de revisar duplicados (hoy cero).

~~~ts
export async function sincronizarAlerta(
  tx: Prisma.TransactionClient, id_producto: number, id_almacen: number,
): Promise<void> {
  const [stock, producto] = await Promise.all([
    tx.stockActual.findUniqueOrThrow({
      where: { id_producto_id_almacen: { id_producto, id_almacen } },
    }),
    tx.producto.findUniqueOrThrow({ where: { id_producto } }),
  ]);
  if (stock.cantidad > producto.stock_minimo) {
    await tx.alertas_stock.updateMany({
      where: { id_producto, id_almacen, estado: { in: ['activa', 'reconocida'] } },
      data: { estado: 'resuelta' },
    });
    return;
  }
  await tx.alertas_stock.upsert({
    where: { id_producto_id_almacen: { id_producto, id_almacen } },
    create: {
      id_producto, id_almacen, stock_actual: stock.cantidad,
      stock_minimo: producto.stock_minimo, estado: 'activa',
    },
    update: {
      stock_actual: stock.cantidad, stock_minimo: producto.stock_minimo,
      estado: 'activa', reconocida_at: null,
    },
  });
}
~~~

Llamar dentro de la misma transacción desde alta, edición, movimiento y transferencia. Si cambia stock_minimo, reevaluar todos los almacenes del producto. Decidir si nuevos movimientos bajos reabren reconocimiento; ejemplo anterior sí reabre. Reconocer debe usar estado reconocida, sin alterar stock ni resolver la incidencia.

GET alertas debe poder consultar Todas explícitamente, paginar y mapear:

~~~ts
const data = rows.map(({ productos, almacenes, ...alerta }) => ({
  ...alerta, producto: productos, almacen: almacenes,
}));
~~~

### D. Alta en almacén elegido, actor y respuesta de transferencia

Agregar actorId al método create y pasarlo desde req.user.id_usuario. Dentro de su transacción existente, reemplazar el bloque que fija ALM-001. Si se conserva stock_principal como entrada, documentar compatibilidad; stock_inicial sería un nombre más claro.

~~~ts
const almacen = await tx.almacen.findUnique({ where: { id_almacen: data.id_almacen } });
if (!almacen?.activo) throw new BadRequestException('Almacén no disponible');
await tx.stockActual.create({ data: {
  id_producto: producto.id_producto, id_almacen: almacen.id_almacen,
  cantidad: data.stock_principal,
} });
if (data.stock_principal > 0) await tx.inventarioMovimiento.create({ data: {
  id_producto: producto.id_producto, id_almacen: almacen.id_almacen,
  tipo: 'entrada', origen: 'ajuste_fisico', cantidad: data.stock_principal,
  stock_anterior: 0, stock_posterior: data.stock_principal,
  id_usuario: actorId, observaciones: 'Stock inicial al crear producto',
} });
await sincronizarStock(tx, producto.id_producto);
await sincronizarAlerta(tx, producto.id_producto, almacen.id_almacen);
return tx.producto.findUniqueOrThrow({ where: { id_producto: producto.id_producto } });
~~~

En edición, registrar actorId, revalidar deleted_at bajo bloqueo y sincronizar alertas. Rechazar cambio de almacén por PATCH; usar transferencia. En transferencia retornar la salida tras vincularla:

~~~ts
const salidaVinculada = await tx.inventarioMovimiento.update({
  where: { id_movimiento: salida.id_movimiento },
  data: { id_referencia: entrada.id_movimiento, tipo_referencia: 'inventario_movimiento' },
  select: this.selectMovimientoFields(),
});
// Tras sincronización, dentro de la misma transacción:
return { salida: this.mapMovimiento(salidaVinculada), entrada: this.mapMovimiento(entrada) };
~~~

### E. CHECK de PostgreSQL

Migración propuesta, no ejecutada. NOT VALID deja pendientes las filas históricas; protege nuevas escrituras. Validar tras reconciliar datos.

~~~sql
ALTER TABLE stock_actual ADD CONSTRAINT stock_actual_no_negativo
  CHECK (cantidad >= 0) NOT VALID;
ALTER TABLE productos ADD CONSTRAINT productos_stock_valido
  CHECK (stock_principal >= 0 AND stock_total >= 0 AND stock_minimo >= 0
         AND unidades_por_caja > 0) NOT VALID;
ALTER TABLE precios_actuales ADD CONSTRAINT precios_no_negativos
  CHECK (costo_normal >= 0 AND precio_unidad_normal >= 0
    AND precio_docena_normal >= 0 AND precio_mayor_normal >= 0
    AND costo_distribuidor >= 0 AND precio_unidad_dist >= 0
    AND precio_docena_dist >= 0 AND precio_mayor_dist >= 0) NOT VALID;
ALTER TABLE inventario_movimientos ADD CONSTRAINT movimientos_saldos_validos
  CHECK (cantidad >= 0 AND stock_anterior >= 0 AND stock_posterior >= 0
    AND (costo_unitario IS NULL OR costo_unitario >= 0)
    AND (tipo <> 'entrada' OR stock_posterior = stock_anterior + cantidad)
    AND (tipo <> 'salida' OR stock_posterior = stock_anterior - cantidad)) NOT VALID;
ALTER TABLE stock_actual VALIDATE CONSTRAINT stock_actual_no_negativo;
ALTER TABLE productos VALIDATE CONSTRAINT productos_stock_valido;
ALTER TABLE precios_actuales VALIDATE CONSTRAINT precios_no_negativos;
ALTER TABLE inventario_movimientos VALIDATE CONSTRAINT movimientos_saldos_validos;
~~~

Después de limpiar movimientos históricos de cantidad cero y evitar nuevos, considerar cantidad >0. Igualdad entre tablas no se implementa mediante CHECK: usar escritor transaccional y conciliación.

### F. Ajuste inequívoco y costo cero

DTO específico stock_objetivo entero >=0. Bajo el bloqueo existente, calcular diferencia, registrar entrada/salida con abs(diferencia), omitir si cero y sincronizar stock/alertas. Rechazar origen transferencia en movimientos individuales y validar pares tipo/origen.

~~~ts
const diferencia = dto.stock_objetivo - stock.cantidad;
const tipo = diferencia > 0 ? 'entrada' : 'salida';
const cantidad = Math.abs(diferencia);
// Si diferencia !== 0, persistir stock y movimiento en la misma transacción.
const costo = dto.costo_unitario == null
  ? null : new Prisma.Decimal(dto.costo_unitario.toFixed(2));
~~~

### G. Búsqueda remota y respuesta vigente

Pasar resultados al ProductoSearchField compartido; resolver preselección por GET detalle. Reutilizar protección de respuesta vigente en listado, alertas y kárdex.

~~~tsx
const debouncedSearch = useDebounce(searchQuery, 300);
useEffect(() => {
  if (!open || debouncedSearch.trim().length < 2) { setProductos([]); return; }
  const controller = new AbortController();
  let current = true;
  setLoading(true);
  const params = new URLSearchParams({
    search: debouncedSearch.trim(), page: '1', limit: '20', include: 'stock',
  });
  apiClient<ProductosPaginadosResponse>('/productos?' + params, {
    signal: controller.signal,
  }).then(res => { if (current) setProductos(res.data); })
    .catch(err => { if (current && err.name !== 'AbortError') setError(err.message); })
    .finally(() => { if (current) setLoading(false); });
  return () => { current = false; controller.abort(); };
}, [open, debouncedSearch]);
~~~

Al cambiar filtros, limpiar filas previas o marcarlas desactualizadas. No confundir error con conjunto vacío. Desactivar envíos no sustituye idempotencia.

~~~ts
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function parseError(response: Response): Promise<ApiError> {
  const body = await response.clone().json().catch(() => ({}));
  const raw = Array.isArray(body.message) ? body.message.join('; ') : body.message;
  const message = typeof raw === 'string' ? raw : response.statusText || 'Error de API';
  return new ApiError(response.status, message.slice(0, 200));
}
// 400 validación; 403 permisos; 404 recurso; 5xx servidor/reintento; red conexión.
const stock_minimo = data.stock_minimo == null || String(data.stock_minimo) === ''
  ? 10 : Number(data.stock_minimo); // conservar cero; validar finitud en formulario/DTO.
~~~

### H. CSV

~~~ts
function csvText(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
// Aplicar a texto; serializar cantidades/precios como números validados.
// Exportar por cursor (created_at,id_movimiento) y lotes con backpressure.
// No cortar silenciosamente en 10.000 movimientos.
~~~

## 6. Prioridades y regresiones exigidas

1. **P1 exactitud:** filtros combinados, almacén de alta, alertas, fechas y selectores remotos. Categoría/almacén inexistentes deben dar cero; búsqueda debe encontrar un producto fuera de primeros 500.
2. **P1 límites/integridad:** paginar stock/alertas, Query DTO y CHECK; SQL negativo debe fallar. Alta cero no debe crear movimiento inválido.
3. **P2 contratos:** GET movimientos, detalle 404, referencia actualizada, Todas y reconocida, errores React y CSV completo.
4. **Escala:** SLO acordado y benchmark representativo antes de certificar p95/p99.

Dejar en CI: alta en almacén secundario/stock cero/actor; edición de mínimo y stock con alertas; transferencia con rollback inducido; salidas concurrentes e idempotencia; filtros y paginación vacía; fechas 00:00/23:59 de Lima y calendario inválido; CHECK con SQL directo; UI con respuestas fuera de orden y 400/403/404/500; CSV con comas/comillas/fórmulas y >10.000 movimientos; permisos lectura/edición.
