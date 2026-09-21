'use client';

import React from 'react';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'secondary';
    size?: 'sm' | 'md';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'brand',
    size = 'md',
    className = '',
}) => {
    const variants = {
        brand: 'bg-brand-selection text-brand-subtitle border-brand-primary/40',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-rose-50 text-rose-700 border-rose-200',
        neutral: 'bg-gray-100 text-brand-options border-gray-200',
        secondary: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
        md: 'px-2.5 py-1 text-xs font-semibold',
    };

    return (
        <span className={`inline-flex items-center rounded-md border ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </span>
    );
};
