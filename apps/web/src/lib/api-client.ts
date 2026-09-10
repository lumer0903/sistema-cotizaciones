export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  const basePath = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
  const response = await fetch(`${basePath}${cleanEndpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API Error');
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
};
