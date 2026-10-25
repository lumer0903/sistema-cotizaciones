import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { RecomendacionesService } from './recomendaciones.service';
import { RecomendarItemDto } from './dto/recomendar-item.dto';
import { RegistrarAccionIaDto } from './dto/registrar-accion-ia.dto';
import type { RecomendarItemResponse, AccionIaResponse } from './recomendaciones.service';

// Interfaz para extender la Request de Express con el usuario autenticado
interface RequestWithUser extends Request {
  user?: {
    id_usuario?: number;
    id?: number;
  };
}

@ApiTags('Cotizaciones - Recomendaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones')
export class RecomendacionesController {
  constructor(private readonly recomendacionesService: RecomendacionesService) { }

  @Post('recomendar-item')
  @ApiOperation({
    summary: 'Obtener 3 recomendaciones por ítem (Similar, Upsell, Equilibrio)',
    description:
      'Recibe un producto base y retorna 3 tarjetas de recomendación con precios ajustados según el tipo de cliente y stock por almacén',
  })
  @ApiOkResponse({
    description: 'Recomendaciones obtenidas exitosamente',
  })
  @ApiNotFoundResponse({
    description: 'Producto base no encontrado',
  })
  async recomendarItem(
    @Body() body: RecomendarItemDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: true; data: RecomendarItemResponse }> {
    const userId = req.user?.id_usuario ?? req.user?.id ?? 1;
    const recomendaciones = await this.recomendacionesService.recomendarItem(body, userId);

    return {
      success: true,
      data: recomendaciones,
    };
  }

  @Post('registrar-accion-ia')
  @ApiOperation({
    summary: 'Registrar la decisión del asesor sobre una recomendación IA',
    description:
      "Actualiza ia_interacciones.accion_usuario = 'ACEPTADO' (el asesor agrega/reemplaza el ítem sugerido) o 'RECHAZADO' (lo descarta), vinculando la cotización y el producto sugerido cuando se envían",
  })
  @ApiOkResponse({ description: 'Acción registrada' })
  @ApiNotFoundResponse({ description: 'Interacción IA no encontrada' })
  async registrarAccionIa(
    @Body() body: RegistrarAccionIaDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: true; data: AccionIaResponse }> {
    const userId = req.user?.id_usuario ?? req.user?.id ?? 1;
    const resultado = await this.recomendacionesService.registrarAccionIa(body, userId);

    return {
      success: true,
      data: resultado,
    };
  }
}