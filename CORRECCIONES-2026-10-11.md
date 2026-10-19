# Correcciones de la revisión del sistema

Fecha: 11/10/2026. Referencia: REVISION-SISTEMA-2026-10-11.md.

## Hallazgos atendidos

| Hallazgo | Corrección |
|---|---|
| 1. Matriz ignorada en API | @Permission y JwtAuthGuard exigen permisos efectivos por operación en los controladores; lectura no autoriza mutaciones. |
| 2. Reportes globales para vendedores | El alcance se impone desde la sesión; el parámetro del cliente no lo amplía. La clave de caché incluye rol y permisos actuales. |
| 3. Notificaciones compartidas | Consultas por propietario y módulo autorizado; tabla notificaciones_lecturas con clave compuesta por usuario, tipo y referencia. |
| 4. JWT desactualizados | Cada solicitud valida usuario, activo, deleted_at, rol activo y session_version. Logout, contraseña y cambio de rol/estado revocan sesiones. Refresh rotatorio con SHA-256 y comparación/actualización condicional. |
| 5. Pagos concurrentes | Las dos rutas usan un servicio común con bloqueo de cotización previo a leer saldo, aritmética Decimal y validación de centavos. Clave de idempotencia y reintentos estables en el formulario. |
| 6. Stock concurrente | Bloqueo del producto antes de leer/modificar existencias en movimientos, transferencias y edición. |
| 7. Agregados divergentes | stock_actual es la fuente; se recalculan stock_total y stock_principal en cada mutación. Editar el principal conserva existencias de otros almacenes. Migración reconcilia agregados existentes. |
| 8. Carreta parcial/PDF | Cambiar únicamente el costo recalcula el total; desactivar carreta fuerza costo cero. PDF respeta incluye_carreta. |
| 9. Precios sin auditoría | Edición normal y endpoint de precios comparten escritura auditada, con usuario real y valores anterior/nuevo. |
| 10. Correlativo en carrera | Se genera dentro de la transacción con bloqueo común y máximo de todos los correlativos cortos. La vista previa no reserva número. |
| 11. Cookies en PDF/CSV | Las descargas usan /api mediante apiFetch, cookies httpOnly y renovación compartida de sesión. |
| 12. Timeout PDF | Exportación permite 45 s; el sondeo conserva límites y cancelación. |
| 13. Reporte de deuda | Incluye enviada y parcialmente_pagada, aplica inicio/fin independientes en horario Lima y elimina huecos entre rangos. Corrige nombres reales de columnas de crédito y devuelve error ante fallos SQL. |
| 14. IA obsoleta/inconsistente | Ranking consulta stock/precios actuales, respeta valores cero y almacén; snapshot de matriz y catálogo publicado de una vez. Fallos de inicialización/refresh devuelven 503. Cierre garantizado de conexiones. Tarifa del cliente resuelta antes del ranking. |
| 15. Último administrador | Transacción y bloqueo común impiden desactivar o degradar al único administrador activo. |

## Base local y despliegue

Aplicada la migración 20261011000100_security_consistency en la base local configurada. La comparación entre BD y schema.prisma devolvió una migración vacía: no hay diferencias estructurales pendientes.

La base tenía una entrada histórica 0_init ausente del repositorio. Se conservaron ese registro y los datos; después de comparar el esquema se marcaron como aplicadas las dos migraciones cuyo contenido ya existía y se desplegó la nueva. El archivo original 0_init sigue sin estar disponible; no se inventó ni eliminó su historial.

En otros entornos ejecutar pnpm db:generate y pnpm --filter=@goldcontinent/database run db:migrate:deploy; si tienen historial distinto, comparar antes de marcar migraciones. Reiniciar servicios al desplegar. Los tokens anteriores a session_version requieren iniciar sesión nuevamente.

Las marcas globales antiguas se conservan como legado; no se atribuyen a usuarios concretos porque no existe información del autor. Las cotizaciones históricas emitidas no se reescriben automáticamente.

## Validación

pnpm check completado correctamente: typecheck, lint sin errores, build de API/web y pruebas Vitest. Resultado: 133 pruebas API y 119 web aprobadas (252 TypeScript); 5 pruebas Python aprobadas. Parte de web se reutilizó de la caché de la ejecución previa satisfactoria; las nuevas pruebas API se ejecutaron completas.

La suite incluye solicitudes HTTP reales contra un servidor Nest temporal y regresiones con PostgreSQL: pagos concurrentes, idempotencia, stock paralelo, auditoría de precios, aislamiento de lecturas, deuda parcial/fechas y correlativos simultáneos. Los registros temporales se eliminan al finalizar.

CI ahora crea PostgreSQL aislado, aplica migraciones y ejecuta estas pruebas junto con las del recomendador Python. Quedan dos avisos de lint de optimización de imágenes existentes; no son errores de compilación.

Estas verificaciones cubren las correcciones descritas. No se realizó despliegue a producción ni una prueba completa de navegación con navegador.

## Comprobación posterior del catálogo IA

Se corrigió la carga local de .env y se retiró únicamente el parámetro Prisma schema del DSN enviado a psycopg2. Ejecución real contra PostgreSQL: 977 productos activos cargados en TF-IDF; producto JLP-28G devolvió 5 similares, 5 upsell y 5 de equilibrio. Se agregó regresión de compatibilidad del DSN.
