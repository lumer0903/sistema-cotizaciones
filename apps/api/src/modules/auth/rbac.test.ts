import { describe, it, expect } from 'vitest';
import {
  permisosPorRol,
  permisosEfectivos,
  puede,
  overridesDiferentes,
  tieneOverrides,
  soloAdmin,
  soloAdminGerente,
  esMatrizBloqueada,
} from '@goldcontinent/shared/auth/rbac';

describe('rbac: matriz de permisos por rol', () => {
  it('admin tiene edicion en todos los módulos', () => {
    const permisos = permisosPorRol('admin');
    expect(Object.values(permisos).every((v) => v === 'edicion')).toBe(true);
  });

  it('gerente tiene lectura en configuracion y edicion en el resto', () => {
    const permisos = permisosPorRol('gerente');
    expect(permisos.configuracion).toBe('lectura');
    expect(permisos.cotizaciones).toBe('edicion');
  });

  it('vendedor no accede a usuarios/cobranza/configuración', () => {
    const permisos = permisosPorRol('vendedor');
    expect(permisos.usuarios).toBe('sin_acceso');
    expect(permisos.cobranza).toBe('sin_acceso');
    expect(permisos.configuracion).toBe('sin_acceso');
    expect(permisos.cotizaciones).toBe('edicion');
  });

  it('rol desconocido cae a los defaults de vendedor (fail safe)', () => {
    const permisos = permisosPorRol('rol-inexistente');
    expect(permisos.usuarios).toBe('sin_acceso');
    expect(permisos.cotizaciones).toBe('edicion');
  });
});

describe('rbac: puede()', () => {
  it('usuario null → sin acceso', () => {
    expect(puede(null, 'dashboard')).toBe(false);
  });

  it('vendedor puede lectura en productos pero no edición', () => {
    const vendedor = { rol: 'vendedor' };
    expect(puede(vendedor, 'productos', 'lectura')).toBe(true);
    expect(puede(vendedor, 'productos', 'edicion')).toBe(false);
  });

  it('vendedor no puede usuarios aunque pida lectura', () => {
    expect(puede({ rol: 'vendedor' }, 'usuarios', 'lectura')).toBe(false);
  });

  it('override del usuario puede elevar el nivel', () => {
    const usuario = { rol: 'vendedor', permisos: { usuarios: 'edicion' as const } };
    expect(puede(usuario, 'usuarios', 'edicion')).toBe(true);
  });

  it('override del usuario puede rebajar el nivel (admin restringido)', () => {
    const usuario = { rol: 'admin', permisos: { reportes: 'sin_acceso' as const } };
    expect(puede(usuario, 'reportes', 'lectura')).toBe(false);
  });
});

describe('rbac: permisos efectivos y overrides', () => {
  it('permisosEfectivos aplica overrides sobre los defaults', () => {
    const efectivos = permisosEfectivos('vendedor', { cobranza: 'lectura' });
    expect(efectivos.cobranza).toBe('lectura');
    expect(efectivos.cotizaciones).toBe('edicion');
  });

  it('permisosEfectivos sin overrides devuelve los defaults', () => {
    const efectivos = permisosEfectivos('admin');
    expect(efectivos).toEqual(permisosPorRol('admin'));
  });

  it('overridesDiferentes sólo devuelve lo que difiere del rol', () => {
    const overrides = overridesDiferentes('vendedor', {
      ...permisosPorRol('vendedor'),
      reportes: 'edicion',
    });
    expect(overrides).toEqual({ reportes: 'edicion' });
  });

  it('tieneOverrides distingue null/vacío de personalización real', () => {
    expect(tieneOverrides(null)).toBe(false);
    expect(tieneOverrides({})).toBe(false);
    expect(tieneOverrides({ productos: 'lectura' })).toBe(true);
  });
});

describe('rbac: guards de rol', () => {
  it('soloAdmin acepta sólo admin', () => {
    expect(soloAdmin({ rol: 'admin' })).toBe(true);
    expect(soloAdmin({ rol: 'gerente' })).toBe(false);
    expect(soloAdmin({ rol: 'vendedor' })).toBe(false);
    expect(soloAdmin(null)).toBe(false);
  });

  it('soloAdminGerente acepta admin y gerente', () => {
    expect(soloAdminGerente({ rol: 'admin' })).toBe(true);
    expect(soloAdminGerente({ rol: 'gerente' })).toBe(true);
    expect(soloAdminGerente({ rol: 'vendedor' })).toBe(false);
  });

  it('esMatrizBloqueada sólo admin/superadmin', () => {
    expect(esMatrizBloqueada('admin')).toBe(true);
    expect(esMatrizBloqueada('superadmin')).toBe(true);
    expect(esMatrizBloqueada('gerente')).toBe(false);
    expect(esMatrizBloqueada('vendedor')).toBe(false);
  });
});
