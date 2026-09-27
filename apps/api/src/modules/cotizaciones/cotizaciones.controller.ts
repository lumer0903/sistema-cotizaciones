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
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard'; // Ajusta la ruta a tu JwtAuthGuard
import { CotizacionesService } from './cotizaciones.service';
import { PdfExportService } from './pdf/pdf-export.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { ListarCotizacionesQueryDto } from './dto/listar-cotizaciones.query.dto';

interface AuthedRequest extends Request {
    user?: { id_usuario?: number; id?: number; sub?: number };
}

@ApiTags('Cotizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones')
export class CotizacionesController {
    constructor(
        private readonly cotizacionesService: CotizacionesService,
        private readonly pdfExportService: PdfExportService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Crear nueva cotización con items' })
    async create(@Body() body: CreateCotizacionDto, @Req() req: AuthedRequest) {
        // Garantiza extraer correctamente el ID del usuario desde el JWT
        const userId = req.user?.id_usuario || req.user?.id || req.user?.sub;
        return this.cotizacionesService.crear(body, Number(userId));
    }

    @Get()
    @ApiOperation({ summary: 'Listar cotizaciones con paginación y filtros' })
    async findAll(@Query() query: ListarCotizacionesQueryDto) {
        return this.cotizacionesService.listar(query);
    }

    @Get('proximo-numero')
    @ApiOperation({ summary: 'Obtener próximo número secuencial COT-001' })
    async proximoNumero() {
        return this.cotizacionesService.proximoNumero();
    }

    @Get(':id/export-pdf')
    @ApiOperation({ summary: 'Exportar cotización a PDF (cacheado o en cola BullMQ)' })
    async exportPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const resultado = await this.pdfExportService.exportar(id);

        if (resultado.type === 'processing') {
            return res.status(202).json({
                status: 'processing',
                jobId: resultado.jobId,
                poll: `/api/cotizaciones/${id}/pdf-status`,
            });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
        res.setHeader('Content-Length', resultado.buffer.length);
        if (resultado.cached) res.setHeader('X-PDF-Cache', 'hit');
        res.end(resultado.buffer);
    }

    @Get(':id/pdf-status')
    @ApiOperation({ summary: 'Estado del trabajo de generación del PDF' })
    async pdfStatus(@Param('id', ParseIntPipe) id: number) {
        return this.pdfExportService.status(id);
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
        @Body() body: UpdateCotizacionDto,
    ) {
        return this.cotizacionesService.actualizar(id, body);
    }

    @Patch(':id/estado')
    @ApiOperation({ summary: 'Cambiar estado de cotización' })
    async updateState(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: CambiarEstadoDto,
    ) {
        return this.cotizacionesService.cambiarEstado(id, body.estado);
    }

    @Post(':id/pagos')
    @ApiOperation({ summary: 'Registrar abono/pago a una cotización' })
    async registerPayment(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: RegistrarPagoDto,
        @Req() req: AuthedRequest,
    ) {
        const userId = req.user?.id_usuario || req.user?.id || req.user?.sub;
        return this.cotizacionesService.registrarPago(id, body, Number(userId));
    }
}