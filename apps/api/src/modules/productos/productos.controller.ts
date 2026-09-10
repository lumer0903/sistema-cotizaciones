import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { ProductosService } from './productos.service';
import type { ProductoResponse, PaginatedProductosResponse, CreateProductoDto, UpdateProductoDto } from './productos.service';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  @ApiOperation({ summary: 'List all products with pagination, search, and optional relations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'include', required: false, type: String, description: 'Comma-separated: precios,categoria' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
    @Query('include') include?: string,
  ): Promise<{ success: true; data: PaginatedProductosResponse['data']; total: number; page: number; limit: number }> {
    const includePrecios = include?.includes('precios') ?? false;
    const includeCategoria = include?.includes('categoria') ?? false;

    const result = await this.productosService.findAll(
      Number(page),
      Number(limit),
      search,
      includePrecios,
      includeCategoria,
    );
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiQuery({ name: 'include', required: false, type: String, description: 'Comma-separated: precios,categoria' })
  async findById(
    @Param('id') id: string,
    @Query('include') include?: string,
  ): Promise<{ success: true; data: ProductoResponse | null }> {
    const includePrecios = include?.includes('precios') ?? false;
    const includeCategoria = include?.includes('categoria') ?? false;

    const producto = await this.productosService.findById(Number(id), includePrecios, includeCategoria);
    return { success: true, data: producto };
  }

  @Post()
  @ApiOperation({ summary: 'Create new product' })
  async create(@Body() body: CreateProductoDto): Promise<{ success: true; data: ProductoResponse }> {
    const producto = await this.productosService.create(body);
    return { success: true, data: producto };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProductoDto,
  ): Promise<{ success: true; data: ProductoResponse }> {
    const producto = await this.productosService.update(Number(id), body);
    return { success: true, data: producto };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product (soft delete)' })
  async delete(@Param('id') id: string): Promise<{ success: true; message: string }> {
    await this.productosService.delete(Number(id));
    return { success: true, message: 'Producto eliminado correctamente' };
  }
}
