/**
 * Tokens compartidos para campos de formulario (Input / Select / Textarea).
 * Fuente única de verdad de la "piel" de los campos → elimina la
 * triplicación de estilos entre componentes.
 */

/** Etiqueta de campo: 12px, bold, sin uppercase, tracking amplio. */
export const FIELD_LABEL = 'block text-xs font-bold text-brand-subtitle';

/** Altura estándar de campo (idéntica en Input, Select y Textarea). */
export const FIELD_HEIGHT = 'h-9';

/** Texto del campo. */
export const FIELD_TEXT = 'text-sm font-medium text-brand-subtitle';

/** Borde base del campo. */
export const FIELD_BORDER = 'border border-border-default bg-surface rounded-xl';

/** Transición + placeholder comunes. */
export const FIELD_TRANSITION =
  'transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-brand-options';

/**
 * Estado hover/focus (versión sin error).
 * Foco visible con inversión de tonalidad para efecto de peso e inserción:
 * - Borde interior: tono oscuro (amber-900) para sensación de presión
 * - Anillo externo: tono dorado/amarillo claro y translúcido para halo
 */
export const FIELD_FOCUS = 'hover:border-brand-options focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900 focus-visible:ring-2 ring-amber-300/30 focus-within:border-amber-900/20 focus-within:ring-2 ring-amber-300/20';

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
