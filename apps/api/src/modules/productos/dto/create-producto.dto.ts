import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  IsNumber,
  IsPositive,
  IsArray,
  ArrayMinSize
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductoDto {
  @ApiProperty({ example: 'PROD001', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  codigo!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  id_categoria!: number;

  @ApiProperty({ example: 'Rosa', minLength: 1 })
  @IsString()
  @MinLength(1)
  tipo_flor!: string;

  @ApiProperty({ example: 'Seda', minLength: 1 })
  @IsString()
  @MinLength(1)
  material!: string;

  @ApiProperty({ example: 'Natural', minLength: 1 })
  @IsString()
  @MinLength(1)
  composicion!: string;

  @ApiProperty({ example: 'Ramo', minLength: 1 })
  @IsString()
  @MinLength(1)
  presentacion!: string;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  numero_cabezas!: number;

  @ApiProperty({ example: '10x20', minLength: 1 })
  @IsString()
  @MinLength(1)
  tamano!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  id_almacen!: number;

  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  unidades_por_caja!: number;

  @ApiProperty({ example: 100, minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock_principal!: number;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock_minimo!: number;

  @ApiProperty({ example: 'Ramo Rosas Seda x 10 cabezas (10x20)', minLength: 5 })
  @IsString()
  @MinLength(5)
  descripcion!: string;

  @ApiPropertyOptional({ example: 'https://example.com/foto.jpg', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  foto_url?: string;

  @ApiProperty({ type: [String], example: ['Rojo', 'Blanco', 'Rosa'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  colores_surtido!: string[];

  // Precios Tienda (Normal)
  @ApiProperty({ example: 15.5, minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  precio_tienda_unidad!: number;

  @ApiProperty({ example: 150.0, minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  precio_tienda_docena!: number;

  @ApiProperty({ example: 1500.0, minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  precio_tienda_caja!: number;

  // Precios Distribuidor
  @ApiProperty({ example: 12.0, minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  precio_distribuidor_unidad!: number;

  @ApiProperty({ example: 120.0, minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  precio_distribuidor_docena!: number;

  @ApiProperty({ example: 1200.0, minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  precio_distribuidor_caja!: number;

  // Costos opcionales (Default 0.00)
  @ApiPropertyOptional({ example: 8.0, minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costo_normal?: number = 0;

  @ApiPropertyOptional({ example: 6.0, minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costo_distribuidor?: number = 0;
}