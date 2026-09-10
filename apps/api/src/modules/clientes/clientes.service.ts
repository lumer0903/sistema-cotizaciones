import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TipoPrecio } from '@goldcontinent/shared/constants/enums';
import { Decimal } from '@prisma/client/runtime/library';

export interface ClienteResponse {
  id_cliente: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  ruc_dni: string | null;
  tipo: TipoPrecio;
  created_at: Date;
  diasCreditoDefecto: number | null;
  diasGracia: number | null;
  limiteCredito: number | null;
  tasaMora: number | null;
  updated_at: Date;
}

export interface PaginatedClientesResponse {
  data: ClienteResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateClienteDto {
  nombre: string;
  telefono?: string;
  email?: string;
  ruc_dni?: string;
  tipo?: TipoPrecio;
  diasCreditoDefecto?: number;
  diasGracia?: number;
  limiteCredito?: number;
  tasaMora?: number;
}

export interface UpdateClienteDto {
  nombre?: string;
  telefono?: string | null;
  email?: string | null;
  ruc_dni?: string | null;
  tipo?: TipoPrecio;
  diasCreditoDefecto?: number | null;
  diasGracia?: number | null;
  limiteCredito?: number | null;
  tasaMora?: number | null;
}

function toNumber(value: Decimal | number | null): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 50,
    search?: string,
  ): Promise<PaginatedClientesResponse> {
    const skip = (page - 1) * limit;
    const where: any = { deleted_at: null };

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { ruc_dni: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        select: {
          id_cliente: true,
          nombre: true,
          telefono: true,
          email: true,
          ruc_dni: true,
          tipo: true,
          created_at: true,
          diasCreditoDefecto: true,
          diasGracia: true,
          limiteCredito: true,
          tasaMora: true,
          updated_at: true,
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.cliente.count({ where }),
    ]);

    const mappedData = data.map(item => ({
      ...item,
      limiteCredito: toNumber(item.limiteCredito),
      tasaMora: toNumber(item.tasaMora),
    }));

    return { data: mappedData, total, page, limit };
  }

  async findById(id: number): Promise<ClienteResponse | null> {
    const item = await this.prisma.cliente.findUnique({
      where: { id_cliente: id, deleted_at: null },
      select: {
        id_cliente: true,
        nombre: true,
        telefono: true,
        email: true,
        ruc_dni: true,
        tipo: true,
        created_at: true,
        diasCreditoDefecto: true,
        diasGracia: true,
        limiteCredito: true,
        tasaMora: true,
        updated_at: true,
      },
    });

    if (!item) return null;

    return {
      ...item,
      limiteCredito: toNumber(item.limiteCredito),
      tasaMora: toNumber(item.tasaMora),
    };
  }

  async create(data: CreateClienteDto): Promise<ClienteResponse> {
    const item = await this.prisma.cliente.create({
      data: {
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email?.toLowerCase(),
        ruc_dni: data.ruc_dni,
        tipo: data.tipo ?? 'normal',
        diasCreditoDefecto: data.diasCreditoDefecto,
        diasGracia: data.diasGracia ?? 0,
        limiteCredito: data.limiteCredito ?? 0,
        tasaMora: data.tasaMora ?? 0,
      },
      select: {
        id_cliente: true,
        nombre: true,
        telefono: true,
        email: true,
        ruc_dni: true,
        tipo: true,
        created_at: true,
        diasCreditoDefecto: true,
        diasGracia: true,
        limiteCredito: true,
        tasaMora: true,
        updated_at: true,
      },
    });

    return {
      ...item,
      limiteCredito: toNumber(item.limiteCredito),
      tasaMora: toNumber(item.tasaMora),
    };
  }

  async update(id: number, data: UpdateClienteDto): Promise<ClienteResponse> {
    const item = await this.prisma.cliente.update({
      where: { id_cliente: id },
      data: {
        ...data,
        email: data.email?.toLowerCase(),
      },
      select: {
        id_cliente: true,
        nombre: true,
        telefono: true,
        email: true,
        ruc_dni: true,
        tipo: true,
        created_at: true,
        diasCreditoDefecto: true,
        diasGracia: true,
        limiteCredito: true,
        tasaMora: true,
        updated_at: true,
      },
    });

    return {
      ...item,
      limiteCredito: toNumber(item.limiteCredito),
      tasaMora: toNumber(item.tasaMora),
    };
  }

  async delete(id: number): Promise<void> {
    await this.prisma.cliente.update({
      where: { id_cliente: id },
      data: { deleted_at: new Date() },
    });
  }
}