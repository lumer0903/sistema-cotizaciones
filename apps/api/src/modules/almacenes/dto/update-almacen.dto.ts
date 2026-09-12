import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateAlmacenDto } from './create-almacen.dto';

export class UpdateAlmacenDto extends PartialType(CreateAlmacenDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  activo?: boolean;
}