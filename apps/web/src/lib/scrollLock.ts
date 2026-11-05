/**
 * Scroll-lock del body con:
 *  - Conteo de referencias (varios modales/drawers pueden solaparse).
 *  - Preservación del valor original de `overflow`/`padding-right`.
 *  - Compensación del scrollbar para evitar saltos de layout.
 *
 * Uso: lockBodyScroll() al abrir / unlockBodyScroll() al cerrar (o en cleanup).
 */
let lockCount = 0;
let previousOverflow = '';
let previousHtmlOverflow = '';
let previousPaddingRight = '';

export function lockBodyScroll(): void {
  if (lockCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    previousOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    previousPaddingRight = document.body.style.paddingRight;
    // Bloquea ambos: según el navegador/propagación, el scroller puede ser body o html
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    // Regla CSS con !important (tailwind.css): cierra cualquier caso de propagación
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    document.body.style.paddingRight = previousPaddingRight;
  }
}
