'use client';

import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';

export type PriceUnit = 'unidad' | 'docena' | 'caja';
export type PriceField =
  | `precio_tienda_${PriceUnit}`
  | `precio_distribuidor_${PriceUnit}`;

export interface PriceMatrixProps {
  /** Props de registro (RHF) por unidad para la columna Tienda. */
  tienda: Record<PriceUnit, React.InputHTMLAttributes<HTMLInputElement>>;
  /** Props de registro (RHF) por unidad para la columna Distribuidor. */
  distribuidor: Record<PriceUnit, React.InputHTMLAttributes<HTMLInputElement>>;
  /** Mensajes de error de zod por campo. */
  errors?: Partial<Record<PriceField, string>>;
}

const ROWS: Array<{ unit: PriceUnit; label: string }> = [
  { unit: 'unidad', label: 'UNIDAD' },
  { unit: 'docena', label: 'DOCENA' },
  { unit: 'caja', label: 'CAJA' },
];

interface PriceCellProps {
  /** Nombre técnico del campo (data-field para testing/inspección). */
  field: PriceField;
  label: string;
  registerProps: React.InputHTMLAttributes<HTMLInputElement>;
  error?: string;
  /** Clase de acento de la columna (tinta del rol). */
  accentClass: string;
  /** Clase de fondo suave de la columna. */
  softClass: string;
}

function PriceCell({
  field,
  label,
  registerProps,
  error,
  accentClass,
  softClass,
}: PriceCellProps) {
  return (
    <TableCell className={softClass}>
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1 font-medium">
          <span className={`${accentClass} font-semibold select-none`} aria-hidden="true">
            S/
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            aria-label={label}
            aria-invalid={error ? true : undefined}
            data-field={field}
            className={`
              w-24 text-left bg-transparent outline-none py-1 rounded px-1 tnum
              focus:bg-white focus:border focus:border-gray-300
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
              ${error ? 'text-danger focus:!border-danger' : accentClass}
            `.trim()}
            {...registerProps}
          />
        </div>
        {error && (
          <p className="text-[10px] font-medium text-danger text-center" role="alert">
            {error}
          </p>
        )}
      </div>
    </TableCell>
  );
}

/**
 * Matriz de precios (Tienda vs Distribuidor × Unidad/Docena/Caja).
 * Accesible: aria-label por celda, errores visibles y cifras tabulares.
 */
export function PriceMatrix({ tienda, distribuidor, errors = {} }: PriceMatrixProps) {
  return (
    <Table className="text-center text-xs" scrollLabel="Matriz de precios">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-center text-brand-ink py-3">UNIDAD DE MEDIDA</TableHead>
          <TableHead className="text-center text-role-tienda py-3 bg-role-tienda-soft/40">
            PRECIO TIENDA (S/)
          </TableHead>
          <TableHead className="text-center text-role-distribuidor py-3 bg-role-distribuidor-soft/40">
            DISTRIBUIDOR (S/)
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map(({ unit, label }) => (
          <TableRow key={unit} className="hover:bg-transparent">
            <TableCell className="font-bold text-brand-ink py-2.5 text-center">{label}</TableCell>
            <PriceCell
              field={`precio_tienda_${unit}`}
              label={`Precio tienda, por ${label.toLowerCase()} en soles`}
              registerProps={tienda[unit]}
              error={errors[`precio_tienda_${unit}`]}
              accentClass="text-role-tienda"
              softClass="bg-role-tienda-soft/30"
            />
            <PriceCell
              field={`precio_distribuidor_${unit}`}
              label={`Precio distribuidor, por ${label.toLowerCase()} en soles`}
              registerProps={distribuidor[unit]}
              error={errors[`precio_distribuidor_${unit}`]}
              accentClass="text-role-distribuidor"
              softClass="bg-role-distribuidor-soft/30"
            />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
