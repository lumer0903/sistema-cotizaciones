/**
 * Tokens compartidos para campos de formulario (Input / Select / Textarea).
 * Fuente única de verdad de la "piel" de los campos → elimina la
 * triplicación de estilos entre componentes.
 */

/** Etiqueta de campo: 12px, bold, uppercase, tracking amplio. */
export const FIELD_LABEL = 'block text-xs font-bold uppercase tracking-wider text-brand-subtitle';

/** Altura estándar de campo (idéntica en Input, Select y Textarea). */
export const FIELD_HEIGHT = 'h-9';

/** Texto del campo. */
export const FIELD_TEXT = 'text-sm font-medium text-brand-subtitle';

/** Borde base del campo. */
export const FIELD_BORDER = 'border border-border-default bg-white rounded-xl';

/** Transición + placeholder comunes. */
export const FIELD_TRANSITION =
  'transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-brand-options';

/**
 * Estado hover/focus (versión sin error).
 * El foco no añade nada: solo se ve el borde normal del campo
 * (sin ring, sin outline y sin cambio de color).
 */
export const FIELD_FOCUS = 'hover:border-brand-options focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring';

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
