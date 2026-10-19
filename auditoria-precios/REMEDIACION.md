# Remediación propuesta
Estos fragmentos no están aplicados. R1 es el parche inmediato; el resto requiere integrar contratos, migraciones y pruebas. Consultar INFORME.md para evidencia y condiciones de negocio.

## R1. PATCH parcial, entradas vacías y fila inexistente
Reemplazar Object.keys(dto) y Number indiscriminado. Usar la misma lista en DTO, servicio e importación:
```ts
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const PRICE_FIELDS = [
  'costo_normal', 'precio_unidad_normal', 'precio_docena_normal',
  'precio_mayor_normal', 'costo_distribuidor', 'precio_unidad_dist',
  'precio_docena_dist', 'precio_mayor_dist',
] as const;
type PriceField = typeof PRICE_FIELDS[number];
type PricePatch = Partial<Record<PriceField, number | string>>;

function money(raw: unknown): Prisma.Decimal {
  if ((typeof raw !== 'number' && typeof raw !== 'string') ||
      (typeof raw === 'string' && !/^\d+(\.\d{1,2})?$/.test(raw)) ||
      (typeof raw === 'number' && !Number.isFinite(raw))) {
    throw new BadRequestException('Importe inválido');
  }
  const value = new Prisma.Decimal(raw);
  if (!value.isFinite() || value.lt(0) || value.gt('99999999.99') ||
      value.decimalPlaces() > 2) {
    throw new BadRequestException('Importe fuera de rango o precisión');
  }
  return value;
}

// El llamador debe abrir $transaction y bloquear el producto antes de leer.
export async function guardarPreciosAuditados(
  tx: Prisma.TransactionClient, id: number,
  patch: PricePatch, actorId: number,
) {
  const entries = PRICE_FIELDS.flatMap(field =>
    patch[field] === undefined ? [] : [[field, money(patch[field])] as const]);
  if (!entries.length) throw new BadRequestException('Sin campos de precio');

  const current = await tx.preciosActuales.findUnique({
    where: { id_producto: id },
  });
  const merged = Object.fromEntries(PRICE_FIELDS.map(field => [
    field, current?.[field] ?? new Prisma.Decimal(0),
  ])) as Record<PriceField, Prisma.Decimal>;
  for (const [field, value] of entries) merged[field] = value;

  // Validar aquí la política sobre merged cuando se haya definido (R7).
  const changed = entries.filter(([field, value]) =>
    !current || !current[field].equals(value));
  if (current && !changed.length) return current;

  const saved = await tx.preciosActuales.upsert({
    where: { id_producto: id },
    create: { id_producto: id, ...merged },
    update: Object.fromEntries(entries),
  });
  if (changed.length) await tx.historialPrecios.createMany({
    data: changed.map(([field, value]) => ({
      id_producto: id, id_usuario: actorId, campo_modificado: field,
      valor_anterior: current?.[field] ?? new Prisma.Decimal(0),
      valor_nuevo: value,
    })),
  });
  return saved;
}
```

El cero anterior de una fila nueva es compatible con el esquema actual, pero es un valor convencional. Para una bitácora fiel agregar tipo_evento=CREACION y permitir anterior=null; registrar los ocho campos iniciales. Evitar describir ese cero como un precio histórico conocido.

En updatePrecios pasar directamente el DTO validado al helper; no construir un objeto usando Number(undefined). Preservar HttpException en el catch antes de envolver errores inesperados. No devolver err.message interno al cliente.

Eliminar IsOptional/Type(Number) para campos monetarios y aplicar este patrón a los ocho:
```ts
import { Transform } from 'class-transformer';
import { IsNumber, Min, Max, ValidateIf } from 'class-validator';

@ValidateIf((_object, value) => value !== undefined)
@Transform(({ value }) =>
  typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value)
    ? Number(value) : value)
@IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
@Min(0)
@Max(99999999.99)
precio_unidad_normal?: number;
```
null, blancos y booleanos permanecen sin convertir y fallan IsNumber. Si el contrato permite cadenas numéricas, documentarlo; si solo permite números JSON, quitar Transform. Alinear create/edit/UI sobre permitir cero.

Regresiones: un solo campo, ocho campos, campo omitido conservado, null/blancos/booleano/NaN rechazados, no-op sin historial, fila inexistente con ceros, rollback ante error de actor, concurrencia y campos desconocidos.

## R2. Todos los escritores, actor e inmutabilidad
Cambiar la importación para usar el helper y el mismo bloqueo dentro de su transacción. Exigir actor de importación, lote y motivo; comprobar actor antes de procesar filas. Cero explícito debe conservarse, ausencia debe ser undefined. La creación de productos debe registrar el evento inicial en esa misma transacción.

Un helper solo garantiza auditoría si todas las escrituras pasan por él. Para garantía frente a SQL/importadores externos, escoger una estrategia de DB: trigger de auditoría con actor obligatorio establecido mediante set_config('app.actor_id', actor, true), o restringir los escritores a un servicio/procedimiento autorizado. Si se elige trigger, retirar el createMany del helper para no duplicar eventos. No usar el actor enviado libremente por el cliente HTTP.

