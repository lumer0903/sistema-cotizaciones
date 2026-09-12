import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { RecomendacionesService } from './recomendaciones.service';
import { RecomendarItemDto } from './dto/recomendar-item.dto';
import type { RecomendarItemResponse } from './recomendaciones.service';

@ApiTags('Cotizaciones - Recomendaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones')
export class RecomendacionesController {
  constructor(private readonly recomendacionesService: RecomendacionesService) {}

  @Post('recomendar-item')
  @ApiOperation({ 
    summary: 'Obtener 3 recomendaciones por ítem (Similar, Upsell, Equilibrio)',
    description: 'Recibe un producto base y retorna 3 tarjetas de recomendación con precios ajustados según el tipo de cliente y stock por almacén'
  })
  async recomendarItem(
    @Body() body: RecomendarItemDto,
    @Req() req: Request & { user: { id_usuario: number; id?: number } },
  ): Promise<{ success: true; data: RecomendarItemResponse }> {
    const userId = req.user.id_usuario ?? req.user.id;
    const recomendaciones = await this.recomendacionesService.recomendarItem(body, userId);
    return { success: true, data: recomendaciones };
  }
}