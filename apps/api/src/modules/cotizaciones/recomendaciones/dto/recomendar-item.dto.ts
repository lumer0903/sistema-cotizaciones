import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class RecomendarItemDto {
  @ApiProperty({ example: 1, description: 'ID del producto base para buscar recomendaciones' })
  @IsInt() @Min(1) @Type(() => Number)
  id_producto_base!: number;

  @ApiPropertyOptional({ example: 1, description: 'ID del cliente para determinar tipo de precio (normal/distribuidor)' })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  id_cliente?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID del almacén para consultar stock específico' })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  id_almacen?: number;

  @ApiPropertyOptional({ example: 'distribuidor', description: 'Tipo de precio explícito (normal/distribuidor). Tiene prioridad sobre el tipo del cliente.' })
  @IsOptional() @IsIn(['normal', 'distribuidor'])
  tipo_precio?: 'normal' | 'distribuidor';
}