'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'yellowOutline' | 'danger';
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
      'inline-flex items-center justify-center font-black font-sans rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      // 1. "Agregar Producto" (Amarillo marca)
      primary:
        'bg-brand-primary text-white hover:bg-brand-hover focus:ring-brand-primary outline outline-1 outline-offset-[-1px] outline-brand-primary shadow-sm',

      // 2. "Continuar" (Gris neutro)
      secondary:
        'bg-brand-options text-white hover:bg-brand-options/80 focus:ring-brand-options outline outline-1 outline-offset-[-1px] outline-brand-options shadow-sm',

      // 3. "AGREGAR" (Borde gris sin fondo)
      outline:
        'bg-transparent text-brand-options hover:bg-brand-soft outline outline-1 outline-offset-[-1px] outline-brand-options focus:ring-brand-options',

      // 4. "REEMPLAZAR" (Borde y texto amarillo con fondo translúcido)
      yellowOutline:
        'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 outline outline-1 outline-offset-[-1px] outline-brand-primary focus:ring-brand-primary',

      // 5. "Cancelar" (Sin fondo ni bordes)
      ghost:
        'bg-transparent text-brand-options hover:bg-brand-soft focus:ring-brand-options/50',

      // 6. Alerta/Peligro (solo destructivo)
      danger:
        'bg-danger text-white hover:bg-danger-hover focus:ring-danger outline outline-1 outline-offset-[-1px] outline-danger shadow-sm',
    };

    const sizeStyles = {
      xs: 'h-7 px-3.5 py-1 text-[10px] gap-1',
      sm: 'h-9 px-3 py-1.5 text-xs gap-1.5',
      md: 'h-10 px-3.5 py-2.5 text-base gap-2',
      lg: 'h-12 px-6 py-3 text-lg gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
