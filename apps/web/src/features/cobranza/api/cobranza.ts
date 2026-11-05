import { apiClient } from '@/lib/apiClient';
import type { CuentaPorCobrar } from '@/types/cobranza';

export interface CobranzaFilters {
  page?: number;
  limit?: number;
  q?: string;
  estado_cobranza?: string;
  tipo_cliente?: string;
  mora?: string;
}

export interface CobranzaResponse {
  data: CuentaPorCobrar[];
  total: number;
}

export async function fetchCobranza(filters: CobranzaFilters = {}): Promise<CobranzaResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.q) params.append('q', filters.q);
  if (filters.estado_cobranza) params.append('estado_cobranza', filters.estado_cobranza);
  if (filters.tipo_cliente) params.append('tipo_cliente', filters.tipo_cliente);
  if (filters.mora) params.append('mora', filters.mora);

  const response = await apiClient<{ success: boolean; data: CuentaPorCobrar[]; total: number }>(
    `/cobranza?${params.toString()}`
  );

  return {
    data: response.data ?? [],
    total: Number(response.total ?? 0),
  };
}

export async function fetchCobranzaForExport(filters: Omit<CobranzaFilters, 'page' | 'limit'> = {}): Promise<CuentaPorCobrar[]> {
  const params = new URLSearchParams({ page: '1', limit: '5000' });
  if (filters.q) params.append('q', filters.q);
  if (filters.estado_cobranza) params.append('estado_cobranza', filters.estado_cobranza);
  if (filters.tipo_cliente) params.append('tipo_cliente', filters.tipo_cliente);
  if (filters.mora) params.append('mora', filters.mora);

  const response = await apiClient<{ success: boolean; data: CuentaPorCobrar[] }>(
    `/cobranza?${params.toString()}`
  );

  return response.data ?? [];
}