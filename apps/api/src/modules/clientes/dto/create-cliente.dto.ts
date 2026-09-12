import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsEnum, IsInt, Min, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPrecio } from '@goldcontinent/shared/constants/enums';

export class CreateClienteDto {
  @ApiProperty({ example: 'Cliente Ejemplo', maxLength: 255 })
  @IsString() @MaxLength(255)
  nombre!: string;

  @ApiPropertyOptional({ example: '999888777', maxLength: 20 })
  @IsOptional() @IsString() @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ example: 'cliente@ejemplo.com', maxLength: 255 })
  @IsOptional() @IsEmail() @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '12345678901', maxLength: 15 })
  @IsOptional() @IsString() @MaxLength(15)
  ruc_dni?: string;

  @ApiPropertyOptional({ enum: TipoPrecio, example: 'normal' })
  @IsOptional() @IsEnum(TipoPrecio)
  tipo?: TipoPrecio;

  @ApiPropertyOptional({ example: 30, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  diasCreditoDefecto?: number;

  @ApiPropertyOptional({ example: 5, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  diasGracia?: number;

  @ApiPropertyOptional({ example: 10000, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  limiteCredito?: number;

  @ApiPropertyOptional({ example: 1.5, minimum: 0 })
  @IsOptional() @Type(() => Number)
  tasaMora?: number;
}