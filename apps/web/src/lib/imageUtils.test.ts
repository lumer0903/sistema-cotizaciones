import { describe, it, expect } from 'vitest';
import { getImageUrl, getFileNameFromUrl } from './imageUtils';

describe('getFileNameFromUrl', () => {
  it('quita la querystring de una URL firmada de MinIO', () => {
    expect(
      getFileNameFromUrl(
        'http://localhost:9000/gc-bucket/productos/1790895775362-Section-1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=abc'
      )
    ).toBe('Section-1.png');
  });

  it('elimina el prefijo de timestamp que agrega el backend', () => {
    expect(getFileNameFromUrl('productos/1700000000000-Rosa-Roja.jpg')).toBe('Rosa-Roja.jpg');
  });

  it('decodifica caracteres escapados', () => {
    expect(getFileNameFromUrl('/images/mi%20imagen.webp')).toBe('mi imagen.webp');
  });

  it('conserva nombres sin timestamp ni querystring', () => {
    expect(getFileNameFromUrl('/uploads/foto.png')).toBe('foto.png');
  });

  it('tolera entradas vacías y rutas sin nombre de archivo', () => {
    expect(getFileNameFromUrl(null)).toBeNull();
    expect(getFileNameFromUrl(undefined)).toBeNull();
    expect(getFileNameFromUrl('')).toBeNull();
    expect(getFileNameFromUrl('http://cdn.test/')).toBeNull();
  });
});

describe('getImageUrl', () => {
  it('devuelve el placeholder cuando no hay imagen', () => {
    expect(getImageUrl(null)).toContain('placehold.co');
  });

  it('prefija rutas relativas con la base del API', () => {
    expect(getImageUrl('/images/foto.png')).toBe('http://localhost:3001/images/foto.png');
  });
});
