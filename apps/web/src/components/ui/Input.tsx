'use client';

import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';
import {
  FIELD_BASE,
  FIELD_ERROR,
  FIELD_ERROR_TEXT,
  FIELD_HEIGHT,
  FIELD_LABEL,
} from './fieldStyles';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, disabled, id, required, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(FIELD_LABEL, 'peer-focus:text-brand-primary')}
          >
            {label}
            {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative flex items-center peer">
          {icon && (
            <div
              className="absolute left-3 pointer-events-none flex items-center justify-center text-brand-options"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'w-full',
              FIELD_HEIGHT,
              'px-3',
              FIELD_BASE,
              icon ? 'pl-9' : undefined,
              error && FIELD_ERROR,
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className={FIELD_ERROR_TEXT} role="alert" style={{ textAlign: 'left' }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';