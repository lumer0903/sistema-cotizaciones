import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min, MaxLength, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMovimientoInventario, OrigenMovimiento } from '@goldcontinent/shared/constants/enums';

export class CreateMovimientoDto {
  @ApiProperty({ example: 1 })
  @IsInt() @Type(() => Number)
  id_producto!: number;

  @ApiProperty({ example: 1 })
  @IsInt() @Type(() => Number)
  id_almacen!: number;

  @ApiProperty({ enum: TipoMovimientoInventario, example: 'entrada' })
  @IsEnum(TipoMovimientoInventario)
  tipo!: TipoMovimientoInventario;

  @ApiProperty({ enum: OrigenMovimiento, example: 'compra' })
  @IsEnum(OrigenMovimiento)
  origen!: OrigenMovimiento;

  @ApiProperty({ example: 100 })
  @IsInt() @Min(1) @Type(() => Number)
  cantidad!: number;

  @ApiPropertyOptional({ example: 15.50 })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Type(() => Number)
  costo_unitario?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsInt() @Type(() => Number)
  id_referencia?: number;

  @ApiPropertyOptional({ example: 'venta', maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  tipo_referencia?: string;

  @ApiPropertyOptional({ example: 'Compra inicial de stock', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  observaciones?: string;
}