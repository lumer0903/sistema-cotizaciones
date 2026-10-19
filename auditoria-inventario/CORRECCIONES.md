# Correcciones de la auditoría de inventario

Fecha: 14 de octubre de 2026. Cambios implementados en el workspace y aplicados al Docker local. El INFORME.md conserva el diagnóstico previo; este documento registra el estado posterior.

## Resultado

Los once hallazgos funcionales tienen una corrección implementada. No se certifica todavía un SLO de producción: falta la prueba de carga representativa de varios almacenes y grandes volúmenes de movimientos.

### Solución por hallazgo

| Hallazgo | Solución implementada | Comprobación |
|---|---|---|
| F01 filtros/orden | Query DTO, categoría/almacén/activo/estado en PostgreSQL, orden global antes de paginar, desempate por ID y stock_filtrado del almacén elegido. La UI usa stock_status y disponible; añade agotado y activo. | Filtros inexistentes dan cero; filtros combinados correctos; orden asc/desc probado. |
| F02 almacén | Alta usa id_almacen elegido; stock principal se recalcula desde ALM-001. PATCH no admite transferencias implícitas. | Prueba real de alta en almacén secundario y guardado de edición React. |
| F03 alertas | Sincronización central en cada cambio de stock/mínimo; unicidad por par; reconocimiento distinto de resolución; nombres de respuesta alineados; Todas explícito. | Cero existencias bajas sin alerta abierta. Se incorporaron 13 filas faltantes; 30 reconocimientos anteriores quedaron como reconocida. |
| F04 límite 500 | Autocompletado remoto de 20 resultados, debounce 300 ms, detalle por ID para preselección, cancelación y protección de respuesta vigente. | Prueba React con producto ID 12000 y respuesta antigua fuera de orden. |
| F05 listas ilimitadas | Stock y alertas filtran/paginan en servidor, con total/page/limit. Bajo mínimo se compara en SQL. | Solicitar limit=1 devuelve una fila. |
| F06 fechas/queries | Fechas de calendario validadas; intervalo inclusivo de Lima mediante fin exclusivo del día siguiente; enums, enteros y parámetros desconocidos validados. | 23:59 incluido y siguiente 00:00 excluido; inválidos devuelven 400. |
| F07 restricciones | Cinco CHECK validados para productos, stock, precios, movimientos y alertas; índice compuesto de kárdex; índice único de alertas. | SQL directo negativo falla; saldos y agregados concilian. |
| F08 rutas/respuestas | GET movimientos generales, detalle/kárdex inexistente 404, referencia actualizada en respuesta de transferencia; cliente legacy de stock retirado. | HTTP y pruebas de integración. |
| F09 ajustes/auditoría | Ajustes relativos firmados, pares tipo/origen validados, rechazo de transferencias unilaterales, actor registrado, costo cero preservado y rechazo de producto eliminado bajo bloqueo. | Ajustes, referencias, actor, rollback, concurrencia y desbordamiento verificados. |
| F10 CSV | Export por cursor en lotes de 500, marca de agua de ID, backpressure, escape/neutralización de texto y descarga nativa del navegador. | 10.001 movimientos exportados completos; pruebas de delimitadores y fórmulas. |
| F11 frontend | ApiError conserva status y mensajes múltiples; error/ vacío separados; reintento y cancelación en consultas; mínimo cero preservado. | Pruebas React del cliente, búsqueda y formulario; tipos y lint sin errores. |

Se aisló también dist de API y worker por contenedor y se configuró polling de TypeScript para bind mounts de Docker Desktop/Windows. Durante la validación se detectaron compilaciones antiguas que no reaccionaban a eventos de archivo; se recrearon los servicios con la configuración final.

## Reglas adoptadas

- Una alerta mutable por producto y almacén. Reconocer conserva la incidencia abierta; solo reponer por encima del mínimo la resuelve. Cambiar mínimo reevaluará todos los almacenes del producto.
- Bajo en el listado significa 0 < cantidad <= mínimo; Agotado representa cero. Las alertas incluyen cero.
- Al seleccionar almacén, el listado muestra stock_filtrado; stock_total continúa siendo global. Un producto pertenece a un almacén si tiene fila stock_actual, incluso con cantidad cero.
- Ajuste significa variación relativa firmada: -3 descuenta tres, +3 incrementa tres. No significa inventario físico absoluto.
- La edición de stock en la ficha modifica el almacén principal; movimientos y transferencias permiten operar los demás almacenes. La ficha etiqueta esta diferencia y no envía id_almacen en PATCH.
- Todas las fechas de formulario del kárdex corresponden a America/Lima (UTC-05:00). Los timestamps del movimiento se conservan como fechas reales.
- Máximos de respuesta: productos/stock/alertas 1.000; movimientos/kárdex 500; autocompletado 20. Defaults 50. CSV es incremental y no tiene corte de 10.000.
- Inactivos pueden consultarse y administrarse para gestionar sus existencias; eliminados lógicamente no pueden mutarse ni consultarse en detalle.

