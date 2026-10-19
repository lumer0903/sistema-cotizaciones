# Correcciones propuestas de consultas

Complemento del INFORME.md. No aplicadas ni compiladas. Integrar DTO, controlador, servicio y contrato compartido juntos.

## DTO

~~~ts
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export class ProductosQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) id_categoria?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) id_almacen?: number;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(['agotado','bajo','disponible'])
  stock_status?: 'agotado'|'bajo'|'disponible';
  @IsOptional()
  @Transform(({value}) => value === 'true' ? true : value === 'false' ? false : value)
  @IsBoolean() activo?: boolean;
}
~~~

Recibir @Query() q: ProductosQueryDto. Añadir include validado si se necesita mantener inclusiones opcionales; el ejemplo siguiente incluye relaciones de inventario siempre. Actualizar UI a stock_status y disponible; retirar sortBy/sortOrder ignorados. Si activo omitido debe significar solo activos, cambiar default y documentarlo.

## Catálogo: filtros antes de paginar y stock del almacén seleccionado

~~~ts
import { Prisma } from '@prisma/client';
async findAll(q: ProductosQueryDto) {
  const warehouse = q.id_almacen ?? null;
  const category = q.id_categoria ?? null;
  const active = q.activo ?? null;
  const pattern = q.search?.trim() ? '%' + q.search.trim() + '%' : null;
  const scoped = Prisma.sql`
    SELECT p.id_producto,p.created_at,p.stock_minimo,
      CASE WHEN ${warehouse}::int IS NULL THEN p.stock_total
           ELSE COALESCE(s.cantidad,0) END AS stock_scope
    FROM productos p
    LEFT JOIN stock_actual s ON s.id_producto=p.id_producto
      AND s.id_almacen=${warehouse}::int
    WHERE p.deleted_at IS NULL
      AND (${category}::int IS NULL OR p.id_categoria=${category}::int)
      AND (${active}::boolean IS NULL OR p.activo=${active}::boolean)
      AND (${warehouse}::int IS NULL OR s.id_stock IS NOT NULL)
      AND (${pattern}::text IS NULL OR p.codigo ILIKE ${pattern}::text
        OR p.descripcion ILIKE ${pattern}::text)
  `;
  const condition = q.stock_status === 'agotado' ? Prisma.sql`stock_scope=0`
    : q.stock_status === 'bajo' ? Prisma.sql`stock_scope>0 AND stock_scope<=stock_minimo`
    : q.stock_status === 'disponible' ? Prisma.sql`stock_scope>stock_minimo`
    : Prisma.sql`TRUE`;
  return this.prisma.$transaction(async tx => {
    const counts = await tx.$queryRaw<Array<{total:bigint}>>(Prisma.sql`
      WITH scoped AS (${scoped})
      SELECT count(*) AS total FROM scoped WHERE ${condition}
    `);
    const rows = await tx.$queryRaw<Array<{id_producto:number;stock_scope:number}>>(Prisma.sql`
      WITH scoped AS (${scoped})
      SELECT id_producto,stock_scope FROM scoped WHERE ${condition}
      ORDER BY (stock_scope<=stock_minimo) DESC,stock_scope ASC,created_at DESC,id_producto DESC
      LIMIT ${q.limit} OFFSET ${(q.page-1)*q.limit}
    `);
    const products = await tx.producto.findMany({
      where:{id_producto:{in:rows.map(p=>p.id_producto)}},
      include:{categoria:true,precios_actuales:true,stock_actual:{include:{almacen:true}}},
    });
    const byId = new Map(products.map(p=>[p.id_producto,p]));
    return {
      data:rows.map(row=>({...mapProducto(byId.get(row.id_producto)!),stock_filtrado:row.stock_scope})),
      total:Number(counts[0].total),page:q.page,limit:q.limit,
    };
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
~~~

Devuelve solo IDs paginados y luego hidrata esa página; no descarga IDs de todo el catálogo. Añadir stock_filtrado al contrato y mostrarlo cuando se elija almacén. stock_total sigue siendo global. La política bajo excluye cero; agotado se consulta aparte. Para alertas, <= mínimo incluye cero.

Pertenencia al almacén significa fila stock_actual existente; para incluir ausentes como cero, retirar s.id_stock IS NOT NULL y probar esa regla explícitamente. ILIKE conserva comodines %/_ actuales; si búsqueda debe ser literal, escaparlos. El orden calculado puede requerir sort: medir antes de prometer rendimiento.

## GET stock: JOIN y paginación real

StockQueryDto requiere id_producto/id_almacen positivos opcionales, soloBajoMinimo boolean estricto, page/limit enteros como arriba. Controlador debe devolver {success:true,...result}; actualizar cliente para enviar page/limit.

~~~ts
async getStockActual(q: StockQueryDto) {
  const product=q.id_producto??null, warehouse=q.id_almacen??null;
  const onlyLow=q.soloBajoMinimo??false;
  const base=Prisma.sql`
    FROM stock_actual s
    JOIN productos p ON p.id_producto=s.id_producto
    JOIN almacenes a ON a.id_almacen=s.id_almacen
    WHERE p.deleted_at IS NULL
      AND (${product}::int IS NULL OR s.id_producto=${product}::int)
      AND (${warehouse}::int IS NULL OR s.id_almacen=${warehouse}::int)
      AND (NOT ${onlyLow}::boolean OR s.cantidad<=p.stock_minimo)
  `;
  return this.prisma.$transaction(async tx=>{
    const counts=await tx.$queryRaw<Array<{total:bigint}>>(Prisma.sql`
      SELECT count(*) AS total ${base}
    `);
    const data=await tx.$queryRaw<Array<{
      id_producto:number;codigo:string;descripcion:string;id_almacen:number;
      almacen_codigo:string;almacen_nombre:string;cantidad:number;stock_minimo:number;
      estado:'sin_stock'|'bajo_minimo'|'normal';
    }>>(Prisma.sql`
      SELECT s.id_producto,p.codigo,p.descripcion,s.id_almacen,
        a.codigo AS almacen_codigo,a.nombre AS almacen_nombre,s.cantidad,p.stock_minimo,
        CASE WHEN s.cantidad=0 THEN 'sin_stock'
          WHEN s.cantidad<=p.stock_minimo THEN 'bajo_minimo' ELSE 'normal' END AS estado
      ${base} ORDER BY s.id_producto,s.id_almacen
      LIMIT ${q.limit} OFFSET ${(q.page-1)*q.limit}
    `);
    return {data,total:Number(counts[0].total),page:q.page,limit:q.limit};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
~~~

Aplicar límites también a alertas y validar sus estados. La política de inactivos debe ser coherente entre catálogo y reportes; este ejemplo excluye eliminados y permite inactivos.

## Endpoint faltante y detalle inexistente

~~~ts
@Get('movimientos')
async getMovimientos(@Query() q: MovimientosQueryDto) {
  // DTO derivado de KardexQueryDto con id_producto positivo opcional.
  // Refactorizar servicio con rangoFechas(q), lt exclusivo y orden con ID.
  return {success:true,...await this.inventarioService.getMovimientosValidados(q)};
}
// ProductosService.findById:
if (!item) throw new NotFoundException('Producto no encontrado');
~~~

getMovimientosValidados es el método que debe implementarse al adaptar el existente; no existe aún. Retirar actualizarStock legacy sin consumidores o migrarlo a ajuste auditable con actor, bloqueo y transacción.
