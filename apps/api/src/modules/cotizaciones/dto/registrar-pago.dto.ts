import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago } from '@goldcontinent/shared/constants/enums';

export class RegistrarPagoDto {
  @ApiProperty({ example: 150.5, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  monto!: number;

  @ApiProperty({ enum: MetodoPago, example: 'efectivo' })
  @IsEnum(MetodoPago)
  metodo_pago!: MetodoPago;

  @ApiPropertyOptional({ description: 'Identificador estable de la operación' })
  @IsOptional() @IsString() @MaxLength(100)
  clave_idempotencia?: string;

  @ApiPropertyOptional({ example: 'OPER-12345', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string | null;
}
