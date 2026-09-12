import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CategoriaResponse {
  id_categoria: number;
  nombre_categoria: string;
}

export interface PaginatedCategoriasResponse {
  data: CategoriaResponse[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 100): Promise<PaginatedCategoriasResponse> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.categoria.findMany({
        select: {
          id_categoria: true,
          nombre_categoria: true,
        },
        skip,
        take: limit,
        orderBy: { nombre_categoria: 'asc' },
      }),
      this.prisma.categoria.count(),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number): Promise<CategoriaResponse | null> {
    return this.prisma.categoria.findUnique({
      where: { id_categoria: id },
      select: {
        id_categoria: true,
        nombre_categoria: true,
      },
    });
  }

  async create(nombre_categoria: string): Promise<CategoriaResponse> {
    try {
      return this.prisma.categoria.create({
        data: { nombre_categoria },
        select: {
          id_categoria: true,
          nombre_categoria: true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('La categoría ya existe');
      }
      throw error;
    }
  }

  async update(id: number, nombre_categoria: string): Promise<CategoriaResponse> {
    try {
      return this.prisma.categoria.update({
        where: { id_categoria: id },
        data: { nombre_categoria },
        select: {
          id_categoria: true,
          nombre_categoria: true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Categoría no encontrada');
      }
      if (error.code === 'P2002') {
        throw new ConflictException('La categoría ya existe');
      }
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.categoria.delete({
        where: { id_categoria: id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Categoría no encontrada');
      }
      throw error;
    }
  }
}