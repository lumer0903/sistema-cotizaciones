import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { ClientesService } from './clientes.service';
import type { ClienteResponse, PaginatedClientesResponse, CreateClienteDto, UpdateClienteDto } from './clientes.service';
import { TipoPrecio } from '@goldcontinent/shared/constants/enums';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @ApiOperation({ summary: 'List all clients with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ): Promise<{ success: true; data: PaginatedClientesResponse['data']; total: number; page: number; limit: number }> {
    const result = await this.clientesService.findAll(Number(page), Number(limit), search);
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  async findById(@Param('id') id: string): Promise<{ success: true; data: ClienteResponse | null }> {
    const cliente = await this.clientesService.findById(Number(id));
    return { success: true, data: cliente };
  }

  @Post()
  @ApiOperation({ summary: 'Create new client' })
  async create(@Body() body: CreateClienteDto): Promise<{ success: true; data: ClienteResponse }> {
    const cliente = await this.clientesService.create(body);
    return { success: true, data: cliente };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateClienteDto,
  ): Promise<{ success: true; data: ClienteResponse }> {
    const cliente = await this.clientesService.update(Number(id), body);
    return { success: true, data: cliente };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client (soft delete)' })
  async delete(@Param('id') id: string): Promise<{ success: true; message: string }> {
    await this.clientesService.delete(Number(id));
    return { success: true, message: 'Cliente eliminado correctamente' };
  }
}