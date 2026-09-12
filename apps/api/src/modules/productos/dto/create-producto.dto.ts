import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductoDto {
  @ApiProperty({ example: 'PROD001', maxLength: 50 })
  @IsString() @MaxLength(50)
  codigo!: string;

  @ApiProperty({ example: 'Producto de prueba', maxLength: 255 })
  @IsString() @MaxLength(255)
  descripcion!: string;

  @ApiPropertyOptional({ example: 'https://example.com/foto.jpg', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  foto_url?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  stock_principal?: number;

  @ApiPropertyOptional({ example: 50, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  stock_tacna?: number;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  stock_minimo?: number;

  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  unidades_por_caja?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  id_categoria?: number;
}