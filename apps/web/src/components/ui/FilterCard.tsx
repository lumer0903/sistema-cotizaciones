'use client';

import React from 'react';

interface FilterCardProps {
    children: React.ReactNode;
    className?: string;
    accentBorder?: boolean;
}

export const FilterCard: React.FC<FilterCardProps> = ({
    children,
    className = '',
    accentBorder = false
}) => {
    return (
        <div
            className={`
        w-full 
        min-w-0
        bg-white 
        rounded-2xl 
        border border-zinc-200/90 
        ${accentBorder ? 'border-l-4 border-l-brand-primary' : ''}
        p-4 sm:p-5 
        shadow-sm shadow-zinc-100 
        transition-all duration-200 
        ${className}
      `.trim()}
        >
            {children}
        </div>
    );
};