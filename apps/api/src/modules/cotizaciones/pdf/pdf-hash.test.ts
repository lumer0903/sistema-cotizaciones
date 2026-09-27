import { describe, it, expect } from 'vitest';
import { computePdfHash } from './pdf-hash';

const COT = {
  id_cotizacion: 1,
  numero: 'COT-001',
  estado: 'borrador',
  created_at: new Date('2026-09-26T10:00:00Z'),
  tipo_precio: 'normal',
  fecha_vencimiento: null,
  observaciones: 'Entrega en 3 días',
  incluye_carreta: true,
  costo_carreta: 15,
  cliente: { nombre: 'Ana', ruc_dni: '123', telefono: '999', email: 'a@b.com' },
  detalle: [
    {
      id_producto: 11,
      cantidad: 2,
      precio_unitario: 10.5,
      color_notas: null,
      producto: { codigo: 'ROS-01', descripcion: 'Rosa roja' },
    },
  ],
};

describe('computePdfHash', () => {
  it('es determinista para los mismos datos', () => {
    expect(computePdfHash(COT)).toBe(computePdfHash({ ...COT }));
  });

  it('cambia si cambia el precio de un ítem', () => {
    const otra = {
      ...COT,
      detalle: [{ ...COT.detalle[0], precio_unitario: 11 }],
    };
    expect(computePdfHash(otra)).not.toBe(computePdfHash(COT));
  });

  it('cambia si cambia el estado (badge del PDF)', () => {
    expect(computePdfHash({ ...COT, estado: 'enviada' })).not.toBe(computePdfHash(COT));
  });

  it('cambia si cambia la cantidad o el detalle', () => {
    const sinDetalle = { ...COT, detalle: [] };
    expect(computePdfHash(sinDetalle)).not.toBe(computePdfHash(COT));
  });

  it('cambia si cambia el cliente', () => {
    const otroCliente = { ...COT, cliente: { ...COT.cliente, nombre: 'Luis' } };
    expect(computePdfHash(otroCliente)).not.toBe(computePdfHash(COT));
  });

  it('cambia si cambia el costo de carreta', () => {
    expect(computePdfHash({ ...COT, costo_carreta: 20 })).not.toBe(computePdfHash(COT));
  });
});