Ejemplo de protección del ledger una vez establecida la política de retención:
```sql
CREATE FUNCTION impedir_mutacion_historial() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'El historial de precios es inmutable';
END;
$$;

CREATE TRIGGER historial_precios_inmutable
BEFORE UPDATE OR DELETE ON historial_precios
FOR EACH ROW EXECUTE FUNCTION impedir_mutacion_historial();
```
Antes de activar, cambiar FK de producto a ON DELETE RESTRICT y acordar retención de usuarios: RESTRICT/soft delete o identidad de actor preservada en el evento. El trigger bloquea también cascadas/SET NULL existentes. Usar un rol de aplicación que no sea propietario; restringir UPDATE/DELETE/TRUNCATE del ledger. El propietario/superusuario puede evadir protecciones, por lo que no prometer inmutabilidad frente al administrador de DB. Crear migración y ensayo de borrados/retención; no ejecutar el SQL sin esa integración.

## R3. Restricciones finitas y campos válidos
Agregar un CHECK BETWEEN 0 AND 99999999.99 a cada una de las ocho columnas actuales. NaN es mayor que los valores finitos en PostgreSQL y falla el límite superior. Ejemplo:
```sql
ALTER TABLE precios_actuales
ADD CONSTRAINT precio_unidad_normal_finito
CHECK (precio_unidad_normal BETWEEN 0 AND 99999999.99) NOT VALID;

ALTER TABLE precios_actuales
VALIDATE CONSTRAINT precio_unidad_normal_finito;

ALTER TABLE historial_precios
ADD CONSTRAINT historial_importes_validos CHECK (
  valor_anterior BETWEEN 0 AND 99999999.99 AND
  valor_nuevo BETWEEN 0 AND 99999999.99
) NOT VALID;

ALTER TABLE historial_precios
ADD CONSTRAINT historial_campo_valido CHECK (
  campo_modificado IN (
    'costo_normal','precio_unidad_normal','precio_docena_normal',
    'precio_mayor_normal','costo_distribuidor','precio_unidad_dist',
    'precio_docena_dist','precio_mayor_dist'
  )
) NOT VALID;
```
Primero inspeccionar registros heredados y remediarlos; después VALIDATE ambas restricciones de historial. Para eventos iniciales anterior=null, cambiar deliberadamente la nulabilidad y regla según tipo_evento. No actualizar eventos existentes para “corregirlos”: registrar una rectificación separada.

## R4. Margen correcto, sin división por cero
```python
from decimal import Decimal, ROUND_HALF_UP

def calcular_margen(precio, costo):
    p, c = Decimal(str(precio)), Decimal(str(costo))
    if not p.is_finite() or not c.is_finite() or p < 0 or c < 0:
        raise ValueError("Precio/costo inválidos")
    if p == 0:
        return None
    return float(((p - c) / p * Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP))
```
Cambiar los modelos Pydantic/TypeScript y consumidores para permitir margen=null y presentar “No definido”. Actualizar ranking de recomendaciones para manejar null explícitamente. Conservar Decimal desde la lectura; no convertir primero a float. No ocultar pérdidas con max(0, margen).

Esperados: 100/80→20; 100/0→100; 0/0 y 0/10→null; 10/15→−50; 10/10→0; 0.03/0.02→33.33.

## R5. Historial validado, completo y exacto
Agregar HistorialPreciosQueryDto para page/limit enteros positivos (limit máximo100), id_producto/id_usuario enteros positivos, campo de lista permitida y fechas válidas. Usar @Query() dto con whitelist/forbidNonWhitelisted, para que take desconocido o id_producto=NaN produzcan 400. Validar fin>=inicio. Mantener page/limit como nombres únicos o aceptar take explícitamente como alias documentado.

Para contrato de días calendario de Lima:
```ts
function limaDay(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new BadRequestException('Fecha YYYY-MM-DD requerida');
  const midnightUtc = new Date(date + 'T00:00:00.000Z');
  if (!Number.isFinite(midnightUtc.getTime()) ||
      midnightUtc.toISOString().slice(0, 10) !== date)
    throw new BadRequestException('Fecha inválida');
  return new Date(midnightUtc.getTime() + 5 * 60 * 60 * 1000);
}
const start = dto.fecha_inicio ? limaDay(dto.fecha_inicio) : undefined;
const end = dto.fecha_fin
  ? new Date(limaDay(dto.fecha_fin).getTime() + 86_400_000) : undefined;
if (start && end && start >= end)
  throw new BadRequestException('Rango inválido');
const where: Prisma.HistorialPreciosWhereInput = {
  id_producto: dto.id_producto,
  id_usuario: dto.id_usuario,
  campo_modificado: dto.campo,
  ...(start || end ? { fecha_cambio: { gte: start, lt: end } } : {}),
};
const [data, total] = await prisma.$transaction([
  prisma.historialPrecios.findMany({
    where, skip: (dto.page - 1) * dto.limit, take: dto.limit,
    orderBy: [{ fecha_cambio: 'desc' }, { id_historial: 'desc' }],
    // Mantener select de producto/actor existente, sin bucles de consultas.
  }),
  prisma.historialPrecios.count({ where }),
], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
return { data, total, page: dto.page, limit: dto.limit };
```
Reutilizar la utilidad de fechas del proyecto si ya cumple estas reglas. El ejemplo presupone que timestamp sin zona almacena instantes UTC; verificar/migrar esa convención antes. Para zonas con horario estacional usar librería de zona IANA. Detalle inexistente: throw new NotFoundException.

