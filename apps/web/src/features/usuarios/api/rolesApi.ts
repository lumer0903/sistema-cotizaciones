import { apiClient } from '@/lib/apiClient';
import type { MapaPermisos, NivelPermiso, PermisoModulo } from '@goldcontinent/shared/auth';

export interface RolLista {
  id_rol: number;
  nombre: string;
  codigo: string;
  es_sistema: boolean;
  orden: number;
  activo: boolean;
  created_at?: string;
  total_usuarios?: number;
  total_permisos?: number;
}

interface RolesResponse {
  success: boolean;
  data: RolLista[];
}

interface SingleRolResponse {
  success: boolean;
  data: RolLista;
}

interface PermisosResponse {
  success: boolean;
  data: MapaPermisos;
}

export async function getRoles(): Promise<RolLista[]> {
  const res = await apiClient<RolesResponse>('/roles');
  return res.data ?? [];
}

export async function getRol(id: number): Promise<RolLista> {
  const res = await apiClient<SingleRolResponse>(`/roles/${id}`);
  return res.data;
}

export async function createRol(payload: { nombre: string; codigo: string }): Promise<RolLista> {
  const res = await apiClient<SingleRolResponse>('/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateRol(
  id: number,
  payload: { nombre?: string; activo?: boolean; orden?: number },
): Promise<RolLista> {
  const res = await apiClient<SingleRolResponse>(`/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteRol(id: number): Promise<void> {
  await apiClient<{ success: boolean; data: null }>(`/roles/${id}`, {
    method: 'DELETE',
  });
}

export async function getRolPermisos(id: number): Promise<MapaPermisos> {
  const res = await apiClient<PermisosResponse>(`/roles/${id}/permisos`);
  return res.data;
}

export async function setRolPermisos(
  id: number,
  permisos: Partial<Record<PermisoModulo, NivelPermiso>>,
): Promise<MapaPermisos> {
  const res = await apiClient<PermisosResponse>(`/roles/${id}/permisos`, {
    method: 'PUT',
    body: JSON.stringify({ permisos }),
  });
  return res.data;
}

export type { MapaPermisos, NivelPermiso, PermisoModulo };
