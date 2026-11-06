import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoVenta } from '@goldcontinent/shared/constants/enums';

export class CreateCotizacionDetalleDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  id_producto!: number;

  @ApiProperty({ enum: TipoVenta, example: 'unidad' })
  @IsEnum(TipoVenta)
  tipo_venta!: TipoVenta;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  cantidad!: number;

  @ApiProperty({ example: 150.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precio_unitario!: number;

  @ApiPropertyOptional({ example: 'Azul rey', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  color_notas?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  es_sugerido_ia?: boolean;
}
