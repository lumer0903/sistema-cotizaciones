'use client';

import React from 'react';

export type BadgeVariant =
    | 'brand'
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'
    | 'secondary'
    | 'tienda'
    | 'distribuidor'
    | 'borrador'
    | 'aprobado'
    | 'rechazado'
    | 'enviado';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: 'sm' | 'md';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'brand',
    size = 'md',
    className = '',
}) => {
    const variants: Record<BadgeVariant, string> = {
        brand: 'bg-brand-selection text-brand-subtitle border-brand-primary/40',
        success: 'bg-estado-aprobado-soft text-estado-aprobado-text border-estado-aprobado/40',
        warning: 'bg-brand-soft text-brand-subtitle border-brand-primary/40',
        danger: 'bg-estado-rechazado-soft text-estado-rechazado-text border-estado-rechazado/40',
        neutral: 'bg-estado-borrador text-estado-borrador-text border-estado-borrador',
        secondary: 'bg-estado-enviado-soft text-estado-enviado-text border-estado-enviado/40',
        tienda: 'bg-tienda-soft text-tienda border-tienda/40',
        distribuidor: 'bg-distribuidor-soft text-distribuidor border-distribuidor/40',
        borrador: 'bg-estado-borrador text-estado-borrador-text border-estado-borrador',
        aprobado: 'bg-estado-aprobado-soft text-estado-aprobado-text border-estado-aprobado/40',
        rechazado: 'bg-estado-rechazado-soft text-estado-rechazado-text border-estado-rechazado/40',
        enviado: 'bg-estado-enviado-soft text-estado-enviado-text border-estado-enviado/40',
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
