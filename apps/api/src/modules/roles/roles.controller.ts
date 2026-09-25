import { Controller, Get, Post, Patch, Put, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol, PermisoModulo, NivelPermiso } from '@goldcontinent/shared/constants/enums';
import {
  IsString, IsOptional, IsBoolean, IsObject, IsInt, MinLength, MaxLength, Matches, Min, Max,
} from 'class-validator';
import { RolesService } from './roles.service';

class CreateRolDto {
  @ApiProperty({ example: 'Supervisor', maxLength: 80 })
  @IsString() @MinLength(2) @MaxLength(80)
  nombre!: string;

  @ApiProperty({ example: 'supervisor', maxLength: 40, pattern: '^[a-z0-9_]+$' })
  @IsString() @MinLength(2) @MaxLength(40) @Matches(/^[a-z0-9_]+$/)
  codigo!: string;
}

class UpdateRolDto {
  @ApiPropertyOptional({ example: 'Supervisor Ventas', maxLength: 80 })
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  nombre?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ example: 3, minimum: 0, maximum: 999 })
  @IsOptional() @IsInt() @Min(0) @Max(999)
  orden?: number;
}

class RolPermisosBodyDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { enum: Object.values(NivelPermiso) },
    example: { dashboard: 'lectura', cotizaciones: 'edicion' },
  })
  @IsObject()
  permisos!: Partial<Record<PermisoModulo, NivelPermiso>>;
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles with permission flags' })
  async findAll(): Promise<{ success: true; data: any[] }> {
    const data = await this.rolesService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: any }> {
    const data = await this.rolesService.findById(id);
    return { success: true, data };
  }

  @Get(':id/permisos')
  @ApiOperation({ summary: 'Get role permission matrix' })
  async getPermisos(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: any }> {
    const data = await this.rolesService.getPermisos(id);
    return { success: true, data };
  }

  @Put(':id/permisos')
  @ApiOperation({ summary: 'Replace role permission matrix' })
  async setPermisos(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RolPermisosBodyDto,
  ): Promise<{ success: true; data: any }> {
    const data = await this.rolesService.setPermisos(id, body.permisos);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create custom role' })
  async create(@Body() body: CreateRolDto): Promise<{ success: true; data: any }> {
    const data = await this.rolesService.create(body);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role (name, active, order)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRolDto,
  ): Promise<{ success: true; data: any }> {
    const data = await this.rolesService.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete non-system role without users' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; data: null }> {
    await this.rolesService.remove(id);
    return { success: true, data: null };
  }
}
