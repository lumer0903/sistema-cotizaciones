import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, ValidateIf, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePreciosDto {
  @ApiPropertyOptional({ example: 10.5, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0) @Max(99999999.99)
  @Transform(({value}) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : value)
  costo_normal?: number;

  @ApiPropertyOptional({ example: 15.0, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0) @Max(99999999.99)
  @Transform(({value}) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : value)
  precio_unidad_normal?: number;

  @ApiPropertyOptional({ example: 160.0, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0) @Max(99999999.99)
  @Transform(({value}) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : value)
  precio_docena_normal?: number;

  @ApiPropertyOptional({ example: 140.0, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0) @Max(99999999.99)
  @Transform(({value}) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : value)
  precio_mayor_normal?: number;

  @ApiPropertyOptional({ example: 9.0, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0) @Max(99999999.99)
  @Transform(({value}) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : value)
  costo_distribuidor?: number;

  @ApiPropertyOptional({ example: 13.0, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0) @Max(99999999.99)
  @Transform(({value}) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : value)
  precio_unidad_dist?: number;

  @ApiPropertyOptional({ example: 140.0, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0) @Max(99999999.99)
  @Transform(({value}) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : value)
  precio_docena_dist?: number;

  @ApiPropertyOptional({ example: 120.0, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0) @Max(99999999.99)
  @Transform(({value}) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : value)
  precio_mayor_dist?: number;
}