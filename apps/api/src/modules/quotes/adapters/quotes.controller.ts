import { Controller, Post, Get, Patch, Body, UseGuards, Inject, Query, Param, Req, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { CreateQuoteUseCase } from '../application/use-cases/create-quote.use-case';
import { ChangeQuoteStateUseCase } from '../application/use-cases/change-quote-state.use-case';
import { RegistrarPagoUseCase } from '../application/use-cases/registrar-pago.use-case';
import { CreateQuoteDto, UpdateQuoteStateDto, RegistrarPagoDto } from '../application/dtos/create-quote.dto';
import { IQuoteRepository, PaginatedQuotesResponse, QuoteFilters } from '../domain/repositories/quote.repository.interface';
import type { QuoteEntity } from '../domain/entities/quote.entity';

@ApiTags('Cotizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones')
export class QuotesController {
  constructor(
    private readonly createQuoteUseCase: CreateQuoteUseCase,
    private readonly changeQuoteStateUseCase: ChangeQuoteStateUseCase,
    private readonly registrarPagoUseCase: RegistrarPagoUseCase,
    @Inject(IQuoteRepository) private readonly quoteRepository: IQuoteRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva cotización con items (estado: borrador)' })
  async createQuote(@Body() createQuoteDto: CreateQuoteDto, @Req() req: Request & { user: { id_usuario: number; id?: number } }) {
    const userId = req.user.id_usuario ?? req.user.id;
    const dto = {
      ...createQuoteDto,
      id_usuario: userId,
    };
    return this.createQuoteUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones con paginación y filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, type: String })
  @ApiQuery({ name: 'id_cliente', required: false, type: Number })
  @ApiQuery({ name: 'id_usuario', required: false, type: Number })
  @ApiQuery({ name: 'fecha_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_fin', required: false, type: String })
  async getQuotes(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('estado') estado?: string,
    @Query('id_cliente') id_cliente?: string,
    @Query('id_usuario') id_usuario?: string,
    @Query('fecha_inicio') fecha_inicio?: string,
    @Query('fecha_fin') fecha_fin?: string,
  ): Promise<{ success: true; data: PaginatedQuotesResponse['data']; total: number; page: number; limit: number }> {
    const filters: QuoteFilters = {
      estado,
      id_cliente: id_cliente ? Number(id_cliente) : undefined,
      id_usuario: id_usuario ? Number(id_usuario) : undefined,
      fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : undefined,
      fecha_fin: fecha_fin ? new Date(fecha_fin) : undefined,
    };
    const result = await this.quoteRepository.findPaginated(Number(page), Number(limit), filters);
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cotización por ID con detalle' })
  async getQuoteById(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: QuoteEntity | null }> {
    const quote = await this.quoteRepository.findById(id);
    return { success: true, data: quote };
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado de cotización (borrador→enviada, enviada→aprobada/rechazada)' })
  async changeState(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateQuoteStateDto,
    @Req() req: Request & { user: { id_usuario: number; id?: number } },
  ): Promise<{ success: true; data: QuoteEntity }> {
    const userId = req.user.id_usuario ?? req.user.id;
    const quote = await this.changeQuoteStateUseCase.execute(id, body, userId);
    return { success: true, data: quote };
  }

  @Post(':id/registrar-pago')
  @ApiOperation({ summary: 'Registrar abono/pago a una cotización' })
  async registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RegistrarPagoDto,
    @Req() req: Request & { user: { id_usuario?: number; id?: number; sub?: number | string } },
  ) {
    const rawId = req.user?.id_usuario ?? req.user?.id ?? req.user?.sub;
    const userId = Number(rawId);
    if (!userId || isNaN(userId)) {
      throw new BadRequestException('Usuario no identificado');
    }
    return this.registrarPagoUseCase.execute(id, body, userId);
  }
}