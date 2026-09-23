export const formatCode = (code: string | undefined | null): string => (code || '').toUpperCase().trim();

export const formatText = (text: string): string =>
  text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const formatPrice = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'S/ 0.00';
  return `S/ ${num.toFixed(2)}`;
};

/**
 * Normaliza y extrae la matriz de los 6 precios (Tienda y Distribuidor) 
 * desde cualquier estructura de objeto `producto` (raw Prisma o transformado).
 */
export const obtenerPreciosEstandarizados = (producto: any) => {
  if (!producto) {
    return {
      tienda: { unidad: 0, docena: 0, mayor: 0 },
      distribuidor: { unidad: 0, docena: 0, mayor: 0 },
    };
  }

  // Caso 1: Si el producto ya viene procesado (como en PriceCard / ProductoConsulta)
  if (producto.precioTienda || producto.precioDistribuidor) {
    return {
      tienda: {
        unidad: Number(producto.precioTienda?.unidad || 0),
        docena: Number(producto.precioTienda?.docena || 0),
        mayor: Number(producto.precioTienda?.mayor || 0),
      },
      distribuidor: {
        unidad: Number(producto.precioDistribuidor?.unidad || 0),
        docena: Number(producto.precioDistribuidor?.docena || 0),
        mayor: Number(producto.precioDistribuidor?.mayor || 0),
      },
    };
  }

  // Caso 2: Si viene como objeto raw de base de datos/Prisma (precios_actuales o precios)
  const p = producto.precios_actuales || producto.precios || producto;

  return {
    tienda: {
      unidad: Number(p.precio_unidad_normal ?? p.precioTiendaUnidad ?? 0),
      docena: Number(p.precio_docena_normal ?? p.precioTiendaDocena ?? 0),
      mayor: Number(p.precio_mayor_normal ?? p.precioTiendaMayor ?? 0),
    },
    distribuidor: {
      unidad: Number(p.precio_unidad_dist ?? p.precioDistribuidorUnidad ?? 0),
      docena: Number(p.precio_docena_dist ?? p.precioDistribuidorDocena ?? 0),
      mayor: Number(p.precio_mayor_dist ?? p.precioDistribuidorMayor ?? 0),
    },
  };
};