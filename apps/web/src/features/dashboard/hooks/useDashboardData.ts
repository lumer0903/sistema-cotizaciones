'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  DashboardKpis,
  DashboardGraficos,
  AlertaStockBajo,
} from '../types/dashboard';

/**
 * Filtros globales del dashboard. Se agregan a los queryKeys para que cada
 * combinación de filtros tenga su propia entrada de caché en React Query.
 * (Los endpoints los consumirán en el Sprint de filtros.)
 */
export interface DashboardFilters {
  fechaInicio?: string;
  fechaFin?: string;
  idVendedor?: number;
  idAlmacen?: number;
}

async function fetcher<T>(path: string): Promise<T> {
  const response = await apiClient<{ success: boolean; data: T }>(path);
  return response.data;
}

function buildPath(base: string, filters?: DashboardFilters): string {
  if (!filters) return base;
  const params = new URLSearchParams();
  if (filters.fechaInicio) params.set('fechaInicio', filters.fechaInicio);
  if (filters.fechaFin) params.set('fechaFin', filters.fechaFin);
  if (filters.idVendedor) params.set('idVendedor', String(filters.idVendedor));
  if (filters.idAlmacen) params.set('idAlmacen', String(filters.idAlmacen));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Carga del dashboard en 3 fetches independientes y en paralelo:
 *  - `kpis`:      tarjetas numéricas (pintan de inmediato).
 *  - `graficos`:  agregaciones para Recharts (render progresivo).
 *  - `stockBajo`: top ≤ 10 con stock bajo.
 *
 * `staleTime` 30s (heredado del QueryClient) alineado con la caché TTL del API.
 */
export function useDashboardData(filters?: DashboardFilters) {
  const kpis: UseQueryResult<DashboardKpis> = useQuery({
    queryKey: ['dashboard', 'kpis', filters ?? {}],
    queryFn: () => fetcher<DashboardKpis>(buildPath('/dashboard/kpis', filters)),
  });

  const graficos: UseQueryResult<DashboardGraficos> = useQuery({
    queryKey: ['dashboard', 'graficos', filters ?? {}],
    queryFn: () => fetcher<DashboardGraficos>(buildPath('/dashboard/graficos', filters)),
  });

  const stockBajo: UseQueryResult<AlertaStockBajo[]> = useQuery({
    queryKey: ['dashboard', 'stock-bajo', filters ?? {}],
    queryFn: () => fetcher<AlertaStockBajo[]>(buildPath('/dashboard/stock-bajo', filters)),
  });

  return {
    kpis,
    graficos,
    stockBajo,
    /** Las KPIs son el contenido prioritario: su loading gobierna el skeleton. */
    isLoading: kpis.isLoading,
    isError: kpis.isError || graficos.isError || stockBajo.isError,
    refetchAll: () => Promise.all([kpis.refetch(), graficos.refetch(), stockBajo.refetch()]),
  };
}
