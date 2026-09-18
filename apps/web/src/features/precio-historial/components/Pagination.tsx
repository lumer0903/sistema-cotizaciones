'use client';

import React from 'react';
import { ChevronRight, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    paginaActual: number;
    totalPaginas: number;
    totalItems: number;
    itemsPorPagina: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
    paginaActual,
    totalPaginas,
    totalItems,
    itemsPorPagina,
    onPageChange,
}) => {
    const paginas = Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => i + 1);

    return (
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-1">
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-500 mr-2">Page</span>
                {paginas.map((num) => (
                    <button
                        key={num}
                        onClick={() => onPageChange(num)}
                        className={`size-8 rounded-md text-xs font-bold transition-colors ${paginaActual === num
                                ? 'bg-yellow-500 text-white shadow-sm'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {num}
                    </button>
                ))}

                <button
                    onClick={() => onPageChange(Math.min(totalPaginas, paginaActual + 1))}
                    className="size-8 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                >
                    <ChevronRight className="size-4" />
                </button>
                <button
                    onClick={() => onPageChange(totalPaginas)}
                    className="size-8 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                >
                    <ChevronsRight className="size-4" />
                </button>
            </div>

            <div className="text-sm text-gray-500 font-normal">
                Mostrando <span className="font-bold text-gray-800">{itemsPorPagina}</span> de{' '}
                <span className="font-bold text-gray-800">{totalItems}</span>
            </div>
        </div>
    );
};