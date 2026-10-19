# Revisión técnica — Gold Continent

Fecha: 11 de octubre de 2026.

> Documento histórico de hallazgos previos a los cambios. Consultar [CORRECCIONES-2026-10-11.md](CORRECCIONES-2026-10-11.md) para el estado actual.

## Alcance y método

Leídos ARQUITECTURA.md, COMPONENTES.md, ENDPOINTS.md, MODULOS.md, REDESIGN.md y TECNOLOGIA.md. README.md contiene solo bytes nulos. También se inspeccionó el contexto del proyecto bajo .deepsec; su INFO.md todavía es una plantilla. La documentación de herramientas y dependencias externas no se considera documentación funcional del sistema.

Revisión estática de autenticación, permisos, cotizaciones, pagos, inventario, productos, reportes, notificaciones, PDF, recomendador Python, esquema y migración Prisma, cliente HTTP, persistencia del borrador, Docker y CI. Esta revisión no equivale a verificar cada línea ni a una auditoría funcional en producción. Los escenarios siguientes se deducen del código; no se ejecutaron mutaciones sobre datos comerciales.

El árbol de trabajo ya tenía modificaciones y numerosas imágenes eliminadas al comenzar. No se corrigió código de negocio ni se restauraron archivos.

## Estado real de la arquitectura

Monorepo pnpm/Turbo: API NestJS, frontend Next.js/React, contratos shared y Prisma/PostgreSQL. Servicio FastAPI con TF-IDF; Redis/BullMQ para PDF, MinIO con fallback local. El frontend actual usa rutas unificadas bajo app/(dashboard), no dos árboles /admin y /vendedor. Existen módulos de reportes y notificaciones, gráficos Recharts y más pruebas que las documentadas. Los permisos efectivos se cargan desde BD para la sesión de frontend, pero no hay guard de permisos por módulo en los endpoints principales.

## Hallazgos prioritarios

### 1. P1 — Las operaciones de productos e inventario ignoran la matriz de permisos

Evidencia: apps/api/src/modules/productos/productos.controller.ts, decorador de clase @UseGuards(JwtAuthGuard); inventario/inventario.controller.ts usa lo mismo. common/guards/roles.guard.ts solo compara códigos de rol cuando existe @Roles; no evalúa rol_permisos ni usuario_permisos. JwtStrategy solo entrega id/email/rol.

Un vendedor con productos=lectura puede llamar directamente a POST/PATCH/DELETE /api/productos, PATCH /api/productos/:id/precios, POST /api/inventario/movimientos o /transferencia. Cambiar la matriz en la interfaz no impide estas llamadas.

Recomendación: guard de permisos efectivos en backend, lectura/edición por operación; mantener además el alcance por propietario donde corresponda. Probar llamadas HTTP con roles de lectura y sin_acceso.

### 2. P1 — Reportes no restringe los datos al vendedor autenticado

Evidencia: apps/api/src/modules/reportes/reportes.controller.ts:29–38, extraerFiltros; reportes.service.ts, buildWhereVendedor y consultas SQL.

Para un vendedor, idVendedor siempre queda undefined, en lugar de fijarse al id de sesión. El servicio omite entonces el WHERE por usuario. GET /api/reportes/auditoria-ia, ranking-productos y antiguedad-deuda pueden devolver información global a cualquier sesión válida. Cachear por usuario no restringe los datos de la consulta.

Recomendación: imponer alcance de datos desde la sesión en servidor y comprobar permiso reportes; no confiar en parámetros enviados por el navegador.

### 3. P1 — Notificaciones revela datos ajenos y comparte las marcas de lectura

Evidencia: apps/api/src/modules/notificaciones/notificaciones.controller.ts y notificaciones.service.ts:45, 87, 130 y 164; packages/database/prisma/schema.prisma, notificaciones_leidas.

El controller no pasa usuario al servicio. Las consultas de cotizaciones y cobranzas no filtran propietario: un vendedor recibe nombres de clientes, números, importes y vencimientos ajenos. Las marcas de lectura se identifican solo por tipo y referencia, así que marcar-todos afecta la bandeja de otros usuarios.

Recomendación: aplicar alcance y permisos a lectura y mutaciones, y persistir lectura por usuario si la bandeja es individual.

### 4. P1 — Un usuario desactivado conserva acceso con su JWT existente

Evidencia: apps/api/src/modules/auth/infrastructure/jwt.strategy.ts:22–28; usuarios/usuarios.service.ts, updateActivo y update; auth/auth.service.ts, logout y obtenerSesion.

validate() devuelve el payload sin consultar activo, deleted_at ni el rol actual. /auth/me y refresh sí revisan usuario, pero productos, inventario y otros endpoints aceptan el access token anterior hasta su vencimiento. Bajar a un admin de rol deja también su rol anterior en el token. Logout solo revoca refresh.

Recomendación: validar estado/rol vigente en backend, o usar versión de sesión con invalidación y una política explícita de revocación.

### 5. P1 — Dos pagos concurrentes pueden superar el saldo

