'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
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
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'w-full bg-white border rounded-xl outline-none transition-colors placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed';
    const focusStyles = 'focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20';
    const errorStyles = error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-brand-primary focus:ring-brand-primary/20';
    const paddingStyles = icon ? 'pl-11 pr-4' : 'px-4';
    const sizeStyles = 'h-24 py-3 text-sm';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold text-brand-subtitle uppercase tracking-wider mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-3 text-gray-400 pointer-events-none">
              {icon}
            </div>
          )}
          <textarea
            ref={ref}
            disabled={disabled}
            required={required}
            className={`${baseStyles} ${errorStyles} ${focusStyles} ${paddingStyles} ${sizeStyles} ${className}`}
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