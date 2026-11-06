import { apiClient } from '@/lib/apiClient';

export type TipoNotificacion =
  | 'STOCK_BAJO'
  | 'COTIZACION_VENCIDA'
  | 'COBRANZA_PENDIENTE';

export interface NotificacionItem {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  leida: boolean;
  createdAt: string;
  data: {
    id_alerta?: number;
    id_producto?: number;
    id_cotizacion?: number;
    stock_actual?: number;
    stock_minimo?: number;
    codigo?: string;
    descripcion?: string;
    almacen?: string;
    numero?: string;
    total?: number;
    fecha_vencimiento?: string | null;
    cliente?: string;
  };
}

export interface NotificacionesResponse {
  success: true;
  data: NotificacionItem[];
}

export const notificacionesApi = {
  obtener: async (): Promise<NotificacionesResponse> =>
    apiClient<NotificacionesResponse>('/notificaciones'),

  reconocerAlertaStock: async (idAlerta: number): Promise<void> => {
    await apiClient(`/notificaciones/stock/${idAlerta}/reconocer`, { method: 'PATCH' });
  },

  marcarLeida: async (tipo: 'COTIZACION_VENCIDA' | 'COBRANZA_PENDIENTE', idReferencia: number): Promise<void> => {
    await apiClient(`/notificaciones/${tipo}/${idReferencia}/marcar-leida`, { method: 'PATCH' });
  },

  marcarTodasComoLeidas: async (): Promise<void> => {
    await apiClient('/notificaciones/marcar-todos', { method: 'PATCH' });
  },
};
