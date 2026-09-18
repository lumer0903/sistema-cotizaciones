'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

    return (
        <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
                <span>Mostrar</span>
                <select
                    value={limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    className="h-8 border border-amber-400/80 rounded-lg px-2 bg-white text-xs font-bold text-zinc-700 focus:outline-none focus:border-amber-500"
                >
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                    <option value={24}>24</option>
                </select>
                <span>registros por página</span>
            </div>

            <div>
                Mostrando <span className="font-bold text-zinc-800">{startItem}</span> a{' '}
                <span className="font-bold text-zinc-800">{endItem}</span> de{' '}
                <span className="font-bold text-zinc-800">{totalItems}</span> {itemLabel}
            </div>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={currentPage === 1 || loading}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="size-4 text-zinc-600" />
                </button>

                {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((numPage) => (
                    <button
                        key={numPage}
                        type="button"
                        onClick={() => onPageChange(numPage)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${currentPage === numPage
                            ? 'bg-amber-500 text-white'
                            : 'border border-gray-200 text-zinc-600 hover:bg-gray-100'
                            }`}
                    >
                        {numPage}
                    </button>
                ))}

                <button
                    type="button"
                    disabled={currentPage === totalPages || totalItems === 0 || loading}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="size-4 text-zinc-600" />
                </button>
            </div>
        </div>
    );
};
