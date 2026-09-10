import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { CobranzaService } from './cobranza.service';
import type { CuentaCobrarResponse, PaginatedCobranzaResponse, UpdateCobranzaDto } from './cobranza.service';
import { EstadoCuentaCobrar } from '@goldcontinent/shared/constants/enums';

@ApiTags('Cobranza')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cobranza')
export class CobranzaController {
  constructor(private readonly cobranzaService: CobranzaService) {}

  @Get()
  @ApiOperation({ summary: 'List all accounts receivable with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoCuentaCobrar })
  @ApiQuery({ name: 'id_cliente', required: false, type: Number })
  @ApiQuery({ name: 'fecha_vencimiento_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_vencimiento_fin', required: false, type: String })
  @ApiQuery({ name: 'solo_vencidas', required: false, type: Boolean })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('estado') estado?: EstadoCuentaCobrar,
    @Query('id_cliente') id_cliente?: string,
    @Query('fecha_vencimiento_inicio') fecha_vencimiento_inicio?: string,
    @Query('fecha_vencimiento_fin') fecha_vencimiento_fin?: string,
    @Query('solo_vencidas') solo_vencidas?: string,
  ): Promise<{ success: true; data: PaginatedCobranzaResponse['data']; total: number; page: number; limit: number }> {
    const result = await this.cobranzaService.findAll(Number(page), Number(limit), {
      estado,
      id_cliente: id_cliente ? Number(id_cliente) : undefined,
      fecha_vencimiento_inicio: fecha_vencimiento_inicio ? new Date(fecha_vencimiento_inicio) : undefined,
      fecha_vencimiento_fin: fecha_vencimiento_fin ? new Date(fecha_vencimiento_fin) : undefined,
      solo_vencidas: solo_vencidas === 'true',
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account receivable by ID' })
  async findById(@Param('id') id: string): Promise<{ success: true; data: CuentaCobrarResponse | null }> {
    const cuenta = await this.cobranzaService.findById(Number(id));
    return { success: true, data: cuenta };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account receivable' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCobranzaDto,
  ): Promise<{ success: true; data: CuentaCobrarResponse }> {
    const cuenta = await this.cobranzaService.update(Number(id), body);
    return { success: true, data: cuenta };
  }
}