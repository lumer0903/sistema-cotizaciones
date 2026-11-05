import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsIn, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrarAccionIaDto {
  @ApiProperty({ example: 12, description: 'ID de la fila en ia_interacciones devuelta por /recomendar-item' })
  @IsInt() @Min(1) @Type(() => Number)
  id_interaccion!: number;

  @ApiProperty({
    example: 'ACEPTADO',
    enum: ['ACEPTADO', 'RECHAZADO'],
    description: 'ACEPTADO si el asesor agrega/reemplaza el ítem sugerido; RECHAZADO si lo descarta',
  })
  @IsIn(['ACEPTADO', 'RECHAZADO'])
  accion!: 'ACEPTADO' | 'RECHAZADO';

  @ApiPropertyOptional({ example: 55, description: 'Cotización a la que se vincula la decisión (si ya existe borrador)' })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  id_cotizacion?: number;

  @ApiPropertyOptional({ example: 987, description: 'Producto sugerido aceptado/rechazado (ia_interacciones.id_producto_sugerido)' })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  id_producto_sugerido?: number;
}
