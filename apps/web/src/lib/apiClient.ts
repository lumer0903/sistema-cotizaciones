const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiClient(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const normalizedPath = path.startsWith('/api/') ? path : `/api/${path.replace(/^\/+/, '')}`;
  const fullUrl = `${API_BASE}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1');

  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    if (path.includes('/auth/login') || path.includes('/auth/refresh') || (typeof window !== 'undefined' && window.location.pathname === '/login')) {
      throw new Error('No autorizado');
    }
    
    try {
      await refreshToken();
      return apiClient(path, options);
    } catch {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('No autorizado');
    }
  }

  return response.json();
}

async function refreshToken() {
  const response = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('No se pudo renovar el token');
  }
}