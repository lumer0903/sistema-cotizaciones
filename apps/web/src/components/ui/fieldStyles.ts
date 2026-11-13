/**
 * Tokens compartidos para campos de formulario (Input / Select / Textarea).
 * Fuente única de verdad de la "piel" de los campos → elimina la
 * triplicación de estilos entre componentes.
 */

/** Etiqueta de campo: 11px, semi-bold, sin uppercase. */
export const FIELD_LABEL = 'block text-[11px] font-semibold text-brand-subtitle mb-1';

/** Altura estándar de campo (idéntica en Input, Select y Textarea). */
export const FIELD_HEIGHT = 'h-9';

/** Texto del campo. */
export const FIELD_TEXT = 'text-[13px] font-medium text-brand-subtitle';

/** Borde base del campo. */
export const FIELD_BORDER = 'border border-border-default bg-surface rounded-xl';

/** Transición + placeholder comunes. */
export const FIELD_TRANSITION =
  'transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-brand-options';

/**
 * Estado hover/focus (versión sin error).
 * Efecto de peso e inserción usando exclusivamente border y ring:
 * - focus: aplica el tono oscuro al borde principal
 * - focus:ring: halo dorado/amarillo translúcido
 * - focus:outline-none: elimina la doble línea nativa desalineada
 */
export const FIELD_FOCUS = 'hover:border-brand-options focus:border-amber-900 focus:ring-2 ring-amber-300/30 focus:outline-none focus-within:border-amber-900/20 focus-within:ring-2 ring-amber-300/20';

/** Estado deshabilitado. */
export const FIELD_DISABLED =
  'disabled:bg-status-borrador/40 disabled:text-brand-options disabled:border-border-default disabled:cursor-not-allowed';

/** Estado de error (usa !important para ganarle a las reglas base). */
export const FIELD_ERROR =
  '!border-danger';

/** Texto de mensaje de error bajo el campo. */
export const FIELD_ERROR_TEXT = 'mt-1.5 text-xs font-medium text-danger';

/** Clases completas para un campo sin error. */
export const FIELD_BASE = [
  FIELD_BORDER,
  FIELD_TEXT,
  FIELD_TRANSITION,
  FIELD_FOCUS,
  FIELD_DISABLED,
].join(' ');
