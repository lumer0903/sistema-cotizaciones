import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // En desarrollo staleTime = 0 para refrescar reactivamente al invalidar o enfocar.
        // En producción mantenemos 30s para optimizar peticiones ráfaga.
        staleTime: process.env.NODE_ENV === 'development' ? 0 : 30_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return createQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
}

export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    kpis: (filters?: unknown) => ['dashboard', 'kpis', filters ?? {}] as const,
    graficos: (filters?: unknown) => ['dashboard', 'graficos', filters ?? {}] as const,
    stockBajo: (filters?: unknown) => ['dashboard', 'stock-bajo', filters ?? {}] as const,
    cobranzaPendiente: ['dashboard', 'cobranza-pendiente'] as const,
  },
  inventario: {
    all: ['inventario'] as const,
    productos: (params?: unknown) => ['productos', params ?? {}] as const,
    movimientos: (params?: unknown) => ['inventario', 'movimientos', params ?? {}] as const,
    stock: (params?: unknown) => ['inventario', 'stock', params ?? {}] as const,
    kardex: (id?: unknown) => ['inventario', 'kardex', id] as const,
    alertas: ['inventario', 'alertas'] as const,
  },
  precios: {
    all: ['precios'] as const,
    list: (params?: unknown) => ['precios', params ?? {}] as const,
    historial: (id?: unknown) => ['historial-precios', id] as const,
    categorias: ['precios', 'categorias'] as const,
  },
  cotizaciones: {
    all: ['cotizaciones'] as const,
    list: (params?: unknown) => ['cotizaciones', params ?? {}] as const,
    detail: (id?: unknown) => ['cotizaciones', id] as const,
  },
};

/**
 * Invalida consultas de Inventario y métricas asociadas en Dashboard
 */
export async function invalidateInventarioQueries(): Promise<void> {
  const qc = getQueryClient();
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.inventario.all }),
    qc.invalidateQueries({ queryKey: ['productos'] }),
    qc.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
  ]);
}

/**
 * Invalida consultas de Precios y métricas asociadas en Dashboard
 */
export async function invalidatePreciosQueries(): Promise<void> {
  const qc = getQueryClient();
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.precios.all }),
    qc.invalidateQueries({ queryKey: ['historial-precios'] }),
    qc.invalidateQueries({ queryKey: ['precios-catalogo'] }),
    qc.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
  ]);
}

/**
 * Invalida consultas de Cotizaciones y métricas del Dashboard
 */
export async function invalidateCotizacionesQueries(): Promise<void> {
  const qc = getQueryClient();
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.cotizaciones.all }),
    qc.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    qc.invalidateQueries({ queryKey: ['cobranza'] }),
  ]);
}

/**
 * Invalida todas las métricas del Dashboard
 */
export async function invalidateDashboardQueries(): Promise<void> {
  const qc = getQueryClient();
  await qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}

/**
 * Invalida todas las consultas de la aplicación
 */
export async function invalidateAllQueries(): Promise<void> {
  const qc = getQueryClient();
  await qc.invalidateQueries();
}
