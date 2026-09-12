import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { CreateClienteDto } from './create-cliente.dto';
import { TipoPrecio } from '@goldcontinent/shared/constants/enums';

export class UpdateClienteDto extends PartialType(CreateClienteDto) {
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