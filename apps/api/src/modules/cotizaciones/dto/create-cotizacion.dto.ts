import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPrecio } from '@goldcontinent/shared/constants/enums';
import { CreateCotizacionDetalleDto } from './create-cotizacion-detalle.dto';

export class CreateCotizacionDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  id_cliente!: number;

  @ApiPropertyOptional({ enum: TipoPrecio, default: 'normal' })
  @IsOptional()
  @IsEnum(TipoPrecio)
  tipo_precio?: TipoPrecio;

  @ApiPropertyOptional({ example: 'Entrega en 3 días', nullable: true })
  @IsOptional()
  @IsString()
  observaciones?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  incluye_carreta?: boolean;

  @ApiPropertyOptional({ example: 15, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costo_carreta?: number;

  @ApiPropertyOptional({ example: 'COT-001', maxLength: 50 })
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional({
    example: '2026-10-15',
    nullable: true,
    description: 'Fecha de vencimiento del crédito, fijada por el asesor de ventas',
  })
  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string | null;

  @ApiProperty({ type: [CreateCotizacionDetalleDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateCotizacionDetalleDto)
  detalle!: CreateCotizacionDetalleDto[];
}
