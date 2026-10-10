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
  { unit: 'caja', label: 'Caja' },
];

interface PriceRowProps {
  /** Nombre técnico del campo (data-field para testing/inspección). */
  field: PriceField;
  /** Etiqueta visible. */
  label: string;
  /** Nombre accesible completo ("Precio tienda, por unidad en soles"). */
  accessibleLabel: string;
  registerProps: React.InputHTMLAttributes<HTMLInputElement>;
  error?: string;
  /** Tinta del rol (texto de etiqueta, prefijo y cifra). */
  accentClass: string;
  /** Borde del rol para el input. */
  borderClass: string;
}

/** Fila "etiqueta + S/ + importe" dentro de la tarjeta de cliente. */
function PriceRow({
  field,
  label,
  accessibleLabel,
  registerProps,
  error,
  accentClass,
  borderClass,
}: PriceRowProps) {
  const inputId = `price-${field}`;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={inputId}
          className={cn('text-xs font-bold uppercase tracking-wider shrink-0', accentClass)}
        >
          {label}
        </label>
        <div className="relative w-32">
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-black',
              accentClass
            )}
          >
            S/
          </span>
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
              'w-full h-9 rounded-lg border bg-white pl-7 pr-2.5 text-right text-sm font-semibold tnum',
              'transition-colors placeholder:text-brand-options focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              error ? 'border-danger text-danger' : cn(borderClass, accentClass)
            )}
            {...registerProps}
          />
        </div>
      </div>
      {error && (
        <p id={errorId} className="text-[11px] font-medium text-danger text-right" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface ClientCardProps {
  /** Chip del tipo de cliente ("Cliente tienda"). */
  chip: string;
  /** Texto secundario del encabezado. */
  hint: string;
  icon: React.ElementType;
  accentClass: string;
  borderClass: string;
  softClass: string;
  watermarkClass: string;
  children: React.ReactNode;
}

/** Mini-card de un tipo de cliente: chip + campos de precio. */
function ClientCard({ chip, hint, icon: Icon, accentClass, borderClass, softClass, watermarkClass, children }: ClientCardProps) {
  return (
    <section
      className={cn('group relative overflow-hidden flex flex-col rounded-2xl border p-5 transition-[box-shadow,transform] hover:shadow-md', borderClass, softClass)}
      aria-label={chip}
    >
      {/* Ícono de fondo (Marca de Agua) con animación premium al hover */}
      <Icon 
        className={cn(
          "absolute -bottom-8 -left-6 h-48 w-48 -rotate-12 pointer-events-none select-none z-0 transition-[transform] duration-500 group-hover:scale-110 group-hover:-rotate-6", 
          watermarkClass
        )} 
        aria-hidden="true" 
      />

      {/* Contenido interactivo */}
      <div className="relative z-10 flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm',
              borderClass,
              accentClass
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {chip}
          </span>
          <span className={cn('text-[10px] font-semibold uppercase tracking-wider', accentClass)}>
            {hint}
          </span>
        </header>
        <div className="flex flex-col gap-2.5">{children}</div>
      </div>
    </section>
  );
}

/**
 * Matriz de precios en dos tarjetas por tipo de cliente
 * (Tienda vs Distribuidor × Unidad/Docena/Caja).
 * Accesible: etiqueta + nombre accesible por campo, errores visibles,
 * cifras tabulares y chip con icono (el color nunca comunica solo).
 */
export function PriceMatrix({ tienda, distribuidor, errors = {} }: PriceMatrixProps) {
  const buildRows = (
    prefix: 'precio_tienda' | 'precio_distribuidor',
    accesor: Record<PriceUnit, React.InputHTMLAttributes<HTMLInputElement>>,
    origin: 'tienda' | 'distribuidor',
    accentClass: string,
    borderClass: string
  ) =>
    ROWS.map(({ unit, label }) => {
      const field = `${prefix}_${unit}` as PriceField;
      return (
        <PriceRow
          key={field}
          field={field}
          label={label}
          accessibleLabel={`Precio ${origin}, por ${label.toLowerCase()} en soles`}
          registerProps={accesor[unit]}
          error={errors[field]}
          accentClass={accentClass}
          borderClass={borderClass}
        />
      );
    });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ClientCard
        chip="Cliente tienda"
        hint="Precio estándar"
        icon={Store}
        accentClass="text-blue-900"
        borderClass="border-blue-200/80"
        softClass="bg-blue-50/40 shadow-2xs"
        watermarkClass="text-blue-500/10"
      >
        {buildRows('precio_tienda', tienda, 'tienda', 'text-blue-900', 'border-blue-200/80')}
      </ClientCard>

      <ClientCard
        chip="Cliente distribuidor"
        hint="Precio mayoreo"
        icon={Truck}
        accentClass="text-amber-900"
        borderClass="border-amber-200/80"
        softClass="bg-amber-50/40 shadow-2xs"
        watermarkClass="text-amber-700/10"
      >
        {buildRows(
          'precio_distribuidor',
          distribuidor,
          'distribuidor',
          'text-amber-900',
          'border-amber-200/80'
        )}
      </ClientCard>
    </div>
  );
}
