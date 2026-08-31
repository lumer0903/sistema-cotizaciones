import { authSession } from '../../application/auth/authSession';

export async function apiClient(path, options = {}) {
  const token = authSession.token();
  const isFormData = options.body instanceof FormData;
  const headers = { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const base = String(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  const response = await fetch(path.startsWith('/api/') ? `${base}${path}` : path, { ...options, headers });
  if (response.status === 401) authSession.logout();
  return response;
}

export async function apiJson(path, options = {}) {
  const response = await apiClient(path, options);
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.message || 'No se pudo completar la operación.');
  return payload.data;
}