Cliente: getHistorialPrecios debe retornar el sobre, recibir page/limit/fechas y no descargar todas las páginas. Abrir el modal al seleccionar producto, mostrar loading/error/empty por separado y permitir reintentar. Solo asociar una respuesta al id_producto y a los filtros que la solicitaron; usar AbortController y/o contador de solicitudes.

## R6. Consulta remota, permisos y ajustes masivos
Crear GET /api/precios con permiso consulta_precios y DTO:
page, limit<=100, search, id_categoria, activo, tipo_precio (enum de seis columnas), precio_min/max. Resolver el campo por un mapa permitido, nunca interpolar un nombre arbitrario en SQL. No devolver costos sin permiso explícito. WHERE debe incluir producto no eliminado, categoría/actividad/búsqueda y rango del campo elegido. Usar select mínimo y findMany/count con snapshot. Parámetros desconocidos deben fallar con400.

En React mantener una sola página y debouncing:
```tsx
const debouncedSearch = useDebounce(search, 300);
const params = new URLSearchParams({
  page: String(page), limit: '50', search: debouncedSearch,
  tipo_precio: tipoPrecio,
});
// El hook de consulta cancela la petición anterior y expone
// { data, total, loading, error, retry }; no recorre todas las páginas.
const result = usePreciosPage(params.toString());
```
Reiniciar page al cambiar filtros; cachear por clave completa; comprobar HTTP antes de interpretar datos y distinguir400/403/500. Usar Skeleton, estado vacío y error persistente con reintento. Implementar el hook o adaptar uno existente; el fragmento no supone que ya exista.

Para POST /api/precios/ajustes-masivos: DTO con categoría/selección, tarifa(s), porcentaje finito mayor que−100 y tope superior definido por negocio, actor desde JWT e idempotency key. Crear un trabajo con selección/versiones fijadas y resultado por producto, evitando descargar todo a Node.
```ts
const factor = new Prisma.Decimal(1)
  .plus(new Prisma.Decimal(porcentaje).div(100));
const nuevo = anterior.mul(factor)
  .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
// Validar nuevo y política de jerarquía/costo tras redondeo.
// En transacción: bloquear productos en orden de id,
// reclamar clave única (trabajo, producto), actualizar y auditar.
```
Procesar lotes acotados y declarar que la atomicidad es por lote/producto. Si se exige todo-o-nada para una categoría completa, diseñar publicación de versiones o transacción específica, sin anunciar atomicidad global de un trabajo por lotes. La clave única debe registrarse en la misma transacción; repetir una solicitud no debe aplicar otra vez el porcentaje. Exponer progreso/fallos y prueba de concurrencia.

## R7. Política de jerarquía, ausencia y UI compartida
Confirmar si docena/mayor representan importe por unidad o total de paquete. Solo en el primer caso:
```ts
function validateHierarchy(unit: Prisma.Decimal,
  dozen: Prisma.Decimal, wholesale: Prisma.Decimal) {
  if (unit.lt(dozen) || dozen.lt(wholesale))
    throw new BadRequestException('Jerarquía de tarifas inválida');
}
```
Aplicar a ambas familias después de fusionar PATCH+estado actual, dentro del bloqueo. Si se prohíbe vender bajo costo, validar cada tarifa contra su costo; promociones requieren excepción explícita, permiso, motivo y auditoría. Alinear Zod y backend y asociar errores a campos.

En PriceMatrix sustituir input por Input de @/components/ui preservando register, etiquetas, step=.01 y errores. Representar ausencia como null; formatear solo valores finitos. Mantener timestamp ISO completo y presentar fecha/hora con timeZone: 'America/Lima'. Quitar SKU de ejemplo del modal: usar el producto seleccionado o un estado sin dato.

## Validación requerida al implementar
1. Pruebas de regresión de todos los casos P01–P12.
2. Integración API+PostgreSQL de todas las rutas escritoras, incluso importación y creación.
3. Dos ediciones simultáneas; rollback entre escritura y auditoría; reintento masivo idempotente.
4. Pruebas de permiso sin fuga de costos y de rango temporal con eventos al inicio/fin del día.
5. UI con carga/error/403/vacío, cambio rápido de producto y segunda página del historial.
6. EXPLAIN y carga HTTP con 10000 productos/100000+ eventos, concurrencia y p50/p95/p99. Medir antes de decidir índices adicionales.
