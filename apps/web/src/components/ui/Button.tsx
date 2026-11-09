'use client';

import type React from 'react';
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  /** Si se provee, renderiza como enlace <a> (misma apariencia de botón). */
  href?: string;
  target?: string;
  rel?: string;
  download?: string | boolean;
}

const BASE_STYLES =
  'inline-flex items-center justify-center font-bold rounded-xl transition-[scale,background-color,border-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed select-none shrink-0 active:scale-[0.96]';

const VARIANT_STYLES: Record<NonNullable<ButtonProps['variant']>, string> = {
  // Primary: amarillo de marca con texto on-brand (#18181B) → 10.1:1 WCAG AA
  primary: [
    'bg-accent-primary text-on-accent hover:bg-accent-hover active:bg-accent-primary/90 active:scale-[0.96]',
    'shadow-sm',
    'disabled:bg-status-borrador disabled:text-brand-options',
  ].join(' '),

  secondary: [
    'bg-accent-selection text-brand-subtitle border border-accent-primary/40',
    'hover:bg-accent-primary/20 hover:border-accent-primary active:bg-accent-primary/30 active:scale-[0.96]',
    'disabled:bg-surface-muted disabled:border-status-borrador disabled:text-brand-options',
  ].join(' '),

  outline: [
    'bg-surface text-brand-subtitle border border-border-default',
    'hover:bg-surface-muted hover:border-brand-options active:bg-status-borrador/60 active:scale-[0.96]',
    'disabled:bg-surface-muted disabled:text-brand-options disabled:border-border-default',
  ].join(' '),

  ghost: [
    'bg-transparent text-brand-subtitle hover:bg-surface-muted active:bg-status-borrador/60 active:scale-[0.96]',
    'disabled:text-brand-options',
  ].join(' '),

  icon: [
    'bg-surface text-brand-subtitle border border-border-default',
    'hover:bg-accent-selection hover:border-accent-primary active:bg-accent-primary/20 active:scale-[0.96]',
    'disabled:bg-surface-muted disabled:text-brand-options disabled:border-border-default',
    '[&>svg]:w-5 [&>svg]:h-5 [&>svg]:stroke-[2]',
  ].join(' '),

  danger: [
    'bg-danger text-white hover:bg-danger-hover active:bg-danger/90 active:scale-[0.96]',
    'disabled:bg-status-borrador disabled:text-brand-options',
  ].join(' '),
};

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'h-8 px-2.5 text-sm gap-1.5',
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      type = 'button',
      children,
      className,
      href,
      target,
      rel,
      ...props
    },
    ref
  ) => {
    const finalSize = variant === 'icon' ? 'h-9 w-9 p-0' : SIZE_STYLES[size];
    const isLink = !!href;

    if (isLink) {
      return (
        <a
          {...(props as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={disabled || loading ? undefined : href}
          target={target}
          rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
          aria-disabled={disabled || loading || undefined}
          tabIndex={disabled || loading ? -1 : props.tabIndex}
          onClick={(event) => {
            if (disabled || loading) { event.preventDefault(); return; }
            (props.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>)?.(event);
          }}
          aria-busy={loading || undefined}
          className={cn(BASE_STYLES, VARIANT_STYLES[variant], finalSize, className)}
        >
          {loading && (
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(BASE_STYLES, VARIANT_STYLES[variant], finalSize, className)}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
