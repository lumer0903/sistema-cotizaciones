'use client';

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, className = '', disabled, ...props }, ref) => {
        return (
            <div className="w-full space-y-1">
                {label && (
                    <label className="block text-[10px] sm:text-xs font-black text-amber-500 uppercase tracking-wider">
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    {icon && (
                        <div className="absolute left-3 text-amber-500 pointer-events-none flex items-center justify-center">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        disabled={disabled}
                        className={`w-full h-10 rounded-xl border border-amber-400/80 bg-white text-xs sm:text-sm font-medium text-zinc-800 transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${icon ? 'pl-9 pr-3' : 'px-3'
                            } ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input'; 
