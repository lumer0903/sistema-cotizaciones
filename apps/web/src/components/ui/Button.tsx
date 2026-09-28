'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed select-none shrink-0';

    const variantStyles = {
      // Primary: Fondo amarillo con texto e ícono blanco
      primary:
        'bg-[#F8B602] text-white hover:bg-[#e0a402] active:bg-[#c89302] active:scale-[0.98] focus:ring-[#F8B602] shadow-sm disabled:bg-[#E4E4E4] disabled:text-[#8E8E8E]',

      // Secondary: Tono suave con borde
      secondary:
        'bg-[#FFF8E7] text-[#414141] border border-[#F8B602]/40 hover:bg-[#fceec9] hover:border-[#F8B602] active:bg-[#f7e3aa] active:scale-[0.98] focus:ring-[#F8B602] disabled:bg-[#f5f5f5] disabled:border-[#E4E4E4] disabled:text-[#8E8E8E]',

      // Outline
      outline:
        'bg-white text-[#414141] border border-[#E4E4E4] hover:bg-zinc-50 hover:border-[#8E8E8E] active:bg-zinc-100 active:scale-[0.98] focus:ring-zinc-400 disabled:bg-[#f5f5f5] disabled:text-[#8E8E8E] disabled:border-[#E4E4E4]',

      // Ghost
      ghost:
        'bg-transparent text-[#414141] hover:bg-zinc-100 active:bg-zinc-200 active:scale-[0.98] focus:ring-zinc-300 disabled:text-[#8E8E8E]',

      // Icon: Forzamos [&>svg]:w-5 [&>svg]:h-5 para garantizar que NINGÚN ícono se encoja
      icon:
        'bg-white text-[#414141] border border-[#E4E4E4] hover:bg-[#FFF8E7] hover:border-[#F8B602] hover:text-[#414141] active:bg-[#fceec9] active:scale-[0.95] focus:ring-[#F8B602] disabled:bg-[#f5f5f5] disabled:text-[#8E8E8E] disabled:border-[#E4E4E4] [&>svg]:w-5 [&>svg]:h-5 [&>svg]:stroke-[2]',

      // Danger
      danger:
        'bg-[#7B1C1C] text-white hover:bg-[#631616] active:bg-[#4d1111] active:scale-[0.98] focus:ring-red-400 disabled:bg-[#E4E4E4] disabled:text-[#8E8E8E]',
    };

    const sizeStyles = {
      xs: 'h-8 px-2.5 text-xs gap-1.5',
      sm: 'h-9 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-xs sm:text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    };

    // Si es variante ícono, le damos tamaño cuadrado perfecto (40x40px)
    const finalSize = variant === 'icon' ? 'h-10 w-10 p-0' : sizeStyles[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${finalSize} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';