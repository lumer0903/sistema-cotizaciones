import { apiClient } from '@/lib/apiClient';

export interface UsuarioLista {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'gerente' | 'vendedor';
  activo: boolean;
}

interface UsuariosResponse {
  success: boolean;
  data: UsuarioLista[];
  total?: number;
}

export async function getUsuarios(): Promise<UsuarioLista[]> {
  const response = await apiClient<UsuariosResponse>('/usuarios');
  return response.data ?? [];
}

export async function toggleUsuarioActivo(id: number, activo: boolean): Promise<void> {
  await apiClient(`/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  });
}

export async function deleteUsuario(id: number): Promise<void> {
  await apiClient(`/usuarios/${id}`, { method: 'DELETE' });
}

export async function createUsuario(payload: {
  nombre: string;
  email: string;
  password: string;
  rol?: string;
}): Promise<UsuarioLista> {
  const response = await apiClient<{ success: boolean; data: UsuarioLista }>('/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}
