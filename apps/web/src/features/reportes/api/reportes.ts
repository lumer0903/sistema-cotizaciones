import { apiClient } from '@/lib/apiClient';
import type { DetalleReporte } from '@/features/reportes/types';

export async function fetchReporteDetalle(): Promise<DetalleReporte> {
  const response = await apiClient<{ success: boolean; data: DetalleReporte }>('/dashboard/detalle');
  return response.data;
}