import { apiClient } from '@/lib/apiClient';
import {
    CotizacionItem,
    CotizacionesFilterParams,
    CotizacionesPaginatedResponse,
    RecomendarItemRequest,
    RecomendacionItem,
    RecomendarItemResponse,
} from '../types/cotizacion';
import { ProductoBase } from '../components/AgregarProductoModal';

// Re-export types for consumers
export type {
    RecomendarItemRequest,
    RecomendacionItem,
    RecomendarItemResponse,
};

interface BackendCotizacion {
    id_cotizacion?: number;
    id?: number | string;
    numero?: string;
    codigo?: string;
    cliente?: string | { nombre?: string; nombre_cliente?: string } | null;
    nombre_cliente?: string;
    created_at?: string;
    fecha?: string;
    tipo_precio?: string;
    tipo?: string;
    estado?: string;
    total?: number | string;
    usuario?: { id_usuario: number; nombre: string } | null;
}

const ESTADO_MAP: Record<string, string> = {
    BORRADOR: 'borrador',
    ENVIADO: 'enviada',
    PARCIALMENTE_PAGADA: 'parcialmente_pagada',
    APROBADO: 'aprobada',
    RECHAZADO: 'rechazada',
};

const ESTADO_DISPLAY_MAP: Record<string, string> = {
    borrador: 'BORRADOR',
    enviada: 'ENVIADO',
    parcialmente_pagada: 'PARCIALMENTE_PAGADA',
    aprobada: 'APROBADO',
    rechazada: 'RECHAZADO',
};

function getClienteNombre(cliente: BackendCotizacion['cliente'] | any): string {
    if (!cliente) return '-';
    if (typeof cliente === 'string') return cliente;
    if (typeof cliente === 'object') {
        return cliente.nombre || cliente.nombre_cliente || cliente.razon_social || '-';
    }
    return String(cliente);
}

function mapToCotizacionItem(item: BackendCotizacion): CotizacionItem {
    const rawId = item.id_cotizacion ?? (typeof item.id === 'number' ? item.id : Number(item.id)) ?? 0;
    const estadoBackend = String(item.estado || 'borrador').toLowerCase();
    return {
        id: Number(rawId) || 0,
        id_cotizacion: Number(rawId) || 0,
        codigo: item.numero || item.codigo || `COT-${rawId}`,
        cliente: getClienteNombre(item.cliente ?? (item as any).nombre_cliente),
        fecha: (item.created_at || item.fecha)
            ? new Date((item.created_at || item.fecha) as string).toLocaleDateString('es-PE')
            : '-',
        tipo: String(item.tipo_precio || item.tipo || '').toLowerCase() === 'distribuidor' ? 'DISTRIBUIDOR' : 'TIENDA',
        estado: (ESTADO_DISPLAY_MAP[estadoBackend] || String(item.estado || 'BORRADOR').toUpperCase()) as CotizacionItem['estado'],
        total: Number(item.total ?? 0) || 0,
    };
}

