import { Controller, Get, Patch, Param, ParseIntPipe, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { NotificacionesService, NotificacionItem } from './notificaciones.service';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener la bandeja de notificaciones (stock bajo + cotizaciones vencidas + cobranzas)' })
  async getNotificaciones(): Promise<{ success: true; data: NotificacionItem[] }> {
    const data = await this.notificacionesService.getNotificaciones();
    return { success: true, data };
  }

  @Patch('marcar-todos')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  async marcarTodosComoLeidos(): Promise<{ success: true; data: { ok: true } }> {
    const data = await this.notificacionesService.marcarTodosComoLeidos();
    return { success: true, data };
  }

  @Patch('stock/:id_alerta/reconocer')
  @ApiOperation({ summary: 'Marcar alerta de stock como vista (reconocida)' })
  async reconocerAlertaStock(
    @Param('id_alerta', ParseIntPipe) id_alerta: number,
  ): Promise<{ success: true; data: { ok: true } }> {
    const data = await this.notificacionesService.reconocerAlertaStock(id_alerta);
    return { success: true, data };
  }

  @Patch(':tipo/:id_referencia/marcar-leida')
  @ApiOperation({ summary: 'Marcar notificación de cotización/cobranza como vista (queda en historial)' })
  async marcarLeida(
    @Param('tipo') tipo: string,
    @Param('id_referencia', ParseIntPipe) id_referencia: number,
  ): Promise<{ success: true; data: { ok: true } }> {
    if (tipo !== 'COTIZACION_VENCIDA' && tipo !== 'COBRANZA_PENDIENTE') {
      throw new BadRequestException(`Tipo de notificación no soportado: ${tipo}`);
    }
    const data = await this.notificacionesService.marcarLeida(tipo, id_referencia);
    return { success: true, data };
  }
}
