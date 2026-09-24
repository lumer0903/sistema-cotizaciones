import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '@goldcontinent/shared/constants/enums';
import { DashboardService } from './dashboard.service';
import type { KpiResponse, DetalleKpisResponse } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin, Rol.gerente)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Obtener KPIs principales para el dashboard de tesis' })
  async getKpis(): Promise<{ success: true; data: KpiResponse }> {
    const kpis = await this.dashboardService.getKpis();
    return { success: true, data: kpis };
  }

  @Get('detalle')
  @ApiOperation({ summary: 'Obtener detalle completo de KPIs con gráficos y alertas' })
  async getDetalleKpis(): Promise<{ success: true; data: DetalleKpisResponse }> {
    const detalle = await this.dashboardService.getDetalleKpis();
    return { success: true, data: detalle };
  }
}