import { apiClient } from '@/lib/apiClient';
import type {
  FiltrosReporte,
  RankingProductosResponse,
  AntiguedadDeudaResponse,
  AuditoriaIaResponse,
  DetalleReporte,
} from '@/features/reportes/types';

function buildQuery(filtros?: FiltrosReporte, take = 20, skip = 0): string {
  const params = new URLSearchParams();
  if (filtros?.fechaInicio) params.set('fechaInicio', filtros.fechaInicio);
  if (filtros?.fechaFin) params.set('fechaFin', filtros.fechaFin);
  if (filtros?.idVendedor) params.set('idVendedor', String(filtros.idVendedor));
  if (filtros?.idAlmacen) params.set('idAlmacen', String(filtros.idAlmacen));
  if (filtros?.idCliente) params.set('idCliente', String(filtros.idCliente));
  if (filtros?.idProducto) params.set('idProducto', String(filtros.idProducto));
  params.set('take', String(take));
  params.set('skip', String(skip));
  return params.toString();
}

/** Ranking de productos más vendidos. */
export async function fetchRankingProductos(
  filtros?: FiltrosReporte,
  take = 20,
  skip = 0,
): Promise<RankingProductosResponse> {
  const qs = buildQuery(filtros, take, skip);
  const response = await apiClient<RankingProductosResponse & { success: boolean }>(
    `/reportes/ranking-productos?${qs}`,
  );
  return response;
}

/** Antigüedad de deuda / cuentas por cobrar. */
export async function fetchAntiguedadDeuda(
  filtros?: FiltrosReporte,
  take = 20,
  skip = 0,
): Promise<AntiguedadDeudaResponse> {
  const qs = buildQuery(filtros, take, skip);
  const response = await apiClient<AntiguedadDeudaResponse & { success: boolean }>(
    `/reportes/antiguedad-deuda?${qs}`,
  );
  return response;
}

/** Auditoría de interacciones IA. */
export async function fetchAuditoriaIa(
  filtros?: FiltrosReporte,
  take = 20,
  skip = 0,
): Promise<AuditoriaIaResponse> {
  const qs = buildQuery(filtros, take, skip);
  const response = await apiClient<AuditoriaIaResponse & { success: boolean }>(
    `/reportes/auditoria-ia?${qs}`,
  );
  return response;
}

/** Exporta un reporte a CSV. */
export async function exportarReporte(
  tipo: 'ranking-productos' | 'antiguedad-deuda' | 'auditoria-ia',
  filtros?: FiltrosReporte,
): Promise<Blob> {
  const params = new URLSearchParams();
  if (filtros?.fechaInicio) params.set('fechaInicio', filtros.fechaInicio);
  if (filtros?.fechaFin) params.set('fechaFin', filtros.fechaFin);
  if (filtros?.idVendedor) params.set('idVendedor', String(filtros.idVendedor));
  if (filtros?.idAlmacen) params.set('idAlmacen', String(filtros.idAlmacen));
  if (filtros?.idCliente) params.set('idCliente', String(filtros.idCliente));
  if (filtros?.idProducto) params.set('idProducto', String(filtros.idProducto));
  // take grande para exportar todo (el backend limita a MAX_TAKE=50, así que paginamos en frontend si hace falta)
  params.set('take', '50');
  params.set('skip', '0');

  const response = await fetch(`/api/reportes/${tipo}?${params.toString()}`, {
    headers: { Accept: 'text/csv' },
  });
  if (!response.ok) throw new Error('Error al exportar');
  return response.blob();
}

/** Convierte array de objetos a CSV. */
export function toCSV<T extends Record<string, any>>(data: T[], headers: Record<keyof T, string>): string {
  if (data.length === 0) return '';
  const keys = Object.keys(data[0]) as (keyof T)[];
  const headerRow = keys.map((k) => headers[k]).join(',');
  const rows = data.map((row) =>
    keys.map((k) => {
      const val = row[k];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','),
  );
  return [headerRow, ...rows].join('\n');
}

/** Descarga un blob como archivo. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Legacy: obtiene detalle completo del dashboard (para compatibilidad). */
export async function fetchReporteDetalle(): Promise<DetalleReporte> {
  const response = await apiClient<{ success: boolean; data: DetalleReporte }>('/dashboard/detalle');
  return response.data;
}