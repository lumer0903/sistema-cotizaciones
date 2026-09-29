import { describe, it, expect } from 'vitest';
import {
  formatCode,
  formatText,
  formatPrice,
  obtenerPreciosEstandarizados,
} from './formatters';

describe('formatCode', () => {
  it('normaliza a mayúsculas y recorta espacios', () => {
    expect(formatCode('  abc-01 ')).toBe('ABC-01');
  });

  it('tolera null y undefined', () => {
    expect(formatCode(null)).toBe('');
    expect(formatCode(undefined)).toBe('');
  });
});

describe('formatText', () => {
  it('capitaliza la primera letra de cada palabra', () => {
    expect(formatText('cemento portland CP 40')).toBe('Cemento Portland Cp 40');
  });
});

describe('formatPrice', () => {
  it('formatea números con 2 decimales y prefijo S/', () => {
    expect(formatPrice(1234.5)).toBe('S/ 1234.50');
  });

  it('convierte strings numéricos', () => {
    expect(formatPrice('9.9')).toBe('S/ 9.90');
  });

  it('valores no numéricos devuelven S/ 0.00', () => {
    expect(formatPrice('abc')).toBe('S/ 0.00');
    expect(formatPrice(NaN)).toBe('S/ 0.00');
  });
});

describe('obtenerPreciosEstandarizados', () => {
  it('lee el shape procesado (precioTienda/precioDistribuidor)', () => {
    const r = obtenerPreciosEstandarizados({
      precioTienda: { unidad: 10, docena: 110, mayor: 1000 },
      precioDistribuidor: { unidad: 8, docena: 90, mayor: 800 },
    });
    expect(r.tienda).toEqual({ unidad: 10, docena: 110, mayor: 1000 });
    expect(r.distribuidor).toEqual({ unidad: 8, docena: 90, mayor: 800 });
  });

  it('lee el shape raw de Prisma (precios anidados)', () => {
    const r = obtenerPreciosEstandarizados({
      precios: {
        precio_unidad_normal: 30.88,
        precio_docena_normal: 267.63,
        precio_mayor_normal: 2030.94,
        precio_unidad_dist: 26.81,
        precio_docena_dist: 232.29,
        precio_mayor_dist: 1762.79,
      },
    });
    expect(r.tienda.unidad).toBeCloseTo(30.88);
    expect(r.tienda.docena).toBeCloseTo(267.63);
    expect(r.distribuidor.unidad).toBeCloseTo(26.81);
  });

  it('sin producto devuelve la matriz en ceros', () => {
    expect(obtenerPreciosEstandarizados(null)).toEqual({
      tienda: { unidad: 0, docena: 0, mayor: 0 },
      distribuidor: { unidad: 0, docena: 0, mayor: 0 },
    });
  });
});
