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
    | 'enviado'
    | 'parcial'
    | 'vendedor'
    | 'gerente'
    | 'administrador'
    | 'activo'
    | 'inactivo';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: 'sm' | 'md' | 'estado' | 'xl';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'brand',
    size = 'sm',
    className = '',
}) => {
    // Pill grande (diseño Figma): encabezados y detalle/resumen.
    // El color SIEMPRE depende del variant (estado de la cotización).
    if (size === 'xl') {
        const xlVariants: Record<string, string> = {
            neutral: 'bg-neutral-200 outline-zinc-600 text-neutral-700',
            secondary: 'bg-neutral-200 outline-zinc-600 text-neutral-700',
            borrador: 'bg-neutral-200 outline-zinc-600 text-neutral-700',
            brand: 'bg-brand-soft outline-brand-primary text-brand-primary',
            enviado: 'bg-estado-enviado-soft outline-estado-enviado text-estado-enviado-text',
            aprobado: 'bg-estado-aprobado-soft outline-estado-aprobado text-estado-aprobado-text',
            rechazado: 'bg-estado-rechazado-soft outline-estado-rechazado text-estado-rechazado-text',
            parcial: 'bg-amber-50 outline-amber-500 text-amber-600',
        };
        const color = xlVariants[variant] ?? xlVariants.neutral;
        return (
            <span
                className={`inline-flex justify-center items-center h-9 px-4 rounded-lg outline outline-1 outline-offset-[-1px] ${color} text-base font-bold ${className}`.trim()}
            >
                {children}
            </span>
        );
    }

    // Estilos de TEXTO PLANO (Sin fondo ni bordes - Exactos a la tabla del sistema)
    const plainTextVariants: Record<string, string> = {
        // Estados de Cotización / Venta
        borrador: 'text-zinc-500 font-bold uppercase tracking-wide',
        enviado: 'text-[#2563EB] font-bold uppercase tracking-wide',
        aprobado: 'text-[#059669] font-bold uppercase tracking-wide',
        rechazado: 'text-[#DC2626] font-bold uppercase tracking-wide',
        parcial: 'text-[#D97706] font-bold uppercase tracking-wide',

        // Tipos de Precio / Cliente
        tienda: 'text-[#1D4ED8] font-bold uppercase',
        distribuidor: 'text-[#A13A17] font-bold uppercase',

        // Roles de Usuario
        vendedor: 'text-emerald-600 font-semibold',
        gerente: 'text-blue-600 font-semibold',
        administrador: 'text-amber-600 font-semibold',

        // Estados de Usuario
        activo: 'text-emerald-600 font-bold uppercase',
        inactivo: 'text-rose-500 font-bold uppercase',
    };

    if (variant in plainTextVariants) {
        return (
            <span className={`text-sm ${plainTextVariants[variant]} ${className}`.trim()}>
                {children}
            </span>
        );
    }

    // Pills con fondo y borde (variantes genéricas: brand/success/warning/danger/neutral/secondary)
    const variants: Record<string, string> = {
        brand: 'bg-brand-selection text-brand-subtitle border-brand-primary/40',
        success: 'bg-estado-aprobado-soft text-estado-aprobado-text border-estado-aprobado/40',
        warning: 'bg-brand-soft text-brand-subtitle border-brand-primary/40',
        danger: 'bg-estado-rechazado-soft text-estado-rechazado-text border-estado-rechazado/40',
        neutral: 'bg-estado-borrador text-estado-borrador-text border-estado-borrador',
        secondary: 'bg-estado-enviado-soft text-estado-enviado-text border-estado-enviado/40',
        tienda: 'bg-tienda-soft text-tienda border-tienda/40',
        distribuidor: 'bg-distribuidor-soft text-distribuidor border-distribuidor/40',
    };
    const sizes: Record<string, string> = {
        sm: 'px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
        md: 'px-2.5 py-1 text-xs font-semibold',
        estado: 'px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase',
    };
    const color = variants[variant] ?? variants.neutral;
    const sizeClass = sizes[size] ?? sizes.md;
    return (
        <span className={`inline-flex items-center rounded-md border ${color} ${sizeClass} ${className}`.trim()}>
            {children}
        </span>
    );
};
