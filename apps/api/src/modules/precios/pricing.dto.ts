import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ArrayNotEmpty, ArrayMaxSize, ArrayUnique, IsArray, ValidateIf } from 'class-validator';
import { SALE_FIELDS, PRICE_FIELDS } from '../../common/utils/precios.util';
export class PricingQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100000)
    page = 1;
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 50;
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    id_categoria?: number;
    @IsOptional()
    @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
    @IsBoolean()
    activo?: boolean;
    @IsOptional()
    @IsIn(SALE_FIELDS)
    tipo_precio?: typeof SALE_FIELDS[number];
    @ValidateIf((_o, v) => v !== undefined)
    @Transform(({ value }) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : value)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(99999999.99)
    precio_min?: number;
    @ValidateIf((_o, v) => v !== undefined)
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(99999999.99)
    precio_max?: number;
    @IsOptional()
    @IsIn(['agotado', 'bajo', 'disponible'])
    stock_status?: string;
}
export class HistoryQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100000)
    page = 1;
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 50;
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    id_producto?: number;
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    id_usuario?: number;
    @IsOptional()
    @IsIn(PRICE_FIELDS)
    campo_modificado?: string;
    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    fecha_inicio?: string;
    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    fecha_fin?: string;
    @IsOptional()
    @IsString()
    @MaxLength(200)
    cursor?: string;
    @IsOptional()
    @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
    @IsBoolean()
    incluir_total = true;
}
export class BulkPricingDto {
    @IsUUID()
    clave!: string;
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    id_categoria?: number;
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(6)
    @ArrayUnique()
    @IsIn(SALE_FIELDS, { each: true })
    campos!: Array<typeof SALE_FIELDS[number]>;
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(-99.99)
    @Max(1000)
    porcentaje!: number;
    @IsString()
    @MaxLength(300)
    @Matches(/\S.{2,}/)
    motivo!: string;
}
export class PricingCategoriesQueryDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100000)
    page = 1;
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 20;
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;
}
