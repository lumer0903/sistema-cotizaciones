import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Query,
    UseGuards,
    Req,
    Res,
    ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard'; // Ajusta la ruta a tu JwtAuthGuard
import { CotizacionesService } from './cotizaciones.service';
import { CotizacionesPdfService } from './pdf/cotizaciones-pdf.service';

@ApiTags('Cotizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones')
export class CotizacionesController {
    constructor(
        private readonly cotizacionesService: CotizacionesService,
        private readonly pdfService: CotizacionesPdfService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Crear nueva cotización con items' })
    async create(@Body() body: any, @Req() req: any) {
        // Garantiza extraer correctamente el ID del usuario desde el JWT
        const userId = req.user?.id_usuario || req.user?.id || req.user?.sub;
        return this.cotizacionesService.crear(body, Number(userId));
    }

    @Get()
    @ApiOperation({ summary: 'Listar cotizaciones con paginación y filtros' })
    async findAll(@Query() query: any) {
        return this.cotizacionesService.listar(query);
    }

    @Get('proximo-numero')
    @ApiOperation({ summary: 'Obtener próximo número secuencial COT-001' })
    async proximoNumero() {
        return this.cotizacionesService.proximoNumero();
    }

    @Get(':id/export-pdf')
    @ApiOperation({ summary: 'Exportar cotización a PDF' })
    async exportPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const { buffer, filename } = await this.pdfService.generarPdfBuffer(id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener cotización por ID con detalle' })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.cotizacionesService.obtenerPorId(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar cotización en BORRADOR (conserva el número)' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
    ) {
        return this.cotizacionesService.actualizar(id, body);
    }

    @Patch(':id/estado')
    @ApiOperation({ summary: 'Cambiar estado de cotización' })
    async updateState(
        @Param('id', ParseIntPipe) id: number,
        @Body('estado') estado: string,
    ) {
        return this.cotizacionesService.cambiarEstado(id, estado);
    }

    @Post(':id/pagos')
    @ApiOperation({ summary: 'Registrar abono/pago a una cotización' })
    async registerPayment(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
        @Req() req: any,
    ) {
        const userId = req.user?.id_usuario || req.user?.id || req.user?.sub;
        return this.cotizacionesService.registrarPago(id, body, Number(userId));
    }
}