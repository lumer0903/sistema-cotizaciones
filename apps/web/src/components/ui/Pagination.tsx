'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
    loading?: boolean;
    itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    limit,
    onPageChange,
    onLimitChange,
    loading = false,
    itemLabel = 'registros',
}) => {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
    const endItem = Math.min(currentPage * limit, totalItems);

    const limitOptions = [8, 16, 24, 32, 48, 64].map((n) => ({
        label: String(n),
        value: n,
    }));

    const displayLimit = limitOptions.some((o) => o.value === limit) ? limit : 8;

    // Ventana de páginas: evita renderizar decenas de botones y desbordar en móvil
    const getPageItems = (): (number | 'ellipsis')[] => {
        const total = totalPages || 1;
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

        const candidates = Array.from(
            new Set(
                [1, total, currentPage - 1, currentPage, currentPage + 1].filter(
                    (p) => p >= 1 && p <= total
                )
            )
        ).sort((a, b) => a - b);

        const items: (number | 'ellipsis')[] = [];
        let prev = 0;
        for (const page of candidates) {
            if (prev && page - prev > 1) items.push('ellipsis');
            items.push(page);
            prev = page;
        }
        return items;
    };

    return (
        <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
            <div className="flex items-center gap-2 whitespace-nowrap">
                <span>Mostrar</span>
                <Select
                    value={displayLimit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    options={limitOptions}
                    sizeVariant="sm"
                    aria-label="Registros por página"
                    className="w-auto"
                />
                <span>registros por página</span>
            </div>

            <div>
                Mostrando <span className="font-bold text-brand-subtitle">{startItem}</span> a{' '}
                <span className="font-bold text-brand-subtitle">{endItem}</span> de{' '}
                <span className="font-bold text-brand-subtitle">{totalItems}</span> {itemLabel}
            </div>

            <nav aria-label="Paginación" className="flex items-center gap-1 flex-wrap justify-end">
                <button
                    type="button"
                    disabled={currentPage === 1 || loading}
                    onClick={() => onPageChange(currentPage - 1)}
                    aria-label="Página anterior"
                    className="min-h-11 min-w-11 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="size-4 text-zinc-600" />
                </button>

                {getPageItems().map((item, index) =>
                    item === 'ellipsis' ? (
                        <span
                            key={`ellipsis-${index}`}
                            className="min-h-11 min-w-11 flex items-center justify-center text-xs text-zinc-500 select-none"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            onClick={() => onPageChange(item)}
                            aria-label={`Página ${item}`}
                            aria-current={currentPage === item ? 'page' : undefined}
                            className={`min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === item
                                ? 'bg-brand-primary text-white'
                                : 'border border-gray-200 text-zinc-600 hover:bg-gray-100'
                            }`}
                        >
                            {item}
                        </button>
                    )
                )}

                <button
                    type="button"
                    disabled={currentPage === totalPages || totalItems === 0 || loading}
                    onClick={() => onPageChange(currentPage + 1)}
                    aria-label="Página siguiente"
                    className="min-h-11 min-w-11 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="size-4 text-zinc-600" />
                </button>
            </nav>
        </div>
    );
};
