# Auditoría de precios e historial
Fecha: 14 de octubre de 2026. Alcance: PostgreSQL 16, Prisma, NestJS, Next.js y cálculo de margen en el servicio de IA.

## Dictamen
**No aprobar el módulo como una bitácora completa e inmutable de precios.** La edición completa mediante API tiene buenas garantías transaccionales, pero la edición parcial falla, existen escritores que omiten el historial y la interfaz presenta un historial truncado. El margen de IA utiliza una fórmula distinta a la solicitada.

La auditoría incluye inspección de código, solicitudes HTTP autenticadas, pruebas de concurrencia y rollback con productos temporales, inspección del esquema desplegado y EXPLAIN ANALYZE en tablas temporales. Las propuestas de corrección están en [REMEDIACION.md](REMEDIACION.md); no se aplicaron cambios funcionales ni migraciones en esta auditoría.

## 1. 🟢 Verificado y aprobado
- **Modelo de tarifas:** una fila de precios por producto, seis tarifas —unidad, docena y mayor para normal y distribuidor— y dos costos. Los ocho importes usan numeric/Decimal(10,2). Hay PK y FK, y CHECK de no negativos en precios actuales.
- **Edición completa auditada:** PATCH /api/productos/:id/precios con los ocho campos funciona. La edición del producto también utiliza guardarPreciosAuditados al cambiar precios/costos. La operación toma un bloqueo del producto y ejecuta escritura e historial en una transacción.
- **Actor y atomicidad:** el cambio 10 → 12 produjo un registro con actor autenticado. Un actor inválido provocó rollback: precio e historial permanecieron iguales. Dos actualizaciones concurrentes mediante el servicio mantuvieron la continuidad anterior/nuevo.
- **No-op:** reenviar valores iguales no genera entradas falsas.
- **Validaciones existentes:** valores negativos, texto no numérico, más de dos decimales y 100000000 fueron rechazados con 400.
- **Paginación del servidor:** catálogo e historial usan take/skip; historial tiene límite predeterminado 50 y máximo 1000. La pantalla desaprovecha esta garantía, como se detalla abajo.
- **Índices desplegados:** historial por (id_producto, fecha_cambio), fecha y usuario; productos por categoría, estado de eliminación/creación y GIN trigram para código/descripción.
- **Sin N+1 observado en las rutas examinadas:** historial ejecutó cuatro consultas tanto para una fila como para 50; catálogo con relaciones ejecutó ocho en ambos tamaños. Se usan consultas relacionales por lotes, sin consulta individual dentro de un bucle. Esto no certifica todas las rutas del sistema.
- **Autorización del historial:** vendedor recibe 403; admin/gerente tienen acceso conforme a los guards y la condición de la interfaz.
- **Interfaz:** moneda S/ con dos decimales y primitivas compartidas Modal, Table y Button. El formulario de producto usa resolver Zod y validación onChange.
- **Prueba existente:** precioApi.test.ts pasó, 1/1. Comprueba páginas posteriores y conversión de una tarifa; no cubre auditoría, errores HTTP ni rendimiento.

## 2. 🔴 Fallos y brechas críticos

| ID / prioridad | Evidencia y efecto | Solución |
|---|---|---|
| P01 / P1 | PATCH parcial {precio_unidad_normal:13} devuelve 500. class-transformer materializa las ocho propiedades; Object.keys(data) incluye siete undefined que se convierten en NaN. | Lista permitida de campos y filtro value !== undefined, Decimal y preservación de excepciones HTTP. R1. |
| P02 / P1 | En un cuerpo completo, null y una cadena de espacios se aceptaron con 200 y terminaron como cero. IsOptional ignora null y Number convierte cadenas vacías. | Rechazar null, booleanos, blancos y valores no finitos antes de la conversión; validar precisión. R1. |
| P03 / P1 | scripts/importar-unificado.js actualiza/upserta precios sin historial, actor ni bloqueo común. La creación inicial del producto tampoco registra un evento base. Un escritor SQL directo no genera auditoría. | Unificar escritores y actor; restringir acceso directo o adoptar un trigger único de auditoría. Registrar evento inicial explícito. R2. |
| P04 / P1 | historial_precios admite UPDATE/DELETE; se pudo alterar un registro de prueba y aceptar campo inexistente/importes negativos. Producto tiene ON DELETE CASCADE y actor ON DELETE SET NULL. | Restricciones de campos/importes, ledger inmutable y política de retención de producto/actor. R2–R3. |
| P05 / P1 | calcular_margen en IA divide entre costo: precio 100/costo 80 entrega 25%, en vez de 20%. Costo cero devuelve 0 aunque con precio positivo el margen es 100%. | Decimal y denominador precio; precio cero debe tener una política explícita, por ejemplo null. R4. |
| P06 / P1 | La interfaz descarta total/page del historial y solicita solo limit=100: de 116 registros muestra 100 sin permitir acceder a 16. | Mantener el sobre paginado y agregar navegación/fechas. R5. |
| P07 / P1 | Historial con id_producto=NaN devuelve listado general (200); fecha inválida devuelve 500; limit=1.5 se acepta; take=1 se ignora. Rango date-only del mismo día excluyó 105 entradas de prueba por límite superior a medianoche UTC. | DTO estricto, parámetros documentados y rango [inicio Lima, siguiente día Lima). R5. |
| P08 / P2 | No hay endpoint de ajustes masivos ni contrato de consulta de precios por tarifa/rango. Los parámetros de tarifa/rango enviados a productos reciben 400. | Endpoint específico paginado y trabajo masivo validado/idempotente. R6. |
| P09 / P2 | Usuario con consulta_precios pero sin productos recibe 403 al cargar catálogo, aunque necesita esos datos para la pantalla. | Endpoint de consulta con permiso correspondiente y proyección que no exponga costos sin autorización. R6. |
| P10 / P2 | Si falta la fila de precios y se envían ocho ceros, el helper omite el upsert por no detectar cambios y termina en 500. No ocurrió en los 977 productos reales. | Crear la fila aun cuando todos sus valores sean cero y registrar inicialización diferenciada. R1–R2. |
| P11 / P2 | GET /historial-precios/:id inexistente responde 200 con data:null. | NotFoundException y manejo de 404 en UI. R5. |
| P12 / P2 | No se aplica jerarquía de tarifas ni política de venta bajo costo: ambos payloads se aceptaron. | Confirmar unidad de medida, descuentos y excepciones; después validar el estado fusionado, no solo campos del PATCH. R7. |

