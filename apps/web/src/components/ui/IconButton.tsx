'use client';

import { type LucideIcon } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { cn } from '@/lib/cn';

interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: LucideIcon;
  label: string;
  destructive?: boolean;
}

/** Shared action control: a consistent icon, accessible name and touch target. */
export function IconButton({ icon: Icon, label, destructive, className, ...props }: IconButtonProps) {
  return <Button variant="ghost" {...props} title={label} aria-label={label}
    className={cn('h-9 w-9 p-0 max-sm:min-h-11 max-sm:min-w-11 text-accent-ink', destructive && 'text-danger hover:text-danger-hover', className)}>
    <Icon className="h-4 w-4" aria-hidden="true" />
  </Button>;
}