Evidencia: cotizaciones/cotizaciones.service.ts:406–460 y cobranza/cobranza.service.ts:272–345.

Ambos flujos leen total y pagos y validan saldo antes de abrir la transacción. Con saldo 100, dos solicitudes de 80 pueden aprobarse y crear pagos por 160. La transacción agrupa escrituras, pero no protege la lectura previa. La lógica además está duplicada.

Recomendación: unificar pagos; bloquear la cotización antes de leer saldo dentro de la transacción, o aislamiento serializable con reintentos. Incorporar idempotencia y pruebas de concurrencia para ambos endpoints.

### 6. P1 — Inventario pierde actualizaciones concurrentes

Evidencia: inventario/inventario.service.ts:107–147 y 241–286.

Se lee cantidad y luego se escribe un valor absoluto, sin bloqueo explícito ni aislamiento serializable. Con stock 10, dos salidas de 7 pueden leer 10 y ambas escribir 3: el kardex registra salida de 14 y el stock termina en 3. También afecta entradas y transferencias.

Recomendación: bloqueo por producto/almacén y orden consistente en transferencias, o actualización atómica condicionada a disponibilidad, más control del kardex en la misma transacción.

### 7. P1 — El stock del producto diverge del stock por almacén

Evidencia: inventario/inventario.service.ts no actualiza Producto.stock_total/stock_principal; productos/productos.service.ts:218–224 y 606–623; apps/ai-service/app/main.py, SELECT de stock_total.

Después de un movimiento, catálogo/filtros e IA siguen usando stock_total antiguo. Editar producto asigna stock_total=stock_principal, ignorando otros almacenes. El ajuste toma como stock anterior el agregado desactualizado, por lo que puede producir un kardex incorrecto.

Recomendación: establecer stock_actual como fuente única y derivar agregados, o sincronizarlos transaccionalmente en todas las vías de escritura.

### 8. P2 — Actualizar carreta deja costo y total inconsistentes

Evidencia: cotizaciones/cotizaciones.service.ts:304–324.

Ejemplo: subtotal=100, incluye_carreta=true, costo=15. PATCH con solo costo_carreta=30 persiste costo=30, pero calcula total con costo anterior: total=115 en lugar de 130. PATCH incluye_carreta=false sin costo calcula total=100, pero conserva costo=15 en BD. Otra actualización que omita el toggle puede volver a sumar ese costo. Además, cotizaciones-pdf.service.ts recalcula total como subtotal+costo_carreta sin comprobar el toggle: el PDF puede mostrar un importe distinto del persistido.

Recomendación: calcular el estado efectivo del toggle y costo una sola vez, persistir ese costo normalizado y usarlo en el total. Cubrir los PATCH parciales.

### 9. P2 — Edición normal de producto cambia precios sin auditoría

Evidencia: apps/web/src/features/inventario/components/ProductoModal.tsx:426–447; productos/productos.service.ts, update frente a updatePrecios.

El formulario manda precios mediante PATCH /productos/:id. update() hace upsert de precios_actuales sin escribir historialPrecios; solo el endpoint /:id/precios registra auditoría. Un cambio de precio habitual desde UI queda fuera del historial.

Recomendación: compartir una operación de actualización/auditoría transaccional y pasar el usuario autenticado en ambas vías.

### 10. P2 — El correlativo de cotización no se reserva atómicamente

Evidencia: cotizaciones/cotizaciones.service.ts:55 y 217–251.

Dos creaciones pueden calcular el mismo próximo número antes de insertar. La restricción única evita duplicados, pero una operación falla con 400 sin reintento. Buscar solo las últimas 50 filas tampoco garantiza obtener el mayor correlativo histórico.

Recomendación: secuencia/contador en BD o reserva transaccional con reintentos; separar el número de vista previa del identificador definitivo.

### 11. P1 — Exportación PDF y CSV usa un origen distinto al del login en producción

Evidencia: apps/web/src/lib/apiClient.ts usa /api; features/cotizaciones/api/cotizacionApi.ts:410–444 y features/inventario/api/inventario.api.ts, exportarKardexCSV, llaman NEXT_PUBLIC_API_URL directamente. AuthController fija cookies sin dominio. fly-web.toml apunta a goldcontinent-api.fly.dev como URL pública del API.

Con login mediante el rewrite /api del dominio web, el navegador guarda cookies host-only en el dominio web. Los fetch directos al dominio API no las envían; el código JS tampoco puede leer una cookie httpOnly para construir Bearer. Resultado esperado: PDF/CSV responde 401 en ese despliegue. En localhost, compartir hostname puede ocultar el problema.

Recomendación: enviar también descargas por el rewrite del mismo origen y compartir renovación de sesión.

### 12. P2 — El timeout del cliente PDF vence antes de la respuesta 202

Evidencia: cotizacionApi.ts PDF_FETCH_TIMEOUT_MS=15000; backend pdf.constants.ts PDF_WAIT_TIMEOUT_MS=15000; pdf-export.service.ts exportar.

El backend espera hasta 15 s después de consultas, lectura de storage y encolado. El cliente aborta a los 15 s totales. Con generación lenta puede abortar antes de recibir 202 y nunca empezar el polling.

