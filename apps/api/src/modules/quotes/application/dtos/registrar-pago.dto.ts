import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrarPagoDto {
  @ApiProperty({ example: 500.00, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  monto!: number;

  @ApiProperty({ enum: ['efectivo', 'transferencia', 'tarjeta', 'yape_plin'], example: 'efectivo' })
  @IsEnum(['efectivo', 'transferencia', 'tarjeta', 'yape_plin'])
  metodo_pago!: 'efectivo' | 'transferencia' | 'tarjeta' | 'yape_plin';

  @ApiPropertyOptional({ example: 'OP-123456', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  referencia?: string;
}