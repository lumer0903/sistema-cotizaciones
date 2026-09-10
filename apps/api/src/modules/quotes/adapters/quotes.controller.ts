import { Controller, Post, Get, Body, UseGuards, Inject, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { CreateQuoteUseCase } from '../application/use-cases/create-quote.use-case';
import { CreateQuoteDto } from '../application/dtos/create-quote.dto';
import { IQuoteRepository, PaginatedQuotesResponse, QuoteFilters } from '../domain/repositories/quote.repository.interface';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones')
export class QuotesController {
  constructor(
    private readonly createQuoteUseCase: CreateQuoteUseCase,
    @Inject(IQuoteRepository) private readonly quoteRepository: IQuoteRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quote and trigger PDF generation' })
  async createQuote(@Body() createQuoteDto: CreateQuoteDto) {
    return this.createQuoteUseCase.execute(createQuoteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quotes with pagination and filters' })
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
  @ApiOperation({ summary: 'Get quote by ID' })
  async getQuoteById(@Param('id') id: string) {
    const quote = await this.quoteRepository.findById(Number(id));
    return { success: true, data: quote };
  }
}
