import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsOptional()
  id_cliente?: number;

  @ApiProperty({ example: 'Observaciones de la cotización' })
  @IsString()
  @IsOptional()
  observaciones?: string;
  
  @ApiProperty({ example: 100.5 })
  @IsNumber()
  subtotal!: number;

  @ApiProperty({ example: 18.09 })
  @IsNumber()
  igv!: number;

  @ApiProperty({ example: 118.59 })
  @IsNumber()
  total!: number;
}
