import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { VentasService } from './ventas.service';
import type { VentaResponse, PaginatedVentasResponse, CreateVentaDto, UpdateVentaDto } from './ventas.service';
import { EstadoVenta, TipoPago, TipoDocumento } from '@goldcontinent/shared/constants/enums';

@ApiTags('Ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Get()
  @ApiOperation({ summary: 'List all sales with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoVenta })
  @ApiQuery({ name: 'tipoPago', required: false, enum: TipoPago })
  @ApiQuery({ name: 'id_cliente', required: false, type: Number })
  @ApiQuery({ name: 'id_usuario', required: false, type: Number })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('estado') estado?: EstadoVenta,
    @Query('tipoPago') tipoPago?: TipoPago,
    @Query('id_cliente') id_cliente?: string,
    @Query('id_usuario') id_usuario?: string,
    @Query('fecha_inicio') fecha_inicio?: string,
    @Query('fecha_fin') fecha_fin?: string,
  ): Promise<{ success: true; data: PaginatedVentasResponse['data']; total: number; page: number; limit: number }> {
    const result = await this.ventasService.findAll(Number(page), Number(limit), {
      estado,
      tipoPago,
      id_cliente: id_cliente ? Number(id_cliente) : undefined,
      id_usuario: id_usuario ? Number(id_usuario) : undefined,
      fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : undefined,
      fecha_fin: fecha_fin ? new Date(fecha_fin) : undefined,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale by ID with details' })
  async findById(@Param('id') id: string): Promise<{ success: true; data: VentaResponse | null }> {
    const venta = await this.ventasService.findById(Number(id));
    return { success: true, data: venta };
  }

  @Post()
  @ApiOperation({ summary: 'Create new sale' })
  async create(@Body() body: CreateVentaDto): Promise<{ success: true; data: VentaResponse }> {
    const venta = await this.ventasService.create(body);
    return { success: true, data: venta };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sale' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateVentaDto,
  ): Promise<{ success: true; data: VentaResponse }> {
    const venta = await this.ventasService.update(Number(id), body);
    return { success: true, data: venta };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete/Anul sale' })
  async delete(@Param('id') id: string): Promise<{ success: true; message: string }> {
    await this.ventasService.delete(Number(id));
    return { success: true, message: 'Venta anulada correctamente' };
  }
}
