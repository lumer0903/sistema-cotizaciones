import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Rol } from '@goldcontinent/shared/constants/enums';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { ConfiguracionService } from './configuracion.service';

class UpdateConfiguracionDto {
  @ApiProperty({ example: 'empresa_nombre' })
  @IsString() @MaxLength(100)
  clave!: string;

  @ApiProperty({ example: 'Gold Continent E.I.R.L.' })
  @IsString() @MaxLength(500)
  valor!: string;

  @ApiProperty({ example: 'Nombre comercial', required: false })
  @IsOptional() @IsString() @MaxLength(255)
  descripcion?: string;
}

@ApiTags('Configuración')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las claves de configuración' })
  async getAll(): Promise<{ success: true; data: Record<string, string> }> {
    const data = await this.configuracionService.getAll();
    return { success: true, data };
  }

  @Put()
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Crear o actualizar una clave de configuración (solo admin)' })
  async set(@Body() body: UpdateConfiguracionDto): Promise<{ success: true; message: string }> {
    await this.configuracionService.set(body.clave, body.valor, body.descripcion);
    return { success: true, message: 'Configuración guardada correctamente' };
  }
}
