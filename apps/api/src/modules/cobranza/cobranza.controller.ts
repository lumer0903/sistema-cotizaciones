import { Controller, Get, Post, Param, Query, Body, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { CobranzaService } from './cobranza.service';
import type { CobranzaItemResponse, CobranzaDetalleResponse, PaginatedCobranzaResponse } from './cobranza.service';
import { EstadoCotizacion, MetodoPago } from '@goldcontinent/shared/constants/enums';

@ApiTags('Cobranza')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cobranza')
export class CobranzaController {
  constructor(private readonly cobranzaService: CobranzaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones de cobranza (incluye saldadas/pagadas)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoCotizacion })
  @ApiQuery({ name: 'estado_cobranza', required: false, type: String, description: 'pendiente | parcial | pagada | vencida' })
  @ApiQuery({ name: 'id_cliente', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'fecha_vencimiento_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_vencimiento_fin', required: false, type: String })
  @ApiQuery({ name: 'solo_vencidas', required: false, type: Boolean })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('estado') estado?: string,
    @Query('estado_cobranza') estado_cobranza?: string,
    @Query('id_cliente') id_cliente?: string,
    @Query('q') q?: string,
    @Query('fecha_vencimiento_inicio') fecha_vencimiento_inicio?: string,
    @Query('fecha_vencimiento_fin') fecha_vencimiento_fin?: string,
    @Query('solo_vencidas') solo_vencidas?: string,
  ): Promise<{ success: true; data: PaginatedCobranzaResponse['data']; total: number; page: number; limit: number }> {
    const result = await this.cobranzaService.findAll(Number(page) || 1, Number(limit) || 50, {
      estado,
      estado_cobranza,
      id_cliente: id_cliente ? Number(id_cliente) : undefined,
      q,
      fecha_vencimiento_inicio: fecha_vencimiento_inicio ? new Date(fecha_vencimiento_inicio) : undefined,
      fecha_vencimiento_fin: fecha_vencimiento_fin ? new Date(fecha_vencimiento_fin) : undefined,
      solo_vencidas: solo_vencidas === 'true',
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de cobranza por id de cotización (historial de pagos)' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: CobranzaDetalleResponse }> {
    const data = await this.cobranzaService.findById(id);
    return { success: true, data };
  }

  @Post(':id/pagos')
  @ApiOperation({ summary: 'Registrar abono/pago de una cotización' })
  @ApiQuery({ name: 'metodo_pago', required: false, enum: MetodoPago })
  async registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { monto: number; metodo_pago: string; referencia?: string | null },
    @Req() req: any,
  ): Promise<{ success: true; data: CobranzaDetalleResponse }> {
    const userId = req.user?.id_usuario || req.user?.id || req.user?.sub;
    const data = await this.cobranzaService.registrarPago(id, body, Number(userId) || 0);
    return { success: true, data };
  }
}
