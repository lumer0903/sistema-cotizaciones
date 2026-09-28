import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RegistrarPagoDto {
  @ApiProperty({ example: 150.5 })
  @IsNumber()
  @Min(0.01)
  monto!: number;

  @ApiProperty({ example: 'transferencia' })
  @IsString()
  metodo_pago!: string;

  @ApiProperty({ example: 'REF-001', required: false })
  @IsOptional()
  @IsString()
  referencia?: string | null;
}