Recomendación: responder 202 rápidamente o dejar margen real entre tiempo máximo del servidor y timeout HTTP cliente.

### 13. P2 — Reporte de antigüedad omite cotizaciones con deuda parcial

Evidencia: reportes/reportes.service.ts:150 y 187 solo incluyen estado aprobada, mientras cobranza incluye enviada/aprobada/parcialmente_pagada y registrarPago cambia a parcialmente_pagada si queda saldo.

Una cotización de 100 con abono 20 queda parcialmente_pagada y desaparece del reporte, pese a mantener deuda 80. Los filtros de fecha solo se aplican cuando llegan ambos extremos; un único extremo se ignora. Los buckets también dejan huecos entre 30/31 y 60/61 días para timestamps con hora.

Recomendación: compartir definición de deuda con cobranza, manejar límites de fecha independientes y rangos de antigüedad contiguos.

### 14. P2 — La IA mezcla datos de caché y stock/precios reales

Evidencia: recomendaciones/recomendaciones.service.ts, stockRow?.cantidad ?? item.stock y precioEsquema > 0 ? precioEsquema : item.precio; apps/ai-service/app/main.py.

Si no existe stock del producto en el almacén seleccionado se usa stock cacheado global, mostrando disponibilidad que no corresponde a ese almacén. Un precio real 0 se sustituye por precio cacheado/mock. Python usa stock_total desactualizado en el ranking; publica caché y matriz mediante asignaciones separadas durante refresh concurrente. /health responde ok aunque falle entrenamiento y /admin/refresh-cache reporta success tras capturar errores.

Recomendación: ausencia de stock en almacén=0, respetar precios reales incluido cero, publicar un snapshot de modelo de forma atómica y reflejar readiness/error de entrenamiento.

### 15. P2 — El último administrador puede perderse por cambio de rol

Evidencia: usuarios/usuarios.service.ts, update y assertCanChangeActivo.

La protección del único admin se aplica solo a activo=false. PATCH de rol= vendedor para el único administrador activo pasa assertRolValido sin comprobar que quede otro admin. Con esto se pierde acceso administrativo para gestionar usuarios/roles.

Recomendación: validar el estado final combinado de rol y activo dentro de una transacción; proteger también cambios concurrentes.

## Documentación y calidad

- README.md: bytes nulos, no contiene instrucciones utilizables.
- ARQUITECTURA y COMPONENTES describen árboles /admin y /vendedor retirados y discrepan sobre almacenamiento de tokens.
- TECNOLOGIA dice que migraciones están desincronizadas en una sección y resueltas en otra. En disco existe 20261009190731_baseline; no se consultó el estado de la BD para afirmar que está aplicada.
- Los conteos de pruebas (84, 93, 112, etc.) no corresponden a la suite actual.
- REDESIGN dice sin gráficos y todos los componentes migrados a next/image; el código actual incorpora Recharts y lint detecta img.
- ENDPOINTS no inventaría reportes/notificaciones actuales y describe fallos PDF que ya tienen fallback en memoria.
- CI omite pruebas de integración cuando no hay BD; no provisiona servicios de integración. Existe una suite Playwright e2e, pero pnpm test y el workflow CI actual solo ejecutan Vitest; no se ejecutó e2e porque crea datos y depende de servicios/fixtures. No se halló suite Python propia en apps/ai-service.
- No se evaluaron vulnerabilidades actuales de paquetes mediante consulta a registros ni se ejecutó un despliegue.

## Orden sugerido de corrección

1. Permisos backend y aislamiento de reportes/notificaciones; revocación de sesiones y protección del último admin.
2. Pagos y stock bajo concurrencia; fuente única del inventario.
3. Totales de carreta, auditoría de precios y correlativos.
4. Descargas del mismo origen y tiempos de PDF.
5. Consistencia de reportes/IA, pruebas de regresión y actualización de documentación.

## Verificaciones

- pnpm typecheck: correcto. Turbo reutilizó resultados de API/shared; ejecutó frontend.
- pnpm lint: falla en frontend por importación formatPrice sin uso en apps/web/src/features/precio-historial/components/PriceCard.tsx:5. Advertencias no bloqueantes por img en ese archivo:71 y producto-form/ImageUploader.tsx:103. Resultado API reutilizado desde caché.
- pnpm test: correcto. Frontend: 119/119 en 15 archivos, ejecución nueva. Backend: resultado reutilizado desde caché de Turbo, 106 aprobadas y 8 omitidas en 11 archivos; NO constituye una nueva validación de integración con BD.
- pnpm build: correcto, 3 tareas satisfactorias. Frontend compilado en esta revisión, generación estática 15/15 y rutas unificadas verificadas en la salida; API/shared reutilizados desde caché de Turbo. No valida infraestructura ni conexión a BD.
- pnpm check se detuvo en lint; pruebas y build se lanzaron por separado.
- No se ejecutaron migraciones, seed, restauraciones, despliegues ni operaciones comerciales de prueba.
