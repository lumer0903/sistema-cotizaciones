import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PermisoModulo, NivelPermiso } from '@goldcontinent/shared/constants/enums';
import {
  permisosEfectivos,
  overridesDiferentes,
  OverridesPermisos,
  MapaPermisos,
} from '@goldcontinent/shared/auth/rbac';

const USER_SELECT = {
  id_usuario: true,
  nombre: true,
  email: true,
  rol: true,
  avatar_url: true,
  activo: true,
  created_at: true,
  updated_at: true,
} as const;

export interface UsuarioResponse {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: string;
  avatar_url: string | null;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedUsuariosResponse {
  data: UsuarioResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateUsuarioData {
  nombre?: string;
  email?: string;
  password?: string;
  rol?: string;
  avatar_url?: string | null;
  activo?: boolean;
}

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 50, search?: string): Promise<PaginatedUsuariosResponse> {
    const skip = (page - 1) * limit;
    const where: any = { deleted_at: null };

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number): Promise<UsuarioResponse | null> {
    return this.prisma.usuario.findFirst({
      where: { id_usuario: id, deleted_at: null },
      select: USER_SELECT,
    });
  }

  async create(data: {
    nombre: string;
    email: string;
    password: string;
    rol?: string;
  }): Promise<UsuarioResponse> {
    const rol = data.rol || 'vendedor';
    await this.assertRolValido(rol);

    try {
      const bcrypt = require('bcryptjs');
      const password_hash = await bcrypt.hash(data.password, 10);

      return await this.prisma.usuario.create({
        data: {
          nombre: data.nombre,
          email: data.email.toLowerCase(),
          password_hash,
          rol,
        },
        select: USER_SELECT,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
  }

  async update(id: number, data: UpdateUsuarioData, actorId?: number): Promise<UsuarioResponse> {
    const existing = await this.prisma.usuario.findFirst({
      where: { id_usuario: id, deleted_at: null },
      select: { id_usuario: true, email: true, rol: true, activo: true },
    });
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    const updateData: any = {};

    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.rol !== undefined) {
      await this.assertRolValido(data.rol);
      updateData.rol = data.rol;
    }
    if (data.avatar_url !== undefined) {
      updateData.avatar_url = data.avatar_url === null ? null : this.assertAvatar(data.avatar_url);
    }
    if (data.activo !== undefined) {
      await this.assertCanChangeActivo(id, data.activo, existing, actorId);
      updateData.activo = data.activo;
    }

    if (data.password) {
      const bcrypt = require('bcryptjs');
      updateData.password_hash = await bcrypt.hash(data.password, 10);
      updateData.refresh_token_hash = null;
    }

    if (Object.keys(updateData).length === 0) {
      return (await this.findById(id)) as UsuarioResponse;
    }

    try {
      return await this.prisma.usuario.update({
        where: { id_usuario: id },
        data: updateData,
        select: USER_SELECT,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
  }

  async updateActivo(id: number, activo: boolean, actorId?: number): Promise<UsuarioResponse> {
    const existing = await this.prisma.usuario.findFirst({
      where: { id_usuario: id, deleted_at: null },
      select: { id_usuario: true, email: true, rol: true, activo: true },
    });
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    await this.assertCanChangeActivo(id, activo, existing, actorId);

    return this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { activo },
      select: USER_SELECT,
    });
  }

  async getPermisos(id: number): Promise<OverridesPermisos> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id_usuario: id, deleted_at: null },
      select: { id_usuario: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const rows = await this.prisma.usuarioPermiso.findMany({
      where: { id_usuario: id },
    });

    const overrides: OverridesPermisos = {};
    for (const row of rows) {
      overrides[row.modulo as PermisoModulo] = row.nivel as NivelPermiso;
    }
    return overrides;
  }

  async setPermisos(
    id: number,
    permisos: Partial<Record<PermisoModulo, NivelPermiso>>,
  ): Promise<OverridesPermisos> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id_usuario: id, deleted_at: null },
      select: { id_usuario: true, rol: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const validos = Object.values(PermisoModulo);
    const overrides: OverridesPermisos = {};
    for (const modulo of validos) {
      const nivel = permisos[modulo];
      if (nivel && Object.values(NivelPermiso).includes(nivel)) {
        overrides[modulo] = nivel;
      }
    }

    await this.prisma.$transaction([
      this.prisma.usuarioPermiso.deleteMany({ where: { id_usuario: id } }),
      ...(Object.keys(overrides).length
        ? [
            this.prisma.usuarioPermiso.createMany({
              data: Object.entries(overrides).map(([modulo, nivel]) => ({
                id_usuario: id,
                modulo: modulo as PermisoModulo,
                nivel: nivel as NivelPermiso,
              })),
            }),
          ]
        : []),
    ]);

    return overrides;
  }

  async getPermisosEfectivos(id: number, rol: string): Promise<MapaPermisos> {
    const overrides = await this.getPermisos(id);
    return permisosEfectivos(rol, overrides);
  }

  /** Calcula overrides a persistir (solo lo que difiere del rol). */
  static overridesParaGuardar(
    rol: string,
    efectivos: MapaPermisos,
  ): OverridesPermisos {
    return overridesDiferentes(rol, efectivos);
  }

  private assertAvatar(value: string): string {
    const trimmed = value?.trim() ?? '';
    if (!trimmed.startsWith('data:image/')) {
      throw new BadRequestException('La foto debe ser una imagen (data URL)');
    }
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) {
      throw new BadRequestException('Formato de imagen no soportado (usa PNG, JPEG o WebP)');
    }
    if (Math.floor((trimmed.length * 3) / 4) > 512 * 1024) {
      throw new BadRequestException('La imagen supera el máximo de 512 KB');
    }
    return trimmed;
  }

  private async assertRolValido(codigo: string): Promise<void> {
    const rol = await this.prisma.rol.findFirst({
      where: { codigo, activo: true },
      select: { id_rol: true },
    });
    if (!rol) {
      throw new BadRequestException('El rol indicado no existe o está inactivo');
    }
  }

  private async assertCanChangeActivo(
    id: number,
    activo: boolean,
    existing: { id_usuario: number; rol: string; activo: boolean },
    actorId?: number,
  ): Promise<void> {
    if (actorId != null && id === actorId && !activo) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }

    if (activo) return;

    if (existing.rol === 'admin' && existing.activo) {
      const otrosAdmins = await this.prisma.usuario.count({
        where: {
          rol: 'admin',
          activo: true,
          deleted_at: null,
          id_usuario: { not: id },
        },
      });
      if (otrosAdmins === 0) {
        throw new BadRequestException('No se puede desactivar el único administrador activo');
      }
    }
  }
}
