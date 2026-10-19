import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { AlertaEstado, OrigenMovimiento, TipoMovimiento } from '@prisma/client';
export class PageQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit = 50;
}
export class ProductIncludeQueryDto {
  @IsOptional() @IsString() @Matches(/^(precios|categoria|stock)(,(precios|categoria|stock))*$/)
  include?: string;
}
export class ProductsQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) id_categoria?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) id_almacen?: number;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(['agotado','bajo','disponible']) stock_status?: 'agotado'|'bajo'|'disponible';
  @IsOptional() @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  @IsBoolean() activo?: boolean;
  @IsOptional() @IsString() @Matches(/^(precios|categoria|stock)(,(precios|categoria|stock))*$/) include?: string;
  @IsOptional() @IsIn(['created_at','stock_estado']) sortBy?: 'created_at'|'stock_estado';
  @IsOptional() @IsIn(['asc','desc']) sortOrder?: 'asc'|'desc';
}
export class MovementFilterDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) id_producto?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) id_almacen?: number;
  @IsOptional() @IsEnum(TipoMovimiento) tipo?: TipoMovimiento;
  @IsOptional() @IsEnum(OrigenMovimiento) origen?: OrigenMovimiento;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha_inicio?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha_fin?: string;
}
export class MovementsQueryDto extends MovementFilterDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(500) limit = 50;
}
export class StockQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) id_producto?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) id_almacen?: number;
  @IsOptional() @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  @IsBoolean() soloBajoMinimo?: boolean;
}
export class AlertsQueryDto extends PageQueryDto {
  @IsOptional() @IsIn([...Object.values(AlertaEstado),'todas','abiertas'])
  estado?: AlertaEstado|'todas'|'abiertas';
}
