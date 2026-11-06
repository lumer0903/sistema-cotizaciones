import { apiClient } from '@/lib/apiClient';

export interface ConfigMap {
  [clave: string]: string;
}

export async function getConfiguracion(): Promise<ConfigMap> {
  const response = await apiClient<{ success: boolean; data: ConfigMap }>('/configuracion');
  return response.data ?? {};
}

export async function setConfiguracion(clave: string, valor: string, descripcion?: string): Promise<void> {
  await apiClient('/configuracion', {
    method: 'PUT',
    body: JSON.stringify({ clave, valor, descripcion }),
  });
}

export async function saveAllConfiguracion(entries: Array<{ clave: string; valor: string; descripcion?: string }>): Promise<void> {
  for (const entry of entries) {
    await setConfiguracion(entry.clave, entry.valor, entry.descripcion);
  }
}
