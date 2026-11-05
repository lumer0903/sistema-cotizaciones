import { TipoPrecio, TipoVenta } from './enums';
import { campoPrecio } from './pricing';

/**
 * Atributos de características del producto que alimentan la descripción
 * estructurada usada por el motor TF-IDF de recomendaciones.
 */
export interface AtributosProductoDescripcion {
  codigo?: string | null;
  tipo_flor?: string | null;
  material?: string | null;
  composicion?: string | null;
  presentacion?: string | null;
  follaje?: string | null;
  numero_cabezas?: number | null;
  tamano?: string | null;
  unidades_por_caja?: number | null;
}

/** Valor utilizable: no vacío, no null/undefined y no "-" (marcador de vacío del CSV). */
function valorValido(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const texto = String(value).trim();
  return texto !== '' && texto !== '-';
}

/** Normaliza a MAYÚSCULAS sin espacios sobrantes (formato único de la descripción). */
function normalizar(value: string | number | null | undefined): string {
  return String(value).trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Genera la descripción estructurada y estandarizada de un producto concatenando
 * el código (nombre del producto) y sus características clave en MAYÚSCULAS:
 *
 *   [CODIGO] [TIPO_FLOR] MATERIAL <v> COMPOSICION <v> PRESENTACION <v>
 *   FOLLAJE <v> [<n> CABEZAS] [<tamano>] [(CAJA X <n> UNID)]
 *
 * Ej.: "RYG9-J-02 ROSA MATERIAL TELA SEDA COMPOSICION PLASTICO
 *       PRESENTACION VARA X 9 FLORES 9 CABEZAS 40 CM (CAJA X 12 UNID)"
 *
 * Solo se concatenan las partes con valor; el resultado colapsa espacios.
 * El TfidfVectorizer (regex por defecto) ignora símbolos como () [ ] -,
 * por lo que el corpus se reduce a las palabras relevantes.
 */
export function generarDescripcionProducto(attrs: AtributosProductoDescripcion): string {
  const partes: string[] = [];

  if (valorValido(attrs.codigo)) partes.push(normalizar(attrs.codigo));
  if (valorValido(attrs.tipo_flor)) partes.push(normalizar(attrs.tipo_flor));
  if (valorValido(attrs.material)) partes.push(`MATERIAL ${normalizar(attrs.material)}`);
  if (valorValido(attrs.composicion)) partes.push(`COMPOSICION ${normalizar(attrs.composicion)}`);
  if (valorValido(attrs.presentacion)) partes.push(`PRESENTACION ${normalizar(attrs.presentacion)}`);
  if (valorValido(attrs.follaje)) partes.push(`FOLLAJE ${normalizar(attrs.follaje)}`);

  const cabezas = Number(attrs.numero_cabezas);
  if (Number.isFinite(cabezas) && cabezas > 0) partes.push(`${Math.trunc(cabezas)} CABEZAS`);

  if (valorValido(attrs.tamano)) partes.push(normalizar(attrs.tamano));

  const porCaja = Number(attrs.unidades_por_caja);
  if (Number.isFinite(porCaja) && porCaja > 1) partes.push(`(CAJA X ${Math.trunc(porCaja)} UNID)`);

  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

/** Los 6 esquemas de precio soportados por el microservicio IA (/suggest). */
export const PRECIO_ESQUEMAS = [
  'precio_unidad_normal',
  'precio_docena_normal',
  'precio_mayor_normal',
  'precio_unidad_dist',
  'precio_docena_dist',
  'precio_mayor_dist',
] as const;

export type PrecioEsquema = (typeof PRECIO_ESQUEMAS)[number];

/** Resuelve el esquema de precio (6 columnas de precios_actuales) a partir del
 *  tipo de precio del cliente/cotización y la tipo de venta del ítem base.
 *
 *  Fallback obligatorio: si `tipoPrecio` o `tipoVenta` vienen undefined/null/
 *  vacíos, devuelve 'precio_unidad_normal' (el default del microservicio IA). */
export function resolverEsquemaPrecio(
  tipoPrecio: string | null | undefined,
  tipoVenta: string | null | undefined,
): PrecioEsquema {
  const precio = tipoPrecio?.trim().toLowerCase();
  const venta = tipoVenta?.trim().toLowerCase();

  if (!precio || !venta) return 'precio_unidad_normal';

  const esquema = campoPrecio(
    precio === 'distribuidor' ? TipoPrecio.distribuidor : TipoPrecio.normal,
    normalizarTipoVenta(venta),
  );

  return (PRECIO_ESQUEMAS as readonly string[]).includes(esquema)
    ? (esquema as PrecioEsquema)
    : 'precio_unidad_normal';
}

function normalizarTipoVenta(tipo: string): TipoVenta {
  if (tipo === 'docena') return TipoVenta.docena;
  if (tipo === 'mayor' || tipo === 'caja') return TipoVenta.mayor;
  return TipoVenta.unidad;
}