export async function getCotizaciones(
    params: CotizacionesFilterParams = {}
): Promise<CotizacionesPaginatedResponse> {
    const query = new URLSearchParams();

    if (params.buscar && params.buscar.trim() !== '') {
        query.append('buscar', params.buscar.trim());
    }
    if (params.fecha && params.fecha.trim() !== '') {
        query.append('fecha', params.fecha.trim());
    }
    if (params.estado && params.estado !== 'TODOS' && params.estado.trim() !== '') {
        query.append('estado', ESTADO_MAP[params.estado] ?? params.estado);
    }
    if (params.page && params.page > 1) {
        query.append('page', params.page.toString());
    }
    if (params.limit) {
        query.append('limit', params.limit.toString());
    }

    const queryString = query.toString();
    const endpoint = queryString ? `/cotizaciones?${queryString}` : '/cotizaciones';

    const normalize = (raw: any): CotizacionesPaginatedResponse => {
        // Formas posibles: array directo | {data: array} | {data: {data: array}} | {items: array}
        let list: any[] = [];
        let total = 0;
        let page = params.page || 1;
        let limit = params.limit || 20;

        if (Array.isArray(raw)) {
            list = raw;
            total = raw.length;
        } else if (raw && typeof raw === 'object') {
            const maybeData = (raw as any).data;
            if (Array.isArray(maybeData)) {
                list = maybeData;
            } else if (maybeData && typeof maybeData === 'object' && Array.isArray(maybeData.data)) {
                list = maybeData.data;
                total = Number(maybeData.total ?? list.length);
                page = Number(maybeData.page ?? page);
                limit = Number(maybeData.limit ?? limit);
            } else if (Array.isArray((raw as any).items)) {
                list = (raw as any).items;
            }
            if (!total) total = Number((raw as any).total ?? (raw as any).meta?.total ?? list.length);
            page = Number((raw as any).page ?? (raw as any).meta?.page ?? page);
            limit = Number((raw as any).limit ?? limit);
        }

        return {
            data: list.map(mapToCotizacionItem),
            total,
            page,
            limit,
        };
    };

    try {
        const data = await apiClient(endpoint);
        return normalize(data);
    } catch (error) {
        // Sin fallback silencioso: el caller muestra el error y no filtra en falso
        console.error(`[cotizacionApi] Error al consultar ${endpoint}.`, error);
        throw error;
    }
}

export async function getCotizacionById(id: string | number): Promise<CotizacionItem> {
    const data = (await apiClient(`/cotizaciones/${id}`)) as CotizacionItem;
    return data;
}

export async function obtenerProductosImportados(): Promise<ProductoBase[]> {
    try {
        const response = await apiClient('/productos?include=precios');
        if (Array.isArray(response)) return response as ProductoBase[];
        if (response && typeof response === 'object') {
            const res = response as Record<string, unknown>;
            if (Array.isArray(res.data)) return res.data as ProductoBase[];
            if (Array.isArray(res.items)) return res.items as ProductoBase[];
        }
        return [];
    } catch (error) {
        console.error('[cotizacionApi] Error al obtener productos:', error);
        return [];
    }
}

export async function getProximoNumeroCotizacion(): Promise<string> {
    const res = await apiClient('/cotizaciones/proximo-numero') as any;
    const numero = res?.numero || res?.data?.numero;
    if (typeof numero === 'string' && numero.trim()) return numero.trim();
    throw new Error('La API no devolvió el próximo número de cotización');
}

export interface ClienteApi {
  id_cliente: number;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  ruc_dni?: string | null;
  tipo?: string;
}

export async function buscarClientes(search: string, limit = 5): Promise<ClienteApi[]> {
  try {
    const res = await apiClient(`/clientes?search=${encodeURIComponent(search)}&limit=${limit}`) as any;
    const list = Array.isArray(res) ? res : res?.data || res?.items || [];
    return list as ClienteApi[];
  } catch (e) {
    console.warn('[cotizacionApi] Error buscando clientes:', e);
    return [];
  }
}

export async function crearCliente(data: { nombre: string; telefono?: string; email?: string; ruc_dni?: string; tipo?: string }): Promise<ClienteApi> {
  const res = await apiClient('/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }) as any;
  return (res?.data ?? res) as ClienteApi;
}

export async function actualizarCliente(id: number, data: Partial<{ nombre: string; telefono: string; email: string; ruc_dni: string; tipo: string }>): Promise<ClienteApi> {
  const res = await apiClient(`/clientes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }) as any;
  return (res?.data ?? res) as ClienteApi;
}

export interface CrearCotizacionPayload {
  id_cliente: number;
  tipo_precio?: string;
  observaciones?: string;
  incluye_carreta?: boolean;
  costo_carreta?: number;
  numero?: string;
  detalle: Array<{
    id_producto: number;
    tipo_venta?: string;
    cantidad: number;
    precio_unitario: number;
    color_notas?: string | null;
    es_sugerido_ia?: boolean;
  }>;
}

export async function crearCotizacion(payload: CrearCotizacionPayload): Promise<any> {
  const res = await apiClient('/cotizaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }) as any;
  return res?.data ?? res;
}

export async function cambiarEstadoCotizacion(id: number | string, estado: string): Promise<any> {
  const res = await apiClient(`/cotizaciones/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  }) as any;
  return res?.data ?? res;
}

