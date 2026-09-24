'use client';

import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    headerExtra?: ReactNode; // <-- Nueva variable/prop para contenido al lado del título
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({
    open,
    onClose,
    title,
    headerExtra,
    children,
    maxWidth = 'md',
}: ModalProps) => {
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [open]);

    if (!open) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-[600px]',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={`w-full ${maxWidthClasses[maxWidth]} bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]`}
                onClick={(e) => e.stopPropagation()}
            >
                {(title || headerExtra) && (
                    <div className="flex items-center justify-between px-6 py-2 border-b border-gray-100 flex-shrink-0 rounded-t-xl bg-white">
                        <div className="flex items-center gap-2">
                            {title && (
                                <h3 className="text-base font-bold text-brand-subtitle">
                                    {title}
                                </h3>
                            )}
                            {headerExtra}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-brand-options hover:text-brand-subtitle hover:bg-gray-100 transition-colors"
                            aria-label="Cerrar modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
                <div className="p-6 overflow-y-auto flex-1 rounded-b-xl">{children}</div>
            </div>
        </div>
    );
};