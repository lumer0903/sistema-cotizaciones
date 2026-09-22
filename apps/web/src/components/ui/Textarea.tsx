'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'modal';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      icon,
      className = '',
      disabled,
      required,
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const isModal = variant === 'modal';
    const borderColor = isModal ? '#8E8E8E' : '#F8B602';
    const focusColor = isModal ? '#C9A962' : '#F8B602';
    const textColor = '#414141';
    const labelColor = isModal ? '#8E8E8E' : '#F8B602';
    const iconColor = isModal ? '#8E8E8E' : '#F8B602';

    const baseStyles =
      'w-full bg-white border rounded-xl outline-none transition-colors placeholder:text-zinc-400 disabled:bg-gray-50 disabled:cursor-not-allowed';
    const focusStyles = `focus:border-${isModal ? '[#C9A962]' : 'brand-primary'} focus:ring-2 focus:ring-${isModal ? '[#C9A962]33' : 'brand-primary/20'}`;
    const errorStyles = error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : `border-[${borderColor}] ${focusStyles}`;
    const paddingStyles = icon ? 'pl-11 pr-4' : 'px-4';
    const sizeStyles = 'h-24 py-3 text-sm';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: labelColor }}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-3 pointer-events-none" style={{ color: iconColor }}>
              {icon}
            </div>
          )}
          <textarea
            ref={ref}
            disabled={disabled}
            required={required}
            className={`${baseStyles} ${errorStyles} ${paddingStyles} ${sizeStyles} ${className}`}
            style={{
              borderColor: error ? undefined : borderColor,
              color: textColor,
            }}
            onFocus={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = focusColor;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${focusColor}33`;
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
        {error && (
          <p className="mt-1.5 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';