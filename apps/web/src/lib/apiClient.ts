const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Sólo cookies legibles por JS (las httpOnly las envía el navegador solas y
  // se leen en servidor/middleware). Nunca localStorage: el JWT no debe vivir
  // en almacenamiento explotable por XSS (auditoría P13).
  const match = document.cookie.match(/(?:^|; )accessToken=([^;]*)/);
  const cookieToken = match ? decodeURIComponent(match[1]) : null;
  return cookieToken?.trim() || null;
}

function normalizeUrl(endpoint: string): string {
  const basePath = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
  const withSlash = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cleanEndpoint = withSlash.startsWith('/api') ? withSlash : `/api${withSlash}`;
  return `${basePath}${cleanEndpoint}`;
}

function isAuthPath(path: string): boolean {
  return path.includes('/auth/login') || path.includes('/auth/refresh');
}

function buildHeaders(options: RequestInit): HeadersInit {
  const isFormData = options.body instanceof FormData;
  const token = getToken();
  return {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
}

async function refreshSession(): Promise<void> {
  const response = await fetch(normalizeUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('No se pudo renovar la sesión');
  // El backend renueva las cookies httpOnly; nada que guardar en JS (P13).
}

function clearSessionAndRedirect(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/login')) return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'userRole=; path=/; max-age=0';
  const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
  // Recarga completa intencional: al agotarse la sesión se limpia todo el estado
  // en memoria de la SPA (router.push dejaría montados componentes con datos).
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/login?redirectTo=${redirectUrl}`;
}

async function parseError(response: Response): Promise<Error> {
  try {
    const errorData = await response.clone().json();
    const message = Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message || errorData.error || response.statusText;
    return new Error(message || 'API Error');
  } catch {
    return new Error(response.statusText || 'API Error');
  }
}

export async function apiClient<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = normalizeUrl(path);
  let response = await fetch(url, {
    ...options,
    headers: buildHeaders(options),
    credentials: 'include' as RequestCredentials,
  });

  if (response.status === 401 && !isAuthPath(path) && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    try {
      await refreshSession();
      response = await fetch(url, {
        ...options,
        headers: buildHeaders(options),
        credentials: 'include' as RequestCredentials,
      });
    } catch {
      clearSessionAndRedirect();
      throw new Error('No autorizado');
    }
  }

  if (response.status === 401) {
    if (!isAuthPath(path)) {
      clearSessionAndRedirect();
    }
    throw new Error('No autorizado');
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) return null as T;

  return response.json() as Promise<T>;
}

export async function uploadFile(path: string, formData: FormData): Promise<any> {
  const response = await fetch(normalizeUrl(path), {
    method: 'POST',
    headers: {
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    credentials: 'include' as RequestCredentials,
    body: formData,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) return null;

  return response.json();
}
