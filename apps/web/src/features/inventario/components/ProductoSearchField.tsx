'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui';
import { formatCode, formatText } from '@/lib/formatters';

export interface ProductoSearchItem {
    id_producto: number;
    codigo: string;
    descripcion: string;
}

export interface ProductoSearchFieldProps<T extends ProductoSearchItem> {
    /** Catálogo ya cargado por el modal. */
    productos: T[];
    /** Texto visible (controlado por el padre). */
    value: string;
    /** Cambio de texto: el padre decide limpiar la selección actual. */
    onValueChange: (value: string) => void;
    /** Selección de una sugerencia. */
    onSelect: (producto: T) => void;
    label?: string;
    placeholder?: string;
    error?: string;
    /** Máximo de sugerencias visibles (patrón del proyecto: 3). */
    maxSuggestions?: number;
    loading?: boolean;
    loadError?: string | null;
    /** Píldora de stock de la derecha de cada sugerencia. */
    stockPill?: (producto: T) => ReactNode;
}

/**
 * Buscador de productos con autocompletado (patrón combobox del APG).
 * Compartido por Transferencia, Movimiento y Kárdex: una sola copia del
 * filtrado, del listbox y del teclado (flechas, Enter, Escape, clic fuera).
 */
export function ProductoSearchField<T extends ProductoSearchItem>({
    productos,
    value,
    onValueChange,
    onSelect,
    label = 'Buscar producto',
    placeholder = 'Buscar por código o nombre...',
    error,
    maxSuggestions = 3,
    stockPill,
    loading = false,
    loadError,
}: ProductoSearchFieldProps<T>) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const listboxId = useId();

    const query = value.toLowerCase().trim();
    const sugerencias = query
        ? productos
              .filter(
                  (p) =>
                      p.codigo.toLowerCase().includes(query) ||
                      p.descripcion.toLowerCase().includes(query)
              )
              .slice(0, maxSuggestions)
        : [];
    const listOpen = open && query.length > 0;
    // Índice activo acotado al tamaño actual de la lista (evita desajustes al filtrar)
    const active = sugerencias.length ? Math.min(activeIndex, sugerencias.length - 1) : 0;

    // Clic fuera → cierra sugerencias
    useEffect(() => {
        if (!listOpen) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [listOpen]);

    const choose = (producto: T) => {
        onSelect(producto);
        setActiveIndex(0);
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            if (listOpen) {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
            }
            return;
        }
        if (!listOpen) return;

        // Con lista abierta Enter elige la opción en vez de enviar el formulario
        if (e.key === 'Enter') {
            e.preventDefault();
            if (sugerencias[active]) choose(sugerencias[active]);
            return;
        }
        if (sugerencias.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex((active + 1) % sugerencias.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex((active - 1 + sugerencias.length) % sugerencias.length);
                break;
            case 'Home':
                e.preventDefault();
                setActiveIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setActiveIndex(sugerencias.length - 1);
                break;
            case 'Tab':
                setOpen(false);
                break;
        }
    };

    return (
        <div className="relative w-full" ref={rootRef}>
            <Input
                label={label}
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    setActiveIndex(0);
                    onValueChange(e.target.value);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                onClick={() => setOpen(true)}
                error={error}
                autoComplete="off"
                role="combobox"
                aria-expanded={listOpen}
                aria-controls={listOpen ? listboxId : undefined}
                aria-autocomplete="list"
                aria-activedescendant={
                    listOpen && sugerencias[active] ? `${listboxId}-opt-${active}` : undefined
                }
                icon={<Search className="w-4 h-4" />}
            />

            {!listOpen && loadError && <p role="alert" className="mt-1 text-xs text-danger">{loadError}</p>}
            {listOpen && (
                <div
                    id={listboxId}
                    role="listbox"
                    aria-label={label}
                    className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-border-default bg-white shadow-popover"
                >
                    {loading || loadError ? (
                        <p role={loadError ? "alert" : "status"} className="p-3 text-xs">{loadError || "Buscando productos..."}</p>
                    ) : sugerencias.length > 0 ? (
                        sugerencias.map((p, index) => (
                            <div
                                key={p.id_producto}
                                id={`${listboxId}-opt-${index}`}
                                role="option"
                                aria-selected={index === active}
                                onClick={() => choose(p)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={cn(
                                    'flex w-full cursor-pointer items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5 text-left transition-colors last:border-b-0',
                                    index === active && 'bg-surface-muted'
                                )}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-xs font-bold text-brand-subtitle">
                                        {formatCode(p.codigo)}
                                    </span>
                                    <span className="block truncate text-xs text-brand-options">
                                        {formatText(p.descripcion)}
                                    </span>
                                </span>
                                {stockPill && (
                                    <span className="shrink-0 rounded border border-border-default bg-surface-muted px-2 py-0.5 text-xs font-medium text-brand-options">
                                        {stockPill(p)}
                                    </span>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="px-3 py-3 text-center text-xs text-brand-options">
                            No se encontraron productos coincidentes
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
