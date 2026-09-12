import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsInt, Min, IsEnum, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoVenta, TipoPrecio, MetodoPago } from '@goldcontinent/shared/constants/enums';

export class CreateQuoteDetalleDto {
  @ApiProperty({ example: 1 })
  @IsInt() @Min(1) @Type(() => Number)
  id_producto!: number;

  @ApiProperty({ enum: TipoVenta, example: 'unidad' })
  @IsEnum(TipoVenta)
  tipo_venta!: TipoVenta;

  @ApiProperty({ example: 10 })
  @IsInt() @Min(1) @Type(() => Number)
  cantidad!: number;

  @ApiPropertyOptional({ example: 'Color rojo', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  color_notas?: string;

  @ApiProperty({ example: 15.50 })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Type(() => Number)
  precio_unitario!: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @Type(() => Boolean)
  es_sugerido_ia?: boolean;
}

export class CreateQuoteDto {
  @ApiProperty({ example: 1 })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  id_cliente?: number;

  @ApiProperty({ enum: TipoPrecio, example: 'normal' })
  @IsOptional() @IsEnum(TipoPrecio)
  tipo_precio?: TipoPrecio;

  @ApiPropertyOptional({ example: 'Observaciones de la cotización', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  observaciones?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @Type(() => Boolean)
  incluye_carreta?: boolean;

  @ApiPropertyOptional({ example: 15.00 })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Type(() => Number)
  costo_carreta?: number;

  @ApiProperty({ type: [CreateQuoteDetalleDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateQuoteDetalleDto)
  detalle!: CreateQuoteDetalleDto[];
}

export class UpdateQuoteStateDto {
  @ApiProperty({ enum: ['enviada', 'aprobada', 'rechazada', 'parcialmente_pagada'], example: 'enviada' })
  @IsEnum(['enviada', 'aprobada', 'rechazada', 'parcialmente_pagada'])
  estado!: 'enviada' | 'aprobada' | 'rechazada' | 'parcialmente_pagada';

  @ApiPropertyOptional({ example: 1, description: 'ID del almacén para descontar stock (requerido si estado=aprobada)' })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  id_almacen?: number;

  @ApiPropertyOptional({ example: 'credito', enum: ['contado', 'credito'], description: 'Tipo de pago si estado=aprobada' })
  @IsOptional() @IsEnum(['contado', 'credito'])
  tipoPago?: 'contado' | 'credito';

  @ApiPropertyOptional({ example: 30, description: 'Días de plazo si tipoPago=credito' })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  diasPlazo?: number;
}

export class RegistrarPagoDto {
  @ApiProperty({ example: 500.00, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  monto!: number;

  @ApiProperty({ enum: MetodoPago, example: 'efectivo' })
  @IsEnum(MetodoPago)
  metodo_pago!: MetodoPago;

  @ApiPropertyOptional({ example: 'OP-123456', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  referencia?: string;
}