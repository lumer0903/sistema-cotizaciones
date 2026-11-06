import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EstadoCotizacion } from '@goldcontinent/shared/constants/enums';

export class CambiarEstadoDto {
  @ApiProperty({ enum: EstadoCotizacion, example: 'enviada' })
  @IsEnum(EstadoCotizacion)
  estado!: EstadoCotizacion;
}
