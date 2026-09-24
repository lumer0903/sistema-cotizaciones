import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '@goldcontinent/shared/constants/enums';
import { AlmacenesService } from './almacenes.service';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';
import type { AlmacenResponse, PaginatedAlmacenesResponse } from './almacenes.service';

@ApiTags('Almacenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin, Rol.gerente)
@Controller('almacenes')
export class AlmacenesController {
  constructor(private readonly almacenesService: AlmacenesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar almacenes con paginación, búsqueda y filtro activo' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
    @Query('activo') activo?: string,
  ): Promise<{ success: true; data: PaginatedAlmacenesResponse['data']; total: number; page: number; limit: number }> {
    const result = await this.almacenesService.findAll(Number(page), Number(limit), search, activo === 'true');
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener almacén por ID' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: AlmacenResponse | null }> {
    const almacen = await this.almacenesService.findById(id);
    return { success: true, data: almacen };
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo almacén' })
  async create(@Body() body: CreateAlmacenDto): Promise<{ success: true; data: AlmacenResponse }> {
    const almacen = await this.almacenesService.create(body);
    return { success: true, data: almacen };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar almacén' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAlmacenDto,
  ): Promise<{ success: true; data: AlmacenResponse }> {
    const almacen = await this.almacenesService.update(id, body);
    return { success: true, data: almacen };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar almacén (solo si no tiene stock ni movimientos)' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; message: string }> {
    await this.almacenesService.delete(id);
    return { success: true, message: 'Almacén eliminado correctamente' };
  }
}