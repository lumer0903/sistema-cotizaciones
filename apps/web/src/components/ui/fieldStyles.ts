/**
 * Tokens compartidos para campos de formulario y filtros (Input / Select / Textarea).
 * Estilo base Figma con acento dorado #F8B602 para filtros y variante neutra para modales.
 */

export type FieldVariant = 'filter' | 'modal';

/** Etiquetas de filtro (FilterLabel): uppercase, 11px, font-black, dorado #F8B602. */
export const FIELD_LABEL_FILTER = 'block mb-1.5 text-[11px] font-black uppercase tracking-wide text-[#F8B602]';

/** Etiquetas de modal (neutro): uppercase, 10px, font-bold, color #575757. */
export const FIELD_LABEL_MODAL = 'block mb-1 text-[10px] font-bold uppercase tracking-wide text-[#575757]';

/** Alias por defecto compatible hacia atrás. */
export const FIELD_LABEL = FIELD_LABEL_FILTER;

/** Altura estándar de campo (h-9 = 36px). */
export const FIELD_HEIGHT = 'h-9';

/** Altura de campo compacta para modal (h-8 = 32px). */
export const FIELD_HEIGHT_MODAL = 'h-8';

/** Texto del campo: font-light 13px, color #414141. */
export const FIELD_TEXT = 'text-[13px] font-light text-[#414141]';

/** Borde y contenedor base de filtros: redondeado rounded-lg con borde dorado #F8B602 y fondo blanco. */
export const FIELD_BORDER_FILTER = 'rounded-lg border border-[#F8B602] bg-white';

/** Control base de modales: rounded-lg border border-[#D9D9D9] bg-[#FBFCFD]. */
export const FIELD_BORDER_MODAL = 'rounded-lg border border-[#D9D9D9] bg-[#FBFCFD]';

/** Alias compatible hacia atrás. */
export const FIELD_BORDER = FIELD_BORDER_FILTER;

/** Transición + placeholder text-[#8D8D8D]. */
export const FIELD_TRANSITION =
  'transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-[#8D8D8D]';

/** Estado focus para filtros con halo dorado suave (#F8B602/25). */
export const FIELD_FOCUS_FILTER =
  'focus:outline-none focus:ring-2 focus:ring-[#F8B602]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F8B602]/25';

/** Estado focus para modales: focus:border-[#414141] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#414141]/10. */
export const FIELD_FOCUS_MODAL =
  'focus:border-[#414141] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#414141]/10 focus-visible:border-[#414141] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#414141]/10';

export const FIELD_FOCUS = FIELD_FOCUS_FILTER;

/** Estado deshabilitado. */
export const FIELD_DISABLED =
  'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 disabled:cursor-not-allowed';

/** Estado de error. */
export const FIELD_ERROR =
  '!border-[#EF4444] focus:!ring-[#EF4444]/25';

/** Texto de mensaje de error bajo el campo. */
export const FIELD_ERROR_TEXT = 'mt-1 text-xs font-medium text-[#EF4444]';

/** Clases completas para campo variante filtro. */
export const FIELD_BASE_FILTER = [
  FIELD_BORDER_FILTER,
  FIELD_TEXT,
  FIELD_TRANSITION,
  FIELD_FOCUS_FILTER,
  FIELD_DISABLED,
].join(' ');

/** Clases completas para campo variante modal (neutro). */
export const FIELD_BASE_MODAL = [
  FIELD_BORDER_MODAL,
  FIELD_TEXT,
  FIELD_TRANSITION,
  FIELD_FOCUS_MODAL,
  FIELD_DISABLED,
].join(' ');

/** Clases completas por defecto (retrocompatibilidad). */
export const FIELD_BASE = FIELD_BASE_FILTER;

