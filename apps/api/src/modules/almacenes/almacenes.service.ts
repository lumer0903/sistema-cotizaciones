import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';

export interface AlmacenResponse {
  id_almacen: number;
  codigo: string;
  nombre: string;
  ubicacion: string | null;
  activo: boolean;
}

export interface PaginatedAlmacenesResponse {
  data: AlmacenResponse[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AlmacenesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 50,
    search?: string,
  ): Promise<PaginatedAlmacenesResponse> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { nombre: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.almacen.findMany({
        where,
        select: {
          id_almacen: true,
          codigo: true,
          nombre: true,
          ubicacion: true,
          activo: true,
        },
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.almacen.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number): Promise<AlmacenResponse | null> {
    const almacen = await this.prisma.almacen.findUnique({
      where: { id_almacen: id },
      select: {
        id_almacen: true,
        codigo: true,
        nombre: true,
        ubicacion: true,
        activo: true,
      },
    });
    return almacen;
  }

  async findByCodigo(codigo: string): Promise<AlmacenResponse | null> {
    const almacen = await this.prisma.almacen.findUnique({
      where: { codigo },
      select: {
        id_almacen: true,
        codigo: true,
        nombre: true,
        ubicacion: true,
        activo: true,
      },
    });
    return almacen;
  }

  async create(data: CreateAlmacenDto): Promise<AlmacenResponse> {
    try {
      const existing = await this.prisma.almacen.findUnique({
        where: { codigo: data.codigo },
      });
      if (existing) throw new ConflictException('El código de almacén ya existe');

      return this.prisma.almacen.create({
        data: {
          codigo: data.codigo,
          nombre: data.nombre,
          ubicacion: data.ubicacion,
          activo: true,
        },
        select: {
          id_almacen: true,
          codigo: true,
          nombre: true,
          ubicacion: true,
          activo: true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('El código de almacén ya existe');
      }
      throw error;
    }
  }

  async update(id: number, data: UpdateAlmacenDto): Promise<AlmacenResponse> {
    try {
      const existing = await this.prisma.almacen.findUnique({ where: { id_almacen: id } });
      if (!existing) throw new NotFoundException('Almacén no encontrado');

      if (data.codigo && data.codigo !== existing.codigo) {
        const dup = await this.prisma.almacen.findUnique({ where: { codigo: data.codigo } });
        if (dup) throw new ConflictException('El código de almacén ya existe');
      }

      return this.prisma.almacen.update({
        where: { id_almacen: id },
        data: {
          ...data,
          codigo: data.codigo,
          nombre: data.nombre,
          ubicacion: data.ubicacion,
          activo: data.activo,
        },
        select: {
          id_almacen: true,
          codigo: true,
          nombre: true,
          ubicacion: true,
          activo: true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Almacén no encontrado');
      }
      if (error.code === 'P2002') {
        throw new ConflictException('El código de almacén ya existe');
      }
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      const existing = await this.prisma.almacen.findUnique({ where: { id_almacen: id } });
      if (!existing) throw new NotFoundException('Almacén no encontrado');

      const hasStock = await this.prisma.stockActual.count({ where: { id_almacen: id } });
      if (hasStock > 0) throw new ConflictException('No se puede eliminar: tiene stock registrado');

      const hasMovements = await this.prisma.inventarioMovimiento.count({ where: { id_almacen: id } });
      if (hasMovements > 0) throw new ConflictException('No se puede eliminar: tiene movimientos registrados');

      await this.prisma.almacen.delete({ where: { id_almacen: id } });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Almacén no encontrado');
      }
      throw error;
    }
  }
}