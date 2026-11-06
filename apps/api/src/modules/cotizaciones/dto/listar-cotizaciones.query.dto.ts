import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';

export class ListarCotizacionesQueryDto {
  @ApiPropertyOptional({ example: 'COT-001', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buscar?: string;

  @ApiPropertyOptional({ example: '2026-09-26' })
  @IsOptional()
  @IsString()
  fecha?: string;

  @ApiPropertyOptional({ enum: EstadoCotizacion })
  @IsOptional()
  @IsEnum(EstadoCotizacion)
  estado?: EstadoCotizacion;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  id_cliente?: number;
}
