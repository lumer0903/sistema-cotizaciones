export const apiClient = async <T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const isBrowser = typeof window !== 'undefined';

  const getTokenFromCookies = (): string | null => {
    if (!isBrowser) return null;
    const match = document.cookie.match(/(?:^|; )accessToken=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  const cookieToken = getTokenFromCookies();
  const localToken = isBrowser ? localStorage.getItem('access_token') : null;
  const token = (cookieToken?.trim() ?? localToken?.trim()) || null;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include' as RequestCredentials,
  };

  const basePath = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

  console.log('[apiClient Request]', endpoint, 'Headers:', headers, 'Credentials: include');

  const response = await fetch(`${basePath}${cleanEndpoint}`, config);

  if (response.status === 401) {
    if (isBrowser) {
      if (!window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');

        document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'userRole=; path=/; max-age=0; SameSite=Lax';

        const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?redirectTo=${redirectUrl}`;
      }
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API Error');
  }

  if (response.status === 204) return null as T;

  return response.json();
};
