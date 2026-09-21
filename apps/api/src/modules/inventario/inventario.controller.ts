import { Controller, Get, Post, Query, Body, Param, UseGuards, Req, ParseIntPipe, Res, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { InventarioService } from './inventario.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import type { MovimientoResponse, KardexResponse } from './inventario.service';
import { TipoMovimientoInventario, OrigenMovimiento } from '@goldcontinent/shared/constants/enums';
import { TipoMovimiento, OrigenMovimiento as PrismaOrigenMovimiento } from '@prisma/client';
import type { Response } from 'express';

@ApiTags('Inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Post('movimientos')
  @ApiOperation({ summary: 'Registrar movimiento de inventario (entrada/salida/ajuste)' })
  async createMovimiento(
    @Body() body: CreateMovimientoDto,
    @Req() req: Request & { user: { id_usuario: number; id?: number } },
  ): Promise<{ success: true; data: MovimientoResponse }> {
    const userId = req.user.id_usuario ?? req.user.id;
    const movimiento = await this.inventarioService.createMovimiento(body, userId);
    return { success: true, data: movimiento };
  }

  @Post('transferencia')
  @ApiOperation({ summary: 'Realizar transferencia entre almacenes' })
  async createTransferencia(
    @Body()
    body: {
      id_producto: number;
      id_almacen_origen: number;
      id_almacen_destino: number;
      cantidad: number;
      observaciones?: string;
    },
    @Req() req: Request & { user: { id_usuario: number; id?: number } },
  ): Promise<{ success: true; data: { salida: MovimientoResponse; entrada: MovimientoResponse } }> {
    const userId = req.user.id_usuario ?? req.user.id;
    const result = await this.inventarioService.createTransferencia(
      body.id_producto,
      body.id_almacen_origen,
      body.id_almacen_destino,
      body.cantidad,
      userId,
      body.observaciones,
    );
    return { success: true, data: result };
  }

  @Get('kardex/:id_producto/export')
  @ApiOperation({ summary: 'Exportar kardex a CSV' })
  @ApiQuery({ name: 'id_almacen', required: false, type: Number })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoMovimientoInventario })
  @ApiQuery({ name: 'origen', required: false, enum: OrigenMovimiento })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  async exportKardex(
    @Param('id_producto', ParseIntPipe) id_producto: number,
    @Query('id_almacen') id_almacen?: string,
    @Query('tipo') tipo?: TipoMovimientoInventario,
    @Query('origen') origen?: OrigenMovimiento,
    @Query('fecha_inicio') fecha_inicio?: string,
    @Query('fecha_fin') fecha_fin?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const result = await this.inventarioService.getKardex(id_producto, {
      id_almacen: id_almacen ? Number(id_almacen) : undefined,
      tipo,
      origen,
      fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : undefined,
      fecha_fin: fecha_fin ? new Date(fecha_fin) : undefined,
      page: 1,
      limit: 10000, // Límite alto para exportación
    });

    const headers = [
      'Fecha',
      'Tipo',
      'Origen',
      'Cantidad',
      'Stock Anterior',
      'Stock Posterior',
      'Costo Unitario',
      'Referencia',
      'Usuario',
      'Observaciones',
    ];

    const rows = result.data.map(m => [
      m.fecha.toISOString().split('T')[0],
      m.tipo,
      m.origen,
      m.cantidad.toString(),
      m.stock_anterior.toString(),
      m.stock_posterior.toString(),
      m.costo_unitario?.toString() ?? '',
      m.referencia ?? '',
      m.usuario ?? '',
      m.observaciones ?? '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    if (res) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="kardex-${id_producto}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    }
  }

  @Get('kardex/:id_producto')
  @ApiOperation({ summary: 'Obtener kardex (historial de movimientos) de un producto' })
  @ApiQuery({ name: 'id_almacen', required: false, type: Number })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoMovimientoInventario })
  @ApiQuery({ name: 'origen', required: false, enum: OrigenMovimiento })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getKardex(
    @Param('id_producto', ParseIntPipe) id_producto: number,
    @Query('id_almacen') id_almacen?: string,
    @Query('tipo') tipo?: TipoMovimientoInventario,
    @Query('origen') origen?: OrigenMovimiento,
    @Query('fecha_inicio') fecha_inicio?: string,
    @Query('fecha_fin') fecha_fin?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 100,
  ): Promise<{ success: true; data: KardexResponse[]; total: number; page: number; limit: number }> {
    const result = await this.inventarioService.getKardex(id_producto, {
      id_almacen: id_almacen ? Number(id_almacen) : undefined,
      tipo,
      origen,
      fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : undefined,
      fecha_fin: fecha_fin ? new Date(fecha_fin) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
    return { success: true, ...result };
  }

  @Get('stock')
  @ApiOperation({ summary: 'Obtener stock actual por producto/almacén' })
  @ApiQuery({ name: 'id_producto', required: false, type: Number })
  @ApiQuery({ name: 'id_almacen', required: false, type: Number })
  @ApiQuery({ name: 'soloBajoMinimo', required: false, type: Boolean })
  async getStockActual(
    @Query('id_producto') id_producto?: string,
    @Query('id_almacen') id_almacen?: string,
    @Query('soloBajoMinimo') soloBajoMinimo?: string,
  ) {
    const data = await this.inventarioService.getStockActual({
      id_producto: id_producto ? Number(id_producto) : undefined,
      id_almacen: id_almacen ? Number(id_almacen) : undefined,
      soloBajoMinimo: soloBajoMinimo === 'true',
    });
    return { success: true, data };
  }

  @Get('alertas')
  @ApiOperation({ summary: 'Obtener alertas de stock' })
  @ApiQuery({ name: 'estado', required: false, enum: ['activa', 'resuelta'] })
  async getAlertas(
    @Query('estado') estado?: 'activa' | 'resuelta',
  ) {
    const data = await this.inventarioService.getAlertasStock(estado);
    return { success: true, data };
  }

  @Patch('alertas/:id_alerta/reconocer')
  @ApiOperation({ summary: 'Reconocer alerta de stock' })
  async reconocerAlerta(
    @Param('id_alerta', ParseIntPipe) id_alerta: number,
  ) {
    const data = await this.inventarioService.reconocerAlerta(id_alerta);
    return { success: true, data };
  }
}