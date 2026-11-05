import { Permission } from '../../common/decorators/permission.decorator';
import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import type { KpiResponse, DetalleKpisResponse, GraficosResponse, AlertaStockDetalle, FiltrosDashboard } from './dashboard.service';
import { alcanceDeDatos, UsuarioSesion } from '../../common/utils/alcance.util';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';

/** Query params de filtros globales del dashboard. */
interface DashboardQueryParams {
  fechaInicio?: string;
  fechaFin?: string;
  idVendedor?: string;
  idAlmacen?: string;
}

/**
 * Extrae y normaliza los filtros de la query string.
 * `idVendedor` sólo se aplica si el usuario es admin (el service lo maneja).
 */
function extraerFiltros(query: DashboardQueryParams, user?: UsuarioSesion): FiltrosDashboard {
  const rol = String(user?.rol ?? '').trim().toLowerCase();
  const esAdmin = rol === 'admin' || rol === 'superadmin';

  return {
    fechaInicio: query.fechaInicio || undefined,
    fechaFin: query.fechaFin || undefined,
    idVendedor: esAdmin && query.idVendedor ? Number(query.idVendedor) : undefined,
    idAlmacen: query.idAlmacen ? Number(query.idAlmacen) : undefined,
  };
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// Métricas globales cacheadas 30s por usuario (la clave incluye el id de sesión)
@UseInterceptors(CacheInterceptor)
@Permission('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Obtener KPIs principales del dashboard (alcance del usuario + filtros)' })
  async getKpis(
    @Query() query: DashboardQueryParams,
    @Req() req: { user?: UsuarioSesion },
  ): Promise<{ success: true; data: KpiResponse }> {
    const filtros = extraerFiltros(query, req.user);
    const kpis = await this.dashboardService.getKpis(alcanceDeDatos(req.user), filtros);
    return { success: true, data: kpis };
  }

  @Get('graficos')
  @ApiOperation({ summary: 'Agregaciones ligeras para los widgets gráficos (Recharts)' })
  async getGraficos(
    @Query() query: DashboardQueryParams,
    @Req() req: { user?: UsuarioSesion },
  ): Promise<{ success: true; data: GraficosResponse }> {
    const filtros = extraerFiltros(query, req.user);
    const graficos = await this.dashboardService.getGraficos(alcanceDeDatos(req.user), filtros);
    return { success: true, data: graficos };
  }

  @Get('stock-bajo')
  @ApiOperation({ summary: 'Top de productos con stock bajo (take ≤ 10, ordenado por urgencia)' })
  async getStockBajo(
    @Query() query: DashboardQueryParams,
    @Req() req: { user?: UsuarioSesion },
  ): Promise<{ success: true; data: AlertaStockDetalle[] }> {
    const filtros = extraerFiltros(query, req.user);
    const stockBajo = await this.dashboardService.getStockBajo(10, filtros);
    return { success: true, data: stockBajo };
  }

  @Get('detalle')
  @ApiOperation({ summary: 'Obtener detalle completo de KPIs con gráficos y alertas' })
  async getDetalleKpis(@Req() req: { user?: UsuarioSesion }): Promise<{ success: true; data: DetalleKpisResponse }> {
    const detalle = await this.dashboardService.getDetalleKpis(alcanceDeDatos(req.user));
    return { success: true, data: detalle };
  }
}
