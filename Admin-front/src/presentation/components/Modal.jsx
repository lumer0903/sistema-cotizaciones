import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Modal({ open, title, children, footer, onClose, className = '' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const onKeyDown = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => dialogRef.current?.querySelector('button, input, select, textarea, [href]')?.focus());
    return () => { 
      document.removeEventListener('keydown', onKeyDown); 
      previousFocus?.focus?.(); 
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = className.includes('max-w-') ? '' : 'max-w-lg';

  const content = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/20 backdrop-blur-xs p-4 sm:p-6 animate-in select-none"
      onMouseDown={event => event.target === event.currentTarget && onClose()}
    >
      <div 
        ref={dialogRef} 
        className={`w-full ${sizeClass} rounded-2xl border border-[#d9d9d9] bg-white shadow-xl flex flex-col overflow-hidden relative animate-in ${className}`}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
      >
        {/* Encabezado */}
        <div className="flex h-14 items-center justify-between px-6 border-b border-[#d9d9d9] shrink-0">
          <h2 id="modal-title" className="text-sm font-semibold text-[#414141] tracking-tight">
            {title}
          </h2>
          <button 
            className="rounded-lg p-1.5 text-neutral-455 hover:text-[#7b1c1c] hover:bg-[#fdf2f2] transition-colors"
            type="button" 
            onClick={onClose} 
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-112px)]">
          {children}
        </div>

        {/* Pie de Página */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-[#d9d9d9] bg-[#f8fafc] p-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Renderizar usando Portal de React al final del document.body para evitar que los transforms de contenedores alteren el posicionamiento fixed
  return typeof window !== 'undefined' ? createPortal(content, document.body) : null;
}
