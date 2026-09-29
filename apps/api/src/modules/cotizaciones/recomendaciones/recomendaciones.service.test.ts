import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { RecomendacionesService } from './recomendaciones.service';
import { IAiService } from '../../ai/domain/contracts/ai-service.interface';

function makeService() {
  const prisma = {
    producto: { findUnique: vi.fn().mockResolvedValue({ id_producto: 7 }) },
    cliente: { findUnique: vi.fn() },
    stockActual: { findUnique: vi.fn(), findFirst: vi.fn() },
    preciosActuales: { findUnique: vi.fn() },
    iaInteracciones: { create: vi.fn().mockResolvedValue({}) },
  };
  const aiService = {
    recommendItem: vi.fn().mockResolvedValue({ similar: [], upsell: [], equilibrio: [] }),
    generateQuoteSuggestions: vi.fn(),
  };
  const service = new RecomendacionesService(
    prisma as any,
    aiService as unknown as IAiService,
  );
  return { service, prisma, aiService };
}

describe('RecomendacionesService — esquema de precio hacia FastAPI /suggest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envía precio_docena_dist para distribuidor + DOCENA', async () => {
    const { service, aiService } = makeService();

    await service.recomendarItem(
      { id_producto_base: 7, tipo_precio: 'distribuidor', tipo_venta: 'DOCENA' },
      1,
    );

    expect(aiService.recommendItem).toHaveBeenCalledWith({
      id_producto: 7,
      id_cliente: undefined,
      id_almacen: undefined,
      tipo_precio: 'precio_docena_dist',
    });
  });

  it('envía precio_mayor_normal para tienda + MAYOR', async () => {
    const { service, aiService } = makeService();

    await service.recomendarItem(
      { id_producto_base: 7, tipo_precio: 'normal', tipo_venta: 'mayor' },
      1,
    );

    expect(aiService.recommendItem).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_precio: 'precio_mayor_normal' }),
    );
  });

  it('fallback a precio_unidad_normal si tipo_venta o tipo de precio no vienen', async () => {
    const { service, aiService } = makeService();

    await service.recomendarItem({ id_producto_base: 7 }, 1);

    expect(aiService.recommendItem).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_precio: 'precio_unidad_normal' }),
    );
  });

  it('fallback a precio_unidad_normal si solo viene id_cliente sin tipo_venta', async () => {
    const { service, aiService, prisma } = makeService();
    prisma.cliente.findUnique.mockResolvedValue({ tipo: 'distribuidor' });

    await service.recomendarItem({ id_producto_base: 7, id_cliente: 3 }, 1);

    expect(aiService.recommendItem).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_precio: 'precio_unidad_normal' }),
    );
  });

  it('404 si el producto base no existe', async () => {
    const { service, prisma } = makeService();
    prisma.producto.findUnique.mockResolvedValue(null);

    await expect(
      service.recomendarItem({ id_producto_base: 999, tipo_venta: 'UNIDAD' }, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('500 si el microservicio IA falla', async () => {
    const { service, aiService } = makeService();
    aiService.recommendItem.mockRejectedValue(new Error('connection refused'));

    await expect(
      service.recomendarItem({ id_producto_base: 7, tipo_venta: 'UNIDAD' }, 1),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
