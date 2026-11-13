/**
 * Tokens compartidos para campos de formulario y filtros (Input / Select / Textarea).
 * Estilo base Figma con acento dorado #F8B602.
 */

/** Etiquetas de cada filtro (FilterLabel): uppercase, 11px, font-black, dorado #F8B602. */
export const FIELD_LABEL = 'block mb-1.5 text-[11px] font-black uppercase tracking-wide text-[#F8B602]';

/** Altura estándar de campo (h-9 = 36px). */
export const FIELD_HEIGHT = 'h-9';

/** Texto del campo: font-light 13px, color #414141. */
export const FIELD_TEXT = 'text-[13px] font-light text-[#414141]';

/** Borde y contenedor base: redondeado rounded-lg con borde dorado #F8B602 y fondo blanco. */
export const FIELD_BORDER = 'rounded-lg border border-[#F8B602] bg-white';

/** Transición + placeholder text-[#787878]. */
export const FIELD_TRANSITION =
  'transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-[#787878]';

/** Estado focus con halo dorado suave (#F8B602/25). */
export const FIELD_FOCUS =
  'focus:outline-none focus:ring-2 focus:ring-[#F8B602]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F8B602]/25';

/** Estado deshabilitado. */
export const FIELD_DISABLED =
  'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 disabled:cursor-not-allowed';

/** Estado de error. */
export const FIELD_ERROR =
  '!border-[#EF4444] focus:!ring-[#EF4444]/25';

/** Texto de mensaje de error bajo el campo. */
export const FIELD_ERROR_TEXT = 'mt-1 text-xs font-medium text-[#EF4444]';

/** Clases completas para un campo sin error. */
export const FIELD_BASE = [
  FIELD_BORDER,
  FIELD_TEXT,
  FIELD_TRANSITION,
  FIELD_FOCUS,
  FIELD_DISABLED,
].join(' ');
