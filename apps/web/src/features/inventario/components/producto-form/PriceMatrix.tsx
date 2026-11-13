'use client';

import React from 'react';
import { Store, Truck } from 'lucide-react';
import { cn } from '@/lib/cn';

export type PriceUnit = 'unidad' | 'docena' | 'caja';
export type PriceField =
  | `precio_tienda_${PriceUnit}`
  | `precio_distribuidor_${PriceUnit}`;

export interface PriceMatrixProps {
  /** Props de registro (RHF) por unidad para la tarjeta Tienda. */
  tienda: Record<PriceUnit, React.InputHTMLAttributes<HTMLInputElement>>;
  /** Props de registro (RHF) por unidad para la tarjeta Distribuidor. */
  distribuidor: Record<PriceUnit, React.InputHTMLAttributes<HTMLInputElement>>;
  /** Mensajes de error de zod por campo. */
  errors?: Partial<Record<PriceField, string>>;
}

const ROWS: Array<{ unit: PriceUnit; label: string }> = [
  { unit: 'unidad', label: 'Unidad' },
  { unit: 'docena', label: 'Docena' },
  { unit: 'caja', label: 'Mayor' },
];

interface PriceRowProps {
  field: PriceField;
  label: string;
  accessibleLabel: string;
  registerProps: React.InputHTMLAttributes<HTMLInputElement>;
  error?: string;
  labelClass: string;
  borderClass: string;
  focusBorderClass: string;
}

/** Fila con etiqueta a la izquierda e input numérico a la derecha. */
function PriceRow({
  field,
  label,
  accessibleLabel,
  registerProps,
  error,
  labelClass,
  borderClass,
  focusBorderClass,
}: PriceRowProps) {
  const inputId = `price-${field}`;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className={cn('text-xs font-bold shrink-0', labelClass)}
        >
          {label}
        </label>
        <input
          id={inputId}
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          aria-label={accessibleLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          data-field={field}
          className={cn(
            'h-7 w-24 rounded-lg border bg-white px-2 text-right text-xs font-medium text-[#414141] tabular-nums placeholder:text-[#8D8D8D] focus:outline-none transition-colors',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            error ? 'border-danger text-danger' : cn(borderClass, focusBorderClass)
          )}
          {...registerProps}
        />
      </div>
      {error && (
        <p id={errorId} className="text-[11px] font-medium text-danger text-right" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Matriz de precios con 2 tarjetas compactas lado a lado.
 * - Tarjeta izquierda: Cliente tienda (fondo azul #E8F2FE, borde #C4DEFE)
 * - Tarjeta derecha: Cliente distribuidor (fondo naranja/ámbar #FFF3E4, borde #FEDEBA)
 */
export function PriceMatrix({ tienda, distribuidor, errors = {} }: PriceMatrixProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Tarjeta izquierda — Cliente tienda */}
      <section
        className="relative overflow-hidden rounded-xl bg-[#E8F2FE] border border-[#C4DEFE] p-3 space-y-1.5"
        aria-label="Cliente tienda"
      >
        <Store
          className="absolute -bottom-6 -right-6 size-36 text-[#1F41AF] opacity-10 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-xs text-xs font-bold text-[#1F41AF]">
              <Store className="size-3.5" aria-hidden="true" />
              Cliente tienda
            </span>
          </div>
          <p className="text-[11px] font-medium text-[#1F41AF]">
            Por unidad: docena desde 12; mayor desde 13
          </p>
          <div className="space-y-1 pt-0.5">
            {ROWS.map(({ unit, label }) => {
              const field = `precio_tienda_${unit}` as PriceField;
              return (
                <PriceRow
                  key={field}
                  field={field}
                  label={label}
                  accessibleLabel={`Precio tienda, por ${label.toLowerCase()} en soles`}
                  registerProps={tienda[unit]}
                  error={errors[field]}
                  labelClass="text-[#1F41AF]"
                  borderClass="border-[#C4DEFE]"
                  focusBorderClass="focus:border-[#1F41AF]"
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Tarjeta derecha — Cliente distribuidor */}
      <section
        className="relative overflow-hidden rounded-xl bg-[#FFF3E4] border border-[#FEDEBA] p-3 space-y-1.5"
        aria-label="Cliente distribuidor"
      >
        <Truck
          className="absolute -bottom-6 -right-6 size-36 text-[#9D3A19] opacity-10 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-xs text-xs font-bold text-[#9D3A19]">
              <Truck className="size-3.5" aria-hidden="true" />
              Cliente distribuidor
            </span>
          </div>
          <p className="text-[11px] font-medium text-[#9D3A19]">
            Por unidad: docena desde 12; mayor desde 13
          </p>
          <div className="space-y-1 pt-0.5">
            {ROWS.map(({ unit, label }) => {
              const field = `precio_distribuidor_${unit}` as PriceField;
              return (
                <PriceRow
                  key={field}
                  field={field}
                  label={label}
                  accessibleLabel={`Precio distribuidor, por ${label.toLowerCase()} en soles`}
                  registerProps={distribuidor[unit]}
                  error={errors[field]}
                  labelClass="text-[#9D3A19]"
                  borderClass="border-[#FEDEBA]"
                  focusBorderClass="focus:border-[#9D3A19]"
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
