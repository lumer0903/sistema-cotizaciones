import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { CategoriasService, PaginatedCategoriasResponse, CategoriaResponse } from './categorias.service';

@ApiTags('Categorias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 100,
  ): Promise<{ success: true; data: PaginatedCategoriasResponse['data']; total: number; page: number; limit: number }> {
    const result = await this.categoriasService.findAll(Number(page), Number(limit));
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findById(@Param('id') id: string): Promise<{ success: true; data: CategoriaResponse | null }> {
    const categoria = await this.categoriasService.findById(Number(id));
    return { success: true, data: categoria };
  }

  @Post()
  @ApiOperation({ summary: 'Create new category' })
  async create(@Body() body: { nombre_categoria: string }): Promise<{ success: true; data: CategoriaResponse }> {
    const categoria = await this.categoriasService.create(body.nombre_categoria);
    return { success: true, data: categoria };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  async update(
    @Param('id') id: string,
    @Body() body: { nombre_categoria: string },
  ): Promise<{ success: true; data: CategoriaResponse }> {
    const categoria = await this.categoriasService.update(Number(id), body.nombre_categoria);
    return { success: true, data: categoria };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  async delete(@Param('id') id: string): Promise<{ success: true; message: string }> {
    await this.categoriasService.delete(Number(id));
    return { success: true, message: 'Categoría eliminada correctamente' };
  }
}