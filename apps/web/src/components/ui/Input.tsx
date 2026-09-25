'use client';

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: ReactNode;
    variant?: 'default' | 'modal';
    sizeVariant?: 'sm' | 'md';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            icon,
            variant = 'default',
            sizeVariant = 'md',
            className = '',
            disabled,
            ...props
        },
        ref
    ) => {
        const isModal = variant === 'modal';

        // Colores directos para evitar heredar variables doradas/amarillas globales
        const borderColor = isModal ? '#d4d4d8' : 'var(--color-brand-primary)'; // zinc-300
        const focusColor = isModal ? '#71717a' : 'var(--color-brand-primary)'; // zinc-500
        const textColor = '#3f3f46'; // zinc-700
        const labelIconColor = isModal ? '#71717a' : 'var(--color-brand-primary)'; // zinc-500

        const heightClass = sizeVariant === 'sm' ? 'h-8 text-xs' : 'h-10 text-xs sm:text-sm';

        return (
            <div className="w-full space-y-1">
                {label && (
                    <label
                        className="block text-[10px] sm:text-xs font-black uppercase tracking-wider transition-colors"
                        style={{ color: labelIconColor }}
                    >
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    {icon && (
                        <div
                            className="absolute left-3 pointer-events-none flex items-center justify-center transition-colors"
                            style={{ color: labelIconColor }}
                        >
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        disabled={disabled}
                        className={`
              w-full ${heightClass} rounded-2xl border bg-white 
              font-medium transition-colors 
              placeholder:text-zinc-400 focus:outline-none 
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${icon ? 'pl-9 pr-3' : 'px-3.5'} 
              ${error ? '!border-red-500 focus:!border-red-500 focus:ring-2 focus:ring-red-200' : ''} 
              ${className}
            `.trim()}
                        style={{
                            borderColor: error ? undefined : borderColor,
                            color: textColor,
                        }}
                        onFocus={(e) => {
                            if (!error) {
                                e.currentTarget.style.borderColor = focusColor;
                                e.currentTarget.style.boxShadow = `0 0 0 2px color-mix(in srgb, ${focusColor} 20%, transparent)`;
                            }
                        }}
                        onBlur={(e) => {
                            if (!error) {
                                e.currentTarget.style.borderColor = borderColor;
                                e.currentTarget.style.boxShadow = 'none';
                            }
                        }}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';