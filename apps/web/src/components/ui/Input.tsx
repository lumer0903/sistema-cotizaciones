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
            variant: _variant = 'default',
            sizeVariant = 'md',
            className = '',
            disabled,
            ...props
        },
        ref
    ) => {
        const heightClass = sizeVariant === 'sm' ? 'h-10 text-xs' : 'h-11 text-xs sm:text-sm';

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    {icon && (
                        <div className="absolute left-3 pointer-events-none flex items-center justify-center text-zinc-400">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        disabled={disabled}
                        className={`
              w-full ${heightClass} rounded-xl border border-zinc-200 bg-zinc-50/50 
              font-medium text-zinc-800 transition-all 
              placeholder:text-zinc-400 focus:bg-white focus:outline-none 
              focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20
              disabled:bg-zinc-100 disabled:cursor-not-allowed
              ${icon ? 'pl-9 pr-3' : 'px-3.5'} 
              ${error ? '!border-red-500 focus:!border-red-500 focus:!ring-red-100' : ''} 
              ${className}
            `.trim()}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';