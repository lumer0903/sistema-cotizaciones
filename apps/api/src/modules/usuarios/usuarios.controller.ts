import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { UsuariosService } from './usuarios.service';
import type { PaginatedUsuariosResponse } from './usuarios.service';
import { Rol } from '@goldcontinent/shared/constants/enums';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'List all users with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ): Promise<{ success: true; data: PaginatedUsuariosResponse['data']; total: number; page: number; limit: number }> {
    const result = await this.usuariosService.findAll(Number(page), Number(limit), search);
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id') id: string): Promise<{ success: true; data: any }> {
    const usuario = await this.usuariosService.findById(Number(id));
    if (!usuario) {
      return { success: true, data: null };
    }
    return { success: true, data: usuario };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user active status' })
  async updateActivo(
    @Param('id') id: string,
    @Body() body: { activo: boolean },
  ): Promise<{ success: true; data: any }> {
    const usuario = await this.usuariosService.updateActivo(Number(id), body.activo);
    return { success: true, data: usuario };
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  async create(
    @Body() body: { nombre: string; email: string; password: string; rol?: Rol },
  ): Promise<{ success: true; data: any }> {
    const usuario = await this.usuariosService.create(body);
    return { success: true, data: usuario };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  async delete(@Param('id') id: string): Promise<{ success: true; message: string }> {
    await this.usuariosService.delete(Number(id));
    return { success: true, message: 'Usuario eliminado correctamente' };
  }
}