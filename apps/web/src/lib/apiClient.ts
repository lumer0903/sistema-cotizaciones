// Las llamadas del cliente van al rewrite de Next.js (/api/* → backend), que
// funciona igual desde el navegador (localhost:3000) y desde el contenedor web.
// Así evitamos depender de NEXT_PUBLIC_API_URL (un hostname absoluto como
// host.docker.internal no resuelve desde el navegador del host en Windows).
const API_PREFIX = '/api';

function normalizeUrl(endpoint: string): string {
  const withSlash = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Prefijo /api una sola vez: si el caller ya lo incluye, no se duplica.
  return withSlash.startsWith('/api') ? withSlash : `${API_PREFIX}${withSlash}`;
}

function isAuthPath(path: string): boolean {
  return path.includes('/auth/login') || path.includes('/auth/refresh');
}

function buildHeaders(options: RequestInit): HeadersInit {
  const isFormData = options.body instanceof FormData;
  return {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    ...(options.headers || {}),
  };
}

let refreshInFlight: Promise<void> | null = null;
async function refreshSession(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = renewSession().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

async function renewSession(): Promise<void> {
  const response = await fetch(normalizeUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
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

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name='ApiError'; }
}
async function parseError(response: Response): Promise<ApiError> {
  const text = await response.clone().text().catch(()=>'');
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = {};
  }
  const raw = Array.isArray(body.message) ? body.message.join('; ') : (body.message || body.error);
  const message = typeof raw === 'string' ? raw : response.statusText || 'Error de API';
  return new ApiError(response.status, message.slice(0, 200));
}
export function apiErrorMessage(error: unknown): string {
  if(error instanceof ApiError) {
    if(error.status===400) return error.message;
    if(error.status===403) return 'No tiene permisos para esta operación';
    if(error.status===404) return 'El recurso ya no está disponible';
    if(error.status>=500) return 'El servidor no pudo completar la solicitud. Puede reintentar.';
    return error.message;
  }
  return 'No se pudo conectar con el servidor. Revise la conexión y reintente.';
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = normalizeUrl(path);
  let response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: buildHeaders(options),
    credentials: 'include' as RequestCredentials,
  });

  if (response.status === 401 && !isAuthPath(path) && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    try {
      await refreshSession();
      response = await fetch(url, {
        cache: 'no-store',
        ...options,
        headers: buildHeaders(options),
        credentials: 'include' as RequestCredentials,
      });
    } catch {
      clearSessionAndRedirect();
      throw new ApiError(401,'No autorizado');
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

  return response;
}

export async function apiClient<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export async function uploadFile(path: string, formData: FormData): Promise<any> {
  return apiClient(path, { method: 'POST', body: formData });
}
