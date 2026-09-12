import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateAlmacenDto {
  @ApiProperty({ example: 'ALM001', maxLength: 20 })
  @IsString() @MaxLength(20)
  codigo!: string;

  @ApiProperty({ example: 'Almacén Principal', maxLength: 100 })
  @IsString() @MaxLength(100)
  nombre!: string;

  @ApiPropertyOptional({ example: 'Av. Principal 123', maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  ubicacion?: string;
}