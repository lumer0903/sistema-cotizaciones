import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '@goldcontinent/shared/constants/enums';
import { HistorialPreciosService, HistorialPrecioResponse, PaginatedHistorialPreciosResponse } from './historial-precios.service';

@ApiTags('HistorialPrecios')
@ApiBearerAuth()
// Las variaciones de precio sólo las consulta admin/gerente; el vendedor
// ve la tabla de precios actuales (módulo consulta_precios).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin, Rol.gerente)
@Controller('historial-precios')
export class HistorialPreciosController {
  constructor(private readonly historialPreciosService: HistorialPreciosService) {}

  @Get()
  @ApiOperation({ summary: 'List price history with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'id_producto', required: false, type: Number })
  @ApiQuery({ name: 'id_usuario', required: false, type: Number })
  @ApiQuery({ name: 'campo_modificado', required: false, type: String })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('id_producto') id_producto?: string,
    @Query('id_usuario') id_usuario?: string,
    @Query('campo_modificado') campo_modificado?: string,
    @Query('fecha_inicio') fecha_inicio?: string,
    @Query('fecha_fin') fecha_fin?: string,
  ): Promise<{ success: true; data: PaginatedHistorialPreciosResponse['data']; total: number; page: number; limit: number }> {
    const result = await this.historialPreciosService.findAll(
      Math.max(1, Number(page) || 1),
      Math.min(Math.max(1, Number(limit) || 50), 100),
      {
      id_producto: id_producto ? Number(id_producto) : undefined,
      id_usuario: id_usuario ? Number(id_usuario) : undefined,
      campo_modificado,
      fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : undefined,
      fecha_fin: fecha_fin ? new Date(fecha_fin) : undefined,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get price history entry by ID' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: HistorialPrecioResponse | null }> {
    const historial = await this.historialPreciosService.findById(id);
    return { success: true, data: historial };
  }
}