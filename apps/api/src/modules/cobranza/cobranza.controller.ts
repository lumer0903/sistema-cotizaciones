import { Controller, Get, Patch, Param, Query, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { CobranzaService } from './cobranza.service';
import type { CuentaCobrarResponse, PaginatedCobranzaResponse } from './cobranza.service';
import { EstadoCuentaCobrar } from '@goldcontinent/shared/constants/enums';
import { IsOptional, IsEnum, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateCobranzaDto {
  @ApiPropertyOptional({ enum: EstadoCuentaCobrar, example: 'pendiente' })
  @IsOptional() @IsEnum(EstadoCuentaCobrar)
  estado?: EstadoCuentaCobrar;

  @ApiPropertyOptional({ example: 1000, minimum: 0 })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Type(() => Number)
  montoPendiente?: number;

  @ApiPropertyOptional({ example: 50, minimum: 0 })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Type(() => Number)
  moraAcumulada?: number;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  diasAtraso?: number;
}

@ApiTags('Cobranza')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cobranza')
export class CobranzaController {
  constructor(private readonly cobranzaService: CobranzaService) {}

  @Get()
  @ApiOperation({ summary: 'List all accounts receivable with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoCuentaCobrar })
  @ApiQuery({ name: 'id_cliente', required: false, type: Number })
  @ApiQuery({ name: 'fecha_vencimiento_inicio', required: false, type: String })
  @ApiQuery({ name: 'fecha_vencimiento_fin', required: false, type: String })
  @ApiQuery({ name: 'solo_vencidas', required: false, type: Boolean })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('estado') estado?: EstadoCuentaCobrar,
    @Query('id_cliente') id_cliente?: string,
    @Query('fecha_vencimiento_inicio') fecha_vencimiento_inicio?: string,
    @Query('fecha_vencimiento_fin') fecha_vencimiento_fin?: string,
    @Query('solo_vencidas') solo_vencidas?: string,
  ): Promise<{ success: true; data: PaginatedCobranzaResponse['data']; total: number; page: number; limit: number }> {
    const result = await this.cobranzaService.findAll(Number(page), Number(limit), {
      estado,
      id_cliente: id_cliente ? Number(id_cliente) : undefined,
      fecha_vencimiento_inicio: fecha_vencimiento_inicio ? new Date(fecha_vencimiento_inicio) : undefined,
      fecha_vencimiento_fin: fecha_vencimiento_fin ? new Date(fecha_vencimiento_fin) : undefined,
      solo_vencidas: solo_vencidas === 'true',
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account receivable by ID' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: CuentaCobrarResponse | null }> {
    const cuenta = await this.cobranzaService.findById(id);
    return { success: true, data: cuenta };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account receivable' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCobranzaDto,
  ): Promise<{ success: true; data: CuentaCobrarResponse }> {
    const cuenta = await this.cobranzaService.update(id, body);
    return { success: true, data: cuenta };
  }
}