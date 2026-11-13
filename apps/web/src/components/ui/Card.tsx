'use client';

import React, { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_6px_rgba(15,23,42,0.05)] overflow-hidden transition-[box-shadow] duration-150 hover:border-[#CBD5E1] hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition-all',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 border-b border-border-default', className)}
      {...props}
    >
      {children}
    </div>
  ),
);
CardHeader.displayName = 'CardHeader';

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  ),
);
CardContent.displayName = 'CardContent';

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 border-t border-border-default bg-surface-muted/50', className)}
      {...props}
    >
      {children}
    </div>
  ),
);
CardFooter.displayName = 'CardFooter';
