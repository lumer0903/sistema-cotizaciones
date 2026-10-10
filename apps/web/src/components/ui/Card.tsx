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
        'bg-white rounded-2xl shadow-card overflow-hidden transition-[box-shadow] duration-150 hover:shadow-card-hover',
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
      className={cn('px-6 py-4 border-b border-zinc-100', className)}
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
      className={cn('px-6 py-4 border-t border-zinc-100 bg-zinc-50/50', className)}
      {...props}
    >
      {children}
    </div>
  ),
);
CardFooter.displayName = 'CardFooter';