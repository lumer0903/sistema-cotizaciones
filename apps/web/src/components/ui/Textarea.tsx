'use client';

import { forwardRef, TextareaHTMLAttributes, ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';
import {
  FIELD_BASE,
  FIELD_ERROR,
  FIELD_ERROR_TEXT,
  FIELD_LABEL,
} from './fieldStyles';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, icon, className, disabled, required, id, ...props }, ref) => {
    const autoId = useId();
    const textareaId = id ?? autoId;
    const errorId = `${textareaId}-error`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className={FIELD_LABEL}>
            {label}
            {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div
              className="absolute left-3 top-3 pointer-events-none text-brand-options"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <textarea
            ref={ref}
            id={textareaId}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'w-full min-h-24 py-2 resize-y',
              icon ? 'pl-11 pr-3' : 'px-3',
              FIELD_BASE,
              error && FIELD_ERROR,
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className={FIELD_ERROR_TEXT} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
