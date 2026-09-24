import { apiClient } from '@/lib/apiClient';
import type { OverridesPermisos, MapaPermisos, PermisoModulo, NivelPermiso } from '@goldcontinent/shared/auth';

export interface UsuarioLista {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: string;
  avatar_url?: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PaginatedResponse {
  success: boolean;
  data: UsuarioLista[];
  total: number;
  page: number;
  limit: number;
}

interface SingleResponse {
  success: boolean;
  data: UsuarioLista;
}

export async function getUsuarios(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return apiClient<PaginatedResponse>(`/usuarios${qs ? `?${qs}` : ''}`);
}

export async function createUsuario(payload: {
  nombre: string;
  email: string;
  password: string;
  rol?: string;
}): Promise<UsuarioLista> {
  const response = await apiClient<SingleResponse>('/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateUsuario(
  id: number,
  payload: {
    nombre?: string;
    email?: string;
    password?: string;
    rol?: string;
    avatar_url?: string | null;
    activo?: boolean;
  },
): Promise<UsuarioLista> {
  const response = await apiClient<SingleResponse>(`/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function setUsuarioActivo(id: number, activo: boolean): Promise<UsuarioLista> {
  const response = await apiClient<SingleResponse>(`/usuarios/${id}/activo`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  });
  return response.data;
}

export async function getUsuarioPermisos(id: number): Promise<OverridesPermisos> {
  const response = await apiClient<{ success: boolean; data: OverridesPermisos }>(
    `/usuarios/${id}/permisos`,
  );
  return response.data ?? {};
}

export async function setUsuarioPermisos(
  id: number,
  permisos: Partial<Record<PermisoModulo, NivelPermiso>>,
): Promise<OverridesPermisos> {
  const response = await apiClient<{ success: boolean; data: OverridesPermisos }>(
    `/usuarios/${id}/permisos`,
    {
      method: 'PUT',
      body: JSON.stringify({ permisos }),
    },
  );
  return response.data ?? {};
}

export type { OverridesPermisos, MapaPermisos };
