'use client';

import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    label: string;
    value: string | number;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    icon?: ReactNode;
    options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, icon, options = [], children, className = '', disabled, ...props }, ref) => {
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
                    <select
                        ref={ref}
                        disabled={disabled}
                        className={`w-full h-10 appearance-none rounded-xl border border-amber-400/80 bg-white text-xs sm:text-sm font-medium text-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed pr-8 ${icon ? 'pl-9' : 'px-3'
                            } ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
                        {...props}
                    >
                        {children ||
                            options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 size-4 text-amber-500 pointer-events-none" />
                </div>
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Select.displayName = 'Select';
