import { OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreateProductoDto } from './create-producto.dto';
export class UpdateProductoDto extends PartialType(OmitType(CreateProductoDto, ['id_almacen'] as const), { skipNullProperties: false }) {
  @ValidateIf((_object,value)=>value!==undefined) @IsBoolean() activo?: boolean;
}
