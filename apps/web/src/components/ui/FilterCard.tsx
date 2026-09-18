'use client';

import React from 'react';

interface FilterCardProps {
    children: React.ReactNode;
    className?: string;
}

export const FilterCard: React.FC<FilterCardProps> = ({ children, className = '' }) => {
    return (
        <div
            className={`
        w-full 
        bg-white 
        rounded-2xl 
        border border-zinc-200/80 
        border-l-4 border-l-amber-400 
        p-6 
        shadow-sm shadow-zinc-100/50 
        transition-all duration-200 
        ${className}
      `}
        >
            {children}
        </div>
    );
};