export interface ActualizarCotizacionPayload {
  id_cliente?: number;
  tipo_precio?: string;
  observaciones?: string;
  incluye_carreta?: boolean;
  costo_carreta?: number;
  detalle?: Array<{
    id_producto: number;
    tipo_venta?: string;
    cantidad: number;
    precio_unitario: number;
    color_notas?: string | null;
    es_sugerido_ia?: boolean;
  }>;
}

/** Actualiza una cotización en BORRADOR (el backend conserva el número correlativo) */
export async function actualizarCotizacion(id: number | string, payload: ActualizarCotizacionPayload): Promise<any> {
  const res = await apiClient(`/cotizaciones/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }) as any;
  return res?.data ?? res;
}

export interface CotizacionDetalleLinea {
  id_detalle?: number;
  id_producto: number;
  tipo_venta?: string;
  cantidad: number | string;
  precio_unitario: number | string;
  subtotal?: number | string;
  color_notas?: string | null;
  es_sugerido_ia?: boolean;
  producto?: {
    id_producto?: number;
    codigo?: string;
    descripcion?: string;
    [k: string]: any;
  } | null;
  [k: string]: any;
}

export interface CotizacionDetalle {
  id_cotizacion: number;
  numero?: string;
  estado?: string;
  tipo_precio?: string;
  observaciones?: string | null;
  incluye_carreta?: boolean;
  costo_carreta?: number | string;
  subtotal?: number | string;
  total?: number | string;
  fecha?: string;
  created_at?: string;
  id_cliente?: number;
  cliente?: {
    id_cliente?: number;
    nombre?: string;
    telefono?: string | null;
    email?: string | null;
    ruc_dni?: string | null;
    tipo?: string;
    [k: string]: any;
  } | null;
  detalle?: CotizacionDetalleLinea[];
  [k: string]: any;
}

/** Obtiene la cotización con detalle, cliente y pagos */
export async function getCotizacionDetalle(id: string | number): Promise<CotizacionDetalle> {
    const res = (await apiClient(`/cotizaciones/${id}`)) as any;
    return (res?.data ?? res) as CotizacionDetalle;
}

const PDF_POLL_INTERVAL_MS = 2000;
const PDF_POLL_MAX_RETRIES = 10;

export interface PdfExportProgress {
  estado: 'generando' | 'descargando' | 'listo';
}

function getTokenForPdf(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('access_token')?.trim() ||
    localStorage.getItem('token') ||
    null
  );
}

function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Obtiene el PDF como Blob soportando la respuesta asíncrona del backend:
 * - 200 OK → consume el Blob directamente.
 * - 202 Accepted → sondea `pdf-status` cada 2s (máx. 10 reintentos / 20s)
 *   y solo llama a `export-pdf` cuando el estado es 'listo'.
 * - Se agota el polling o error → lanza Error (el caller muestra el toast).
 */
export async function getCotizacionPdfBlob(
  id: number | string,
  onProgress?: (progress: PdfExportProgress) => void,
): Promise<Blob> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const token = getTokenForPdf();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const primera = await fetch(`${base}/api/cotizaciones/${id}/export-pdf`, {
    headers,
    credentials: 'include',
  });

  if (primera.status === 200) return primera.blob();
  if (primera.status !== 202) throw new Error('No se pudo generar el PDF');

  onProgress?.({ estado: 'generando' });

  for (let intento = 0; intento < PDF_POLL_MAX_RETRIES; intento++) {
    await sleep(PDF_POLL_INTERVAL_MS);

    const statusRes = await fetch(`${base}/api/cotizaciones/${id}/pdf-status`, {
      headers,
      credentials: 'include',
    });
    if (!statusRes.ok) continue;

    const status = (await statusRes.json()) as { estado?: string };
    if (status.estado !== 'listo') continue; // 'generando' | 'pendiente'

    onProgress?.({ estado: 'descargando' });
    const finalRes = await fetch(`${base}/api/cotizaciones/${id}/export-pdf`, {
      headers,
      credentials: 'include',
    });
    if (finalRes.status === 200) {
      onProgress?.({ estado: 'listo' });
      return finalRes.blob();
    }
    if (finalRes.status === 202) continue; // se invalidó: sigue generando
    throw new Error('No se pudo descargar el PDF');
  }

  throw new Error('El PDF tardó demasiado en generarse. Intente nuevamente.');
}

/** URL de objeto para vista previa del PDF (revocar al cerrar) */
export async function getCotizacionPdfObjectUrl(id: number | string): Promise<string> {
  const blob = await getCotizacionPdfBlob(id);
  return URL.createObjectURL(blob);
}

/** Descarga el PDF en disco, con soporte de polling y progreso opcional */
export async function exportarPdfCotizacionConPolling(
  id: number | string,
  filename?: string,
  onProgress?: (progress: PdfExportProgress) => void,
): Promise<void> {
  const blob = await getCotizacionPdfBlob(id, onProgress);
  downloadPdfBlob(blob, filename || `COT-${id}.pdf`);
}

export async function exportarPdfCotizacion(id: number | string, filename?: string): Promise<void> {
  await exportarPdfCotizacionConPolling(id, filename);
}

export async function obtenerRecomendacionesItem(
    data: RecomendarItemRequest
): Promise<RecomendarItemResponse> {
    const response = await apiClient('/cotizaciones/recomendar-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return response as RecomendarItemResponse;
}

export interface CobranzaListParams {
    page?: number;
    limit?: number;
    estado?: string;
    /** pendiente | parcial | pagada | vencida (derivado de saldos, no estado BD) */
    estado_cobranza?: string;
    id_cliente?: number;
    q?: string;
    solo_vencidas?: boolean;
    fecha_vencimiento_inicio?: string;
    fecha_vencimiento_fin?: string;
}

export async function getCobranzaList(params: CobranzaListParams = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.estado) query.append('estado', params.estado);
    if (params.estado_cobranza) query.append('estado_cobranza', params.estado_cobranza);
    if (params.id_cliente) query.append('id_cliente', String(params.id_cliente));
    if (params.q) query.append('q', params.q);
    if (params.solo_vencidas) query.append('solo_vencidas', 'true');
    if (params.fecha_vencimiento_inicio) query.append('fecha_vencimiento_inicio', params.fecha_vencimiento_inicio);
    if (params.fecha_vencimiento_fin) query.append('fecha_vencimiento_fin', params.fecha_vencimiento_fin);
    const qs = query.toString();
    const res = (await apiClient(`/cobranza${qs ? `?${qs}` : ''}`)) as any;
    return {
        data: (res?.data ?? []) as any[],
        total: Number(res?.total ?? 0),
        page: Number(res?.page ?? params.page ?? 1),
        limit: Number(res?.limit ?? params.limit ?? 50),
    };
}

export async function getCobranzaDetalle(id: number | string): Promise<any> {
    const res = (await apiClient(`/cobranza/${id}`)) as any;
    return res?.data ?? res;
}

export interface RegistrarPagoPayload {
    monto: number;
    metodo_pago: string;
    referencia?: string | null;
}

export async function registrarPagoCotizacion(
    idCotizacion: number | string,
    payload: RegistrarPagoPayload
): Promise<any> {
    const res = (await apiClient(`/cotizaciones/${idCotizacion}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })) as any;
    return res?.data ?? res;
}