## Validación

- 37 pruebas de backend: 7 de consultas/CSV/validación, 15 de integración de inventario y 15 regresiones existentes de consistencia/descripción.
- 5 pruebas React: errores HTTP, búsqueda remota/respuestas fuera de orden y guardado de producto con mínimo cero.
- 28 comprobaciones HTTP aprobadas en http-corregido.json, incluyendo proxy de Next.js y rechazo de nulos.
- Tipos de API y web: aprobados. Lint de backend: sin errores. Lint de inventario web: sin errores; advertencia existente por img de previsualización en ImageUploader.
- Página de inventario: HTTP 200, sin error de compilación ni módulo ausente. No sustituye una revisión visual completa de navegador.
- Conciliación final: 977 productos, 977 stocks, 977 movimientos; cero diferencias de agregados/kárdex, cero escasez sin alerta abierta y cero fixtures restantes. Cinco CHECK validados.
- Consulta de catálogo con relaciones: 10 consultas tanto para take=1 como para take=50, incluidas transacción y aislamiento. Número constante: sin N+1 observado. El costo adicional respecto al diagnóstico corresponde a seleccionar IDs, hidratar la página y usar snapshot consistente; no se presenta como mejora de latencia.

Evidencias: backend-tests.txt, frontend-tests.txt, http-corregido.json, pagina-check.json y post-check.json.

Las pruebas React se ejecutaron con Node 24 local: Node 20 de la imagen actual no puede iniciar la combinación instalada de jsdom 30/undici 8. No se cambió globalmente Node ni se actualizaron dependencias. Para CI frontend usar Node 24 y el runner en un hilo si Windows bloquea forks.

### Reproducir en desarrollo

Backend, desde la raíz con Docker local activo:

~~~sh
docker compose exec -T api pnpm --filter @goldcontinent/api typecheck
docker compose exec -T api pnpm --filter @goldcontinent/api exec vitest run src/common/utils/inventory-query.test.ts src/modules/inventario/inventario.integration.test.ts src/common/utils/consistency.integration.test.ts src/modules/productos/descripcion.test.ts
~~~

Frontend, desde apps/web con Node 24:

~~~sh
node node_modules/vitest/vitest.mjs run src/lib/apiClient.test.ts src/features/inventario/useInventoryProducts.test.tsx src/features/inventario/components/ProductoModal.test.tsx --pool=threads --poolOptions.threads.singleThread
~~~

Los runners de integración/HTTP crean y eliminan fixtures identificados; usar únicamente un entorno de desarrollo. Se preservó una copia de los archivos preexistentes modificados en antes-remediacion para facilitar revisión, sin revertir los cambios anteriores del usuario.

## Riesgos de crecimiento y solución posterior concreta

Estos puntos son recomendaciones de arquitectura del informe, no fallos funcionales que se puedan certificar cerrados con las pruebas actuales:

1. **SLO de producción:** ejecutar carga con 10.000+ productos, varios almacenes y 100.000–1.000.000 movimientos. Medir p95/p99, locks, pool, heap y payload. Establecer presupuesto de latencia antes de declarar aprobado. El benchmark inicial permanece como evidencia histórica, no certificación del código nuevo.
2. **Paginación profunda:** migrar listados de gran historial a cursor estable (created_at,id_movimiento), manteniendo count opcional. CSV ya usa cursor por ID y marca de agua.
3. **Reintentos de mutaciones:** incorporar claves de idempotencia por actor con hash del payload y resultado persistidos en la misma transacción. Misma clave y datos retorna resultado previo; misma clave y otros datos debe dar 409. No está implementado en esta entrega; evitar reenvíos automáticos de POST hasta incorporarlo.
4. **Retención histórica:** el API hace borrado lógico y bloqueado. Para impedir purgas privilegiadas accidentales, definir política de retención/backup y separar rol de aplicación del rol de mantenimiento; evaluar reemplazar cascadas del kárdex por RESTRICT en una migración específica. Las cascadas existentes no se cambiaron.
5. **Imágenes huérfanas:** se quitó la subida dentro de la transacción y el fallback base64 incompatible. El siguiente paso es limpiar uploads sin referencia tras un TTL o usar una operación compensatoria si falla el guardado del producto.
6. **Búsquedas GIN:** los índices existen; medir planes con distribución real y estadísticas actualizadas. No forzar índices ni prometer uso universal. Para búsquedas de uno/dos caracteres o un catálogo muy grande considerar prefijo de código y búsqueda textual diferenciados.

Las migraciones ya están aplicadas en Docker local. Otros entornos deben aplicar las migraciones mediante el despliegue habitual antes de ejecutar el nuevo código.
