const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PLACEHOLDER_150 = 'https://placehold.co/150x150/e2e8f0/64748b?text=Sin+Imagen';
const PLACEHOLDER_115 = 'https://placehold.co/115x128/e2e8f0/64748b?text=Sin+Imagen';

/**
 * Resuelve la URL completa de una imagen recibida del backend.
 * Soporta parámetros opcionales de tamaño ('150' | '115') para devolver el placeholder correcto.
 */
export function getImageUrl(
  url?: string | null,
  size: '150' | '115' | string = '150'
): string {
  const defaultPlaceholder = size === '115' ? PLACEHOLDER_115 : PLACEHOLDER_150;

  // Si no hay URL, devolver el placeholder según el tamaño requerido
  if (!url || url.trim() === '') {
    return defaultPlaceholder;
  }

  // URLs absolutas (http/https) o cadenas Data URL en Base64
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  // Rutas relativas enviadas por el backend (ej. /images/placeholder-xxx.png)
  const cleanBase = API_BASE.replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;

  return `${cleanBase}${cleanPath}`;
}

/**
 * Handler genérico para capturar errores de carga en tags <img>
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  size: '150' | '115' | string = '150'
) {
  e.currentTarget.onerror = null; // Previene bucles infinitos de reintento
  e.currentTarget.src = size === '115' ? PLACEHOLDER_115 : PLACEHOLDER_150;
}