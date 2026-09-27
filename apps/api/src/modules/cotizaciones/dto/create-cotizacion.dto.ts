import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
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
  @MaxLength(50)
  numero?: string;

  @ApiProperty({ type: [CreateCotizacionDetalleDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateCotizacionDetalleDto)
  detalle!: CreateCotizacionDetalleDto[];
}
