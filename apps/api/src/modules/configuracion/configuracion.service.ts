import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ConfiguracionService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const configs = await this.prisma.configuracion.findMany();
    return Object.fromEntries(configs.map(c => [c.clave, c.valor]));
  }

  async get(clave: string): Promise<string | null> {
    const c = await this.prisma.configuracion.findUnique({ where: { clave } });
    return c?.valor ?? null;
  }

  async set(clave: string, valor: string, descripcion?: string): Promise<void> {
    await this.prisma.configuracion.upsert({
      where: { clave },
      create: { clave, valor, descripcion },
      update: { valor, ...(descripcion !== undefined ? { descripcion } : {}) },
    });
  }
}