'use client';

import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';
import {
  FIELD_BASE_FILTER,
  FIELD_BASE_MODAL,
  FIELD_ERROR,
  FIELD_ERROR_TEXT,
  FIELD_HEIGHT,
  FIELD_LABEL_FILTER,
  FIELD_LABEL_MODAL,
  FieldVariant,
} from './fieldStyles';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  variant?: FieldVariant;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, disabled, id, required, variant = 'modal', ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;

    const isFilter = variant === 'filter';
    const labelClass = isFilter ? FIELD_LABEL_FILTER : FIELD_LABEL_MODAL;
    const baseFieldClass = isFilter ? FIELD_BASE_FILTER : FIELD_BASE_MODAL;
    const iconColor = isFilter ? 'text-[#F8B602]' : 'text-[#8D8D8D]';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(labelClass)}
          >
            {label}
            {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative flex items-center peer">
          {icon && (
            <div
              className={cn("absolute left-3 pointer-events-none flex items-center justify-center", iconColor)}
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
              isFilter ? FIELD_HEIGHT : 'h-8 px-2.5',
              isFilter ? 'px-3' : undefined,
              baseFieldClass,
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