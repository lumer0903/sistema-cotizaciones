import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '@goldcontinent/shared/constants/enums';
import { CategoriasService, PaginatedCategoriasResponse, CategoriaResponse } from './categorias.service';
import { IsString, MaxLength } from 'class-validator';

class CreateCategoriaDto {
  @ApiProperty({ example: 'Electrónicos', maxLength: 100 })
  @IsString() @MaxLength(100)
  nombre_categoria!: string;
}

class UpdateCategoriaDto {
  @ApiProperty({ example: 'Electrónicos', maxLength: 100 })
  @IsString() @MaxLength(100)
  nombre_categoria!: string;
}

@ApiTags('Categorias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin, Rol.gerente)
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
  async findById(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: CategoriaResponse | null }> {
    const categoria = await this.categoriasService.findById(id);
    return { success: true, data: categoria };
  }

  @Post()
  @ApiOperation({ summary: 'Create new category' })
  async create(@Body() body: CreateCategoriaDto): Promise<{ success: true; data: CategoriaResponse }> {
    const categoria = await this.categoriasService.create(body.nombre_categoria);
    return { success: true, data: categoria };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoriaDto,
  ): Promise<{ success: true; data: CategoriaResponse }> {
    const categoria = await this.categoriasService.update(id, body.nombre_categoria);
    return { success: true, data: categoria };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; message: string }> {
    await this.categoriasService.delete(id);
    return { success: true, message: 'Categoría eliminada correctamente' };
  }
}