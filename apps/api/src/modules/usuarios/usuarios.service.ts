import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Rol } from '@goldcontinent/shared/constants/enums';

export interface UsuarioResponse {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: Rol;
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

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 50, search?: string): Promise<PaginatedUsuariosResponse> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: {
          id_usuario: true,
          nombre: true,
          email: true,
          rol: true,
          activo: true,
          created_at: true,
          updated_at: true,
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number): Promise<UsuarioResponse | null> {
    return this.prisma.usuario.findUnique({
      where: { id_usuario: id },
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async updateActivo(id: number, activo: boolean): Promise<UsuarioResponse> {
    return this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { activo },
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async create(data: { nombre: string; email: string; password: string; rol?: Rol }): Promise<UsuarioResponse> {
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(data.password, 10);

    return this.prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email.toLowerCase(),
        password_hash,
        rol: data.rol || 'vendedor',
      },
      select: {
        id_usuario: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { deleted_at: new Date() },
    });
  }
}