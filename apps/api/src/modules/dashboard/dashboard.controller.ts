import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import type { KpiResponse, DetalleKpisResponse } from './dashboard.service';
import { alcanceDeDatos, UsuarioSesion } from '../../common/utils/alcance.util';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Obtener KPIs principales del dashboard (alcance del usuario)' })
  async getKpis(@Req() req: { user?: UsuarioSesion }): Promise<{ success: true; data: KpiResponse }> {
    const kpis = await this.dashboardService.getKpis(alcanceDeDatos(req.user));
    return { success: true, data: kpis };
  }

  @Get('detalle')
  @ApiOperation({ summary: 'Obtener detalle completo de KPIs con gráficos y alertas' })
  async getDetalleKpis(@Req() req: { user?: UsuarioSesion }): Promise<{ success: true; data: DetalleKpisResponse }> {
    const detalle = await this.dashboardService.getDetalleKpis(alcanceDeDatos(req.user));
    return { success: true, data: detalle };
  }
}