### Hallazgos de integridad y precisión
El CHECK actual >= 0 acepta numeric NaN de PostgreSQL: se reprodujo únicamente sobre un fixture y se revirtió. Una cota superior finita también debe formar parte del CHECK. El detalle de NaN está documentado por [PostgreSQL 16](https://www.postgresql.org/docs/16/datatype-numeric.html).

La base real tenía **977 productos, 977 filas de precios y cero entradas de historial**, tanto al inicio como al cierre. No hay productos sin precios ni negativos ordinarios. Hay un producto con alguna tarifa normal bajo costo y uno con alguna tarifa de distribuidor bajo costo; pueden ser el mismo producto. No hay inversiones de jerarquía en el catálogo actual. El historial vacío impide certificar continuidad histórica real: cero discontinuidades sobre cero registros no es una garantía.

Los cambios guardan valor anterior/nuevo y timestamp; el delta puede derivarse por resta sin columna redundante. El actor es nullable y puede perderse al borrar un usuario. timestamp without time zone exige una convención explícita; en UI se descarta la hora. No hay columna de margen persistido, por lo que no corresponde exigir un CHECK sobre una columna inexistente.

## 3. 🟡 Escalabilidad y deuda técnica

### Mediciones reproducibles
Tablas temporales con índices copiados del esquema, 100/10000 productos y 1000/100000 registros de historial; ROLLBACK al terminar. Tiempos de una ejecución SQL local, sin concurrencia ni percentiles HTTP:

| Consulta | Tamaño | Execution Time |
|---|---:|---:|
| Catálogo con precios, primeras 50 filas | 100 productos | 0.494 ms |
| Catálogo con precios, primeras 50 filas | 10000 productos | 14.377 ms |
| Rango de precio propuesto, primeras 50 | 10000 productos | 7.264 ms |
| Historial por producto/fecha, primeras 50 | 1000 registros | 0.595 ms |
| Historial por producto/fecha, primeras 50 | 100000 registros | 0.149 ms |
| COUNT del historial de producto frecuente | 100000 registros | 40.333 ms |
| Historial OFFSET 40000, 50 filas | 100000 registros | 16.116 ms |

La búsqueda de historial utilizó el índice compuesto existente. El menor tiempo en la muestra mayor refleja caché/variación, no una aceleración garantizada. El catálogo y rango usaron secuenciales/hash join/sort en este escenario; un secuencial no implica por sí mismo un error. El filtro de rango es una consulta representativa de una funcionalidad propuesta, **no un endpoint existente**.

### Riesgos y medidas
1. **Descarga completa del catálogo:** getProductosConsulta recorre secuencialmente todas las páginas de 500 y concatena resultados. Con 10000 productos son 20 solicitudes y el catálogo entero en React. Migrar búsqueda, filtros y paginación al servidor; solicitar solo precios/categoría, sin stock si no se muestra.
2. **Búsqueda sin debounce:** hoy filtra localmente, por lo que no genera una petición por pulsación. Consume CPU y recalcula sobre el catálogo completo. Agregar debounce de 300 ms al migrar a consulta remota.
3. **Historia profunda:** usar orden estable fecha_cambio DESC, id_historial DESC e índice (id_producto, fecha_cambio DESC, id_historial DESC); adoptar cursor compuesto para navegación profunda. Mantener conteo opcional o separado; COUNT puede dominar la latencia.
4. **Índices de tarifa:** no hay índice de rango por cada precio. Crear solo los que justifiquen consultas/selectividad y EXPLAIN; seis índices indiscriminados encarecen cada actualización.
5. **Búsqueda textual:** GIN trigram de código/descripción existe. No se certificó su uso en todas las búsquedas reales, especialmente términos cortos y combinaciones de filtros. Añadir EXPLAIN sobre patrones representativos antes de afirmar cobertura total.
6. **Consistencia de paginación:** findMany/count del historial se ejecutan sin snapshot común y pueden discrepar durante escrituras. Usar RepeatableRead para una página consistente; el cursor ayuda entre páginas. Las garantías de aislamiento de Prisma se describen en su [documentación de transacciones](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions).
7. **Importación:** transacción por fila no garantiza auditabilidad ni atomicidad de todo un lote. Los valores cero se omiten por comprobaciones >0. Introducir lote, actor, resultado por ítem, reintentos idempotentes y bloqueos consistentes.
8. **Precisión de API:** Decimal se convierte a Number en respuestas/comparaciones. Los importes máximos de Decimal(10,2) no exceden el entero seguro de JS, pero las operaciones con fracciones siguen siendo binarias. Calcular con Decimal y serializar dinero como cadenas de dos decimales; migrar consumidores juntos.

### UX pendiente
- PreciosView no presenta estado de carga inicial diferenciado; muestra vacío durante la descarga y los fallos quedan en toast sin recuperación persistente.
- El estado de carga del historial no se muestra. Si falla, se abre el modal con lista vacía y puede aparentar que no hubo cambios.
- Solicitudes de historial concurrentes carecen de cancelación/identidad, permitiendo mezclar producto seleccionado e historial.
- Faltan filtro temporal y paginación del modal; la fecha se muestra sin hora ni zona explícita.
- El selector de tarifa oculta tarjetas localmente; no equivale al filtro de datos del servidor. No hay controles de rango, categoría y actividad en esta pantalla.
- PriceMatrix usa inputs HTML propios, aunque el resto comparte primitivas. Mantener validación inmediata y reemplazar por Input compartido.
- El mapeo convierte precio ausente en cero, mezclando ausencia con gratuidad. isNaN no excluye Infinity. Representar ausencia con null y verificar Number.isFinite.
- No se observó un editor dedicado de precios en esta pantalla; se usa la matriz del formulario de producto. Las garantías de validación y permisos deben cubrir ese flujo.

## 4. Cobertura REST
| Necesidad | Estado |
|---|---|
| Lista paginada con búsqueda/categoría/actividad | Existe mediante GET /api/productos; permiso y descarga frontend requieren ajuste |
| Filtrar tarifa y rango de precio | No implementado |
| Actualizar precios individualmente | PATCH /api/productos/:id/precios; cuerpo completo funciona, parcial falla |
| Actualizar costo desde producto | PATCH /api/productos/:id; registro transaccional comprobado |
| Ajuste porcentual por categoría | No implementado |
| Historial por producto/usuario/campo/fechas | GET /api/historial-precios; existe con validación y rango defectuosos |
| Detalle de evento | GET /api/historial-precios/:id; falta 404 |
| Historial completo navegable en UI | No: solo primeros 100 |

## 5. Evidencia, limitaciones y orden de corrección
- [resultados.json](resultados.json): pruebas HTTP/servicio, concurrencia, rollback y limpieza.
- [dto.json](dto.json): propiedades undefined y conversiones a NaN.
- [margenes.json](margenes.json): siete casos de fórmula actual frente a la solicitada.
- [diagnostico-db.txt](diagnostico-db.txt) y [diagnostico-final-db.txt](diagnostico-final-db.txt): esquema y datos reales antes/después.
- [escala-db.txt](escala-db.txt) y [escala.sql](escala.sql): planes y benchmark aislado.
- audit.cjs y margenes.py contienen el procedimiento; audit.cjs crea fixtures antes de borrarlos y requiere entorno Docker local autorizado. No ejecutar contra producción.

Prioridad: P01/P02 y margen → cubrir todos los escritores e inmutabilidad → rango/DTO/historial paginado → consulta remota/permisos → ajuste masivo e índices medidos. Convertir cada reproducción en prueba de regresión al implementar.

Se limpiaron productos y usuarios temporales (conteo restante 0); los experimentos de mutabilidad/NaN y las tablas de escala se revirtieron. Las secuencias de IDs pueden haber avanzado por fixtures: no se reiniciaron. No se ejecutó la importación real ni se alteraron precios del catálogo real. No se hizo recorrido visual autenticado ni prueba sostenida de carga; la evaluación de UI es estática con la prueba unitaria existente. Los snippets son propuestas de integración, no código aplicado, compilado o validado de extremo a extremo.

## Fuentes de código examinadas
- apps/api/src/common/utils/precios.util.ts
- apps/api/src/modules/productos/{productos.service.ts,productos.controller.ts,dto/update-precios.dto.ts}
- apps/api/src/modules/historial-precios/{historial-precios.service.ts,historial-precios.controller.ts}
- packages/database/prisma/schema.prisma y esquema PostgreSQL desplegado
- scripts/importar-unificado.js
- apps/ai-service/app/main.py
- apps/web/src/features/precio-historial/{api/precioApi.ts,components/PreciosView.tsx,components/HistorialPrecioModal.tsx,components/PriceCard.tsx}
- apps/web/src/features/inventario/components/producto-form/PriceMatrix.tsx
