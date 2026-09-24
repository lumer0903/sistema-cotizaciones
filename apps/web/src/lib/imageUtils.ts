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

  if (!url || url.trim() === '') {
    return defaultPlaceholder;
  }

  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

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
  e.currentTarget.onerror = null;
  e.currentTarget.src = size === '115' ? PLACEHOLDER_115 : PLACEHOLDER_150;
}

const MAX_SIDE = 512;
const JPEG_QUALITY = 0.85;

export async function fileToDataUrl(file: File, maxSide = MAX_SIDE): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function validateAvatarFile(file: File): string | null {
  if (!isImageFile(file)) return 'Selecciona una imagen válida (PNG, JPEG o WebP)';
  if (file.size > 2 * 1024 * 1024) return 'La imagen no debe superar 2 MB';
  return null;
}
