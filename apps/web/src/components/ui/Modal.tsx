'use client';

import { useId, ReactNode, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDialogLayer } from '@/hooks/useDialogLayer';
import { createPortal } from 'react-dom';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  /** Barra de acciones fija fuera del área de scroll (un solo scroll en el modal). */
  footer?: ReactNode;
  maxWidth?: 'sm' | 'form' | 'md' | 'lg' | 'xl' | '2xl';
  /** Deshabilita Escape/backdrop (útil mientras hay un submit en curso). */
  closeDisabled?: boolean;
  'aria-label'?: string;
}

const MAX_WIDTH_CLASSES: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  // sm → máximo 448px en desktop (proporcional para modales de poco contenido: Perfil, Nuevo Rol)
  sm: 'sm:max-w-sm md:max-w-md',
  form: 'sm:max-w-xl',
  md: 'sm:max-w-lg md:max-w-2xl',
  lg: 'sm:max-w-lg md:max-w-2xl xl:max-w-3xl',
  xl: 'sm:max-w-lg md:max-w-2xl xl:max-w-4xl',
  '2xl': 'sm:max-w-xl md:max-w-3xl xl:max-w-5xl 2xl:max-w-6xl',
};

export const Modal = ({
  open,
  onClose,
  title,
  headerExtra,
  children,
  footer,
  maxWidth = 'md',
  closeDisabled = false,
  'aria-label': ariaLabel,
}: ModalProps) => {
  const dialogRef = useDialogLayer(open, onClose, closeDisabled);
  const titleId = useId();
  const requestClose = useCallback(() => {
    if (!closeDisabled) onClose();
  }, [closeDisabled, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[60] isolate flex items-center justify-center p-4 sm:p-6 bg-overlay overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      data-testid="modal-overlay"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel ?? 'Diálogo' : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full',
          MAX_WIDTH_CLASSES[maxWidth],
          'bg-surface rounded-2xl shadow-modal animate-in fade-in zoom-in-95 duration-200 ease-out',
          'flex flex-col max-h-[calc(100vh-3rem)] my-auto overflow-hidden focus:outline-none'
        )}
      >
        {(title || headerExtra) && (
          <div className="flex-none px-5 py-3.5 border-b border-border-default bg-surface flex items-center justify-between gap-3">
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
              className="ml-auto p-2 min-h-9 min-w-9 flex items-center justify-center rounded-xl text-brand-options hover:text-brand-subtitle hover:bg-surface-muted transition-colors disabled:opacity-40 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Único contenedor de scroll del modal */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 custom-scrollbar">{children}</div>

        {footer && (
          <div className="flex-none px-4 sm:px-6 py-3 border-t border-border-default bg-surface-muted/50 rounded-b-xl flex items-center justify-between gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>, document.body
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
