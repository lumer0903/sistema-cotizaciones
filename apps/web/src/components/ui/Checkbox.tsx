'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Native checkbox semantics with the shared brand colors and a clear check mark. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, disabled, ...props }, ref) => (
    <span className={cn('relative inline-flex size-5 shrink-0 align-middle', disabled && 'opacity-50')}>
      <input {...props} ref={ref} type="checkbox" disabled={disabled}
        className={cn(
          'peer m-0 size-5 appearance-none rounded-[4px] border-2 border-brand-options bg-surface cursor-pointer transition-colors',
          'checked:border-accent-primary checked:bg-accent-primary hover:border-accent-ink',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed',
          className,
        )}
      />
      <Check aria-hidden="true" strokeWidth={3} className="pointer-events-none absolute inset-0 m-auto size-4 text-on-accent opacity-0 peer-checked:opacity-100" />
    </span>
  ),
);
Checkbox.displayName = 'Checkbox';
