import { Controller, Get, Post, Patch, Put, Param, Query, Body, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuariosService } from './usuarios.service';
import type { PaginatedUsuariosResponse } from './usuarios.service';
import { Rol, PermisoModulo, NivelPermiso } from '@goldcontinent/shared/constants/enums';
import {
  IsString, IsOptional, IsEmail, IsBoolean, IsObject, MinLength, MaxLength,
} from 'class-validator';

class CreateUsuarioDto {
  @ApiProperty({ example: 'Juan Pérez', maxLength: 100 })
  @IsString() @MaxLength(100)
  nombre!: string;

  @ApiProperty({ example: 'juan@ejemplo.com', maxLength: 255 })
  @IsEmail() @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString() @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'vendedor', description: 'Código de rol dinámico' })
  @IsOptional() @IsString() @MaxLength(40)
  rol?: string;
}

class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'Juan Pérez', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ example: 'juan@ejemplo.com', maxLength: 255 })
  @IsOptional() @IsEmail() @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'nuevaPassword123', minLength: 6 })
  @IsOptional() @IsString() @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: 'vendedor', description: 'Código de rol dinámico' })
  @IsOptional() @IsString() @MaxLength(40)
  rol?: string;

  @ApiPropertyOptional({
    description: 'Data URL de la foto de perfil (PNG/JPEG/WebP, máx ~512 KB). Usa null para quitar',
    example: 'data:image/jpeg;base64,...',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(700000)
  avatar_url?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  activo?: boolean;
}

class UpdateActivoDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  activo!: boolean;
}

class PermisosBodyDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { enum: Object.values(NivelPermiso) },
    example: { dashboard: 'lectura', cotizaciones: 'edicion' },
  })
  @IsObject()
  permisos!: Partial<Record<PermisoModulo, NivelPermiso>>;
}

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin)
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
    const result = await this.usuariosService.findAll(
      Math.max(1, Number(page) || 1),
      Math.min(Math.max(1, Number(limit) || 50), 100),
      search,
    );
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: any }> {
    const usuario = await this.usuariosService.findById(id);
    if (!usuario) {
      return { success: true, data: null };
    }
    return { success: true, data: usuario };
  }

  @Get(':id/permisos')
  @ApiOperation({ summary: 'Get user permission overrides' })
  async getPermisos(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: any }> {
    const data = await this.usuariosService.getPermisos(id);
    return { success: true, data };
  }

  @Put(':id/permisos')
  @ApiOperation({ summary: 'Replace user permission overrides' })
  async setPermisos(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PermisosBodyDto,
  ): Promise<{ success: true; data: any }> {
    const data = await this.usuariosService.setPermisos(id, body.permisos);
    return { success: true, data };
  }

  @Patch(':id/activo')
  @ApiOperation({ summary: 'Update user active status' })
  async updateActivo(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateActivoDto,
    @Req() req: any,
  ): Promise<{ success: true; data: any }> {
    const actorId = req.user?.id_usuario;
    const usuario = await this.usuariosService.updateActivo(id, body.activo, actorId);
    return { success: true, data: usuario };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user data (name, role, password, etc.)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUsuarioDto,
    @Req() req: any,
  ): Promise<{ success: true; data: any }> {
    const actorId = req.user?.id_usuario;
    const usuario = await this.usuariosService.update(id, body, actorId);
    return { success: true, data: usuario };
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  async create(
    @Body() body: CreateUsuarioDto,
  ): Promise<{ success: true; data: any }> {
    const usuario = await this.usuariosService.create(body);
    return { success: true, data: usuario };
  }
}
