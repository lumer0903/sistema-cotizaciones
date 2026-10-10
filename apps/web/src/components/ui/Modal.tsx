'use client';

import { useEffect, useRef, useId, ReactNode, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  /** Barra de acciones fija fuera del área de scroll (un solo scroll en el modal). */
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** Deshabilita Escape/backdrop (útil mientras hay un submit en curso). */
  closeDisabled?: boolean;
  'aria-label'?: string;
}

const MAX_WIDTH_CLASSES: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  // sm → máximo 448px en desktop (proporcional para modales de poco contenido: Perfil, Nuevo Rol)
  sm: 'sm:max-w-sm md:max-w-md',
  md: 'sm:max-w-lg md:max-w-2xl',
  lg: 'sm:max-w-lg md:max-w-2xl xl:max-w-3xl',
  xl: 'sm:max-w-lg md:max-w-2xl xl:max-w-4xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal = ({
  open,
  onClose,
  title,
  headerExtra,
  children,
  footer,
  maxWidth = 'md',
  closeDisabled = false,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Scroll-lock con compensación de scrollbar + foco previo
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Foco inicial dentro del diálogo
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? dialogRef.current)?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const requestClose = useCallback(() => {
    if (!closeDisabled) onClose();
  }, [closeDisabled, onClose]);

  // Escape cierra + focus trap con Tab
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Si hay un select/dropdown abierto, él consume Escape primero
        if (document.querySelector('[role="listbox"]')) return;
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6 bg-black/45 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      data-testid="modal-overlay"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? 'Diálogo' : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full',
          MAX_WIDTH_CLASSES[maxWidth],
          'bg-white rounded-2xl shadow-modal animate-in fade-in zoom-in-95 duration-200',
          'flex flex-col max-h-[calc(100vh-3rem)] my-auto overflow-hidden focus:outline-none'
        )}
      >
        {(title || headerExtra) && (
          <div className="flex-none px-5 py-3.5 border-b border-zinc-100 bg-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {title && (
                <h3 id={titleId} className="text-base font-bold text-brand-subtitle truncate">
                  {title}
                </h3>
              )}
              {headerExtra}
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={closeDisabled}
              className="ml-auto p-2 min-h-9 min-w-9 flex items-center justify-center rounded-lg text-brand-options hover:text-brand-subtitle hover:bg-surface-muted transition-colors disabled:opacity-40 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Único contenedor de scroll del modal */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 custom-scrollbar">{children}</div>

        {footer && (
          <div className="flex-none px-4 sm:px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 rounded-b-xl flex items-center justify-between gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

/** Barra de acciones estándar: apilada en móvil, a la derecha en desktop. */
export const ModalFooter = ({ children, className }: ModalFooterProps) => (
  <div
    className={cn(
      'w-full flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3',
      className
    )}
  >
    {children}
  </div>
);
