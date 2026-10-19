import { Permission } from '../../common/decorators/permission.decorator';
import { BadRequestException, Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { ReportesService, FiltrosReporte, RankingProductoRow, AntiguedadDeudaRow, AuditoriaIaRow } from './reportes.service';
import { alcanceDeDatos, UsuarioSesion } from '../../common/utils/alcance.util';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';
import { PagingLimitGuard, DEFAULT_TAKE, MAX_TAKE, MAX_SKIP } from '../../common/guards/paging-limit.guard';

interface ReportesQueryParams extends FiltrosReporte {
  take?: string;
  skip?: string;
}

function parseFechaISO(fecha?: string): Date | undefined {
  if (!fecha) return undefined;
  const d = new Date(`${fecha}T00:00:00`);
  return isNaN(d.getTime()) ? undefined : d;
}

function validarFechas(fechaInicio?: string, fechaFin?: string): { ok: boolean; error?: string } {
  const inicio = parseFechaISO(fechaInicio);
  const fin = parseFechaISO(fechaFin);

  if (fechaInicio && !inicio) return { ok: false, error: 'fechaInicio inválida (formato ISO YYYY-MM-DD)' };
  if (fechaFin && !fin) return { ok: false, error: 'fechaFin inválida (formato ISO YYYY-MM-DD)' };
  if (inicio && fin && inicio > fin) return { ok: false, error: 'fechaInicio no puede ser mayor a fechaFin' };
  return { ok: true };
}

function extraerFiltros(query: ReportesQueryParams, user?: UsuarioSesion): FiltrosReporte {
  const rol = String(user?.rol ?? '').trim().toLowerCase();
  const esAdmin = rol === 'admin' || rol === 'superadmin' || rol === 'gerente';

  return {
    fechaInicio: query.fechaInicio || undefined,
    fechaFin: query.fechaFin || undefined,
    idVendedor: alcanceDeDatos(user) ?? (esAdmin && query.idVendedor ? Number(query.idVendedor) : undefined),
    idAlmacen: query.idAlmacen ? Number(query.idAlmacen) : undefined,
    idCliente: query.idCliente ? Number(query.idCliente) : undefined,
    idProducto: query.idProducto ? Number(query.idProducto) : undefined,
  };
}

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
@Permission('reportes')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('ranking-productos')
  @UseGuards(PagingLimitGuard)
  @ApiOperation({ summary: 'Ranking de productos más vendidos (paginado, take ≤ 50)' })
  @ApiQuery({ name: 'take', required: false, description: `Items por página (default ${DEFAULT_TAKE}, max ${MAX_TAKE})` })
  @ApiQuery({ name: 'skip', required: false, description: `Offset (default 0, max ${MAX_SKIP})` })
  async getRankingProductos(
    @Query() query: ReportesQueryParams,
    @Req() req: { user?: UsuarioSesion },
  ): Promise<{ success: true; data: RankingProductoRow[]; total: number; take: number; skip: number }> {
    const validacion = validarFechas(query.fechaInicio, query.fechaFin);
    if (!validacion.ok) {
      throw new BadRequestException(validacion.error);
    }

    const filtros = extraerFiltros(query, req.user);
    const take = Number(query.take) || DEFAULT_TAKE;
    const skip = Number(query.skip) || 0;
    const { data, total } = await this.reportesService.getRankingProductos(filtros, take, skip);
    return { success: true, data, total, take, skip };
  }

  @Get('antiguedad-deuda')
  @UseGuards(PagingLimitGuard)
  @ApiOperation({ summary: 'Antigüedad de deuda / cuentas por cobrar (paginado, take ≤ 50)' })
  @ApiQuery({ name: 'take', required: false, description: `Items por página (default ${DEFAULT_TAKE}, max ${MAX_TAKE})` })
  @ApiQuery({ name: 'skip', required: false, description: `Offset (default 0, max ${MAX_SKIP})` })
  async getAntiguedadDeuda(
    @Query() query: ReportesQueryParams,
    @Req() req: { user?: UsuarioSesion },
  ): Promise<{ success: true; data: AntiguedadDeudaRow[]; total: number; take: number; skip: number }> {
    const validacion = validarFechas(query.fechaInicio, query.fechaFin);
    if (!validacion.ok) {
      throw new BadRequestException(validacion.error);
    }

    const filtros = extraerFiltros(query, req.user);
    const take = Number(query.take) || DEFAULT_TAKE;
    const skip = Number(query.skip) || 0;
    const { data, total } = await this.reportesService.getAntiguedadDeuda(filtros, take, skip);
    return { success: true, data, total, take, skip };
  }

  @Get('auditoria-ia')
  @UseGuards(PagingLimitGuard)
  @ApiOperation({ summary: 'Auditoría de interacciones IA (paginado, take ≤ 50)' })
  @ApiQuery({ name: 'take', required: false, description: `Items por página (default ${DEFAULT_TAKE}, max ${MAX_TAKE})` })
  @ApiQuery({ name: 'skip', required: false, description: `Offset (default 0, max ${MAX_SKIP})` })
  async getAuditoriaIa(
    @Query() query: ReportesQueryParams,
    @Req() req: { user?: UsuarioSesion },
  ): Promise<{ success: true; data: AuditoriaIaRow[]; total: number; take: number; skip: number }> {
    const validacion = validarFechas(query.fechaInicio, query.fechaFin);
    if (!validacion.ok) {
      throw new BadRequestException(validacion.error);
    }

    const filtros = extraerFiltros(query, req.user);
    const take = Number(query.take) || DEFAULT_TAKE;
    const skip = Number(query.skip) || 0;
    const { data, total } = await this.reportesService.getAuditoriaIa(filtros, take, skip);
    return { success: true, data, total, take, skip };
  }
}