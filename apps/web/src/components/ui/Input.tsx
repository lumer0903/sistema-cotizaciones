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
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#414141]">
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    {icon && (
                        <div className="absolute left-3 pointer-events-none flex items-center justify-center text-[#8E8E8E]">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        disabled={disabled}
                        className={`
              w-full h-10 text-xs sm:text-sm rounded-xl border border-[#E4E4E4] bg-white 
              font-medium text-[#414141] transition-all 
              placeholder:text-[#8E8E8E] 
              hover:border-[#8E8E8E]
              focus:bg-white focus:outline-none focus:border-[#F8B602] focus:ring-2 focus:ring-[#F8B602]/25
              disabled:bg-[#E4E4E4]/40 disabled:text-[#8E8E8E] disabled:border-[#E4E4E4] disabled:cursor-not-allowed
              ${icon ? 'pl-9 pr-3.5' : 'px-3.5'} 
              ${error ? '!border-[#7B1C1C] focus:!ring-red-100' : ''} 
              ${className}
            `.trim()}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-[#7B1C1C] font-medium">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';