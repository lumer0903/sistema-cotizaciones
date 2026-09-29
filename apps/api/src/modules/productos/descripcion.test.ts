import { describe, it, expect } from 'vitest';
import {
  generarDescripcionProducto,
  resolverEsquemaPrecio,
  PRECIO_ESQUEMAS,
} from '@goldcontinent/shared/constants/descripcion';

describe('generarDescripcionProducto', () => {
  it('concatena código y características con etiquetas en MAYÚSCULAS', () => {
    const resultado = generarDescripcionProducto({
      codigo: 'RYG9-J-02',
      tipo_flor: 'Rosa',
      material: 'Tela Seda',
      composicion: 'Plastico',
      presentacion: 'Vara X 9 Flores',
      follaje: 'Verde',
      numero_cabezas: 9,
      tamano: '40 cm',
      unidades_por_caja: 12,
    });

    expect(resultado).toBe(
      'RYG9-J-02 ROSA MATERIAL TELA SEDA COMPOSICION PLASTICO PRESENTACION VARA X 9 FLORES ' +
        'FOLLAJE VERDE 9 CABEZAS 40 CM (CAJA X 12 UNID)',
    );
  });

  it('omite partes vacías, null y el marcador "-" del CSV', () => {
    const resultado = generarDescripcionProducto({
      codigo: 'JLP-28G',
      tipo_flor: '-',
      material: 'Plastico',
      composicion: null,
      presentacion: '',
      follaje: undefined,
      numero_cabezas: 0,
      tamano: '105*17 CM',
      unidades_por_caja: 1,
    });

    expect(resultado).toBe('JLP-28G MATERIAL PLASTICO 105*17 CM');
    expect(resultado).not.toContain('CABEZAS');
    expect(resultado).not.toContain('CAJA');
    expect(resultado).not.toContain('FOLLAJE');
  });

  it('normaliza espacios repetidos y minusculas del usuario', () => {
    const resultado = generarDescripcionProducto({
      codigo: '  ryg9-j-02 ',
      material: '  tela   seda ',
    });

    expect(resultado).toBe('RYG9-J-02 MATERIAL TELA SEDA');
  });

  it('devuelve string vacío sin atributos', () => {
    expect(generarDescripcionProducto({})).toBe('');
    expect(generarDescripcionProducto({ material: '-', numero_cabezas: null })).toBe('');
  });

  it('incluye unidades por caja solo si es mayor a 1', () => {
    expect(generarDescripcionProducto({ codigo: 'X', unidades_por_caja: 1 })).toBe('X');
    expect(generarDescripcionProducto({ codigo: 'X', unidades_por_caja: 24 })).toBe(
      'X (CAJA X 24 UNID)',
    );
  });
});

describe('resolverEsquemaPrecio (los 6 esquemas + fallback)', () => {
  it('mapea tipo de precio y tipo de venta a los 6 esquemas', () => {
    expect(resolverEsquemaPrecio('normal', 'UNIDAD')).toBe('precio_unidad_normal');
    expect(resolverEsquemaPrecio('tienda', 'DOCENA')).toBe('precio_docena_normal');
    expect(resolverEsquemaPrecio('normal', 'MAYOR')).toBe('precio_mayor_normal');
    expect(resolverEsquemaPrecio('distribuidor', 'unidad')).toBe('precio_unidad_dist');
    expect(resolverEsquemaPrecio('DISTRIBUIDOR', 'docena')).toBe('precio_docena_dist');
    expect(resolverEsquemaPrecio('distribuidor', 'caja')).toBe('precio_mayor_dist');
  });

  it('fallback a precio_unidad_normal con valores undefined/null/desconocidos', () => {
    expect(resolverEsquemaPrecio(undefined, undefined)).toBe('precio_unidad_normal');
    expect(resolverEsquemaPrecio(null, null)).toBe('precio_unidad_normal');
    expect(resolverEsquemaPrecio('normal', undefined)).toBe('precio_unidad_normal');
    expect(resolverEsquemaPrecio(undefined, 'DOCENA')).toBe('precio_unidad_normal');
    expect(resolverEsquemaPrecio('otra_cosa', 'otra')).toBe('precio_unidad_normal');
  });

  it('solo produce valores de los 6 esquemas permitidos', () => {
    for (const tipoPrecio of ['normal', 'distribuidor', 'x', undefined]) {
      for (const tipoVenta of ['UNIDAD', 'DOCENA', 'MAYOR', 'otro', undefined]) {
        expect(PRECIO_ESQUEMAS).toContain(resolverEsquemaPrecio(tipoPrecio, tipoVenta));
      }
    }
  });
});
