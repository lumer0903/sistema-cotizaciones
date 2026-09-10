import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class AiSuggestionRequestDto {
  @ApiProperty({ example: 'Cliente solicita cotización para 10 docenas de cuadernos y 5 calculadoras científicas' })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiProperty({ example: [1, 5, 23], required: false })
  @IsArray()
  @IsOptional()
  productIds?: number[];
}
