import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransferenciaDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  id_producto!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  id_almacen_origen!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  id_almacen_destino!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  cantidad!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
