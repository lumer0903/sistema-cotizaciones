'use client';

import React from 'react';
import { cn } from '@/lib/cn';

// Componente Contenedor de la Tabla
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children?: React.ReactNode;
  className?: string;
  /** Clases aplicadas al contenedor con scroll horizontal (borde, sombra, redondeo) */
  wrapperClassName?: string;
  /** Label accesible para la región de scroll horizontal. */
  scrollLabel?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    { children, className, wrapperClassName, scrollLabel = 'Tabla', ...props },
    ref
  ) => (
    <div className={cn('w-full rounded-2xl border-2 border-[#F3F4F6] bg-white overflow-hidden', wrapperClassName)} role="region" aria-label={scrollLabel} tabIndex={0}>
      <div className="w-full overflow-x-auto">
        <table ref={ref} className={cn('w-full border-collapse text-left', className)} {...props}>
          {children}
        </table>
      </div>
    </div>
  )
);
Table.displayName = 'Table';

// Cabecera Contenedora (thead)
export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children?: React.ReactNode;
  className?: string;
  _sticky?: boolean;
}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ children, className, _sticky = false, ...props }, ref) => (
    <thead ref={ref} className={cn('bg-[#E5E5EB]/60', className)} {...props}>
      {children}
    </thead>
  )
);
TableHeader.displayName = 'TableHeader';

// Cuerpo de la Tabla (tbody)
export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children?: React.ReactNode;
  className?: string;
}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ children, className, ...props }, ref) => (
    <tbody ref={ref} className={cn('divide-y divide-[#F3F4F6] bg-white', className)} {...props}>
      {children}
    </tbody>
  )
);
TableBody.displayName = 'TableBody';

// Fila de la Tabla (tr)
export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children?: React.ReactNode;
  className?: string;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ children, className, onClick, ...props }, ref) => (
    <tr ref={ref} onClick={onClick} onKeyDown={onClick ? (e) => { if (e.defaultPrevented || e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (onClick as unknown as React.KeyboardEventHandler<HTMLTableRowElement>)(e); } } : undefined} tabIndex={onClick ? 0 : undefined} className={cn('hover:bg-neutral-50/80 transition-colors', className)} {...props}>
      {children}
    </tr>
  )
);
TableRow.displayName = 'TableRow';

// Celda de Cabecera (th)
export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  className?: string;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ children, className, style, ...props }, ref) => (
    <th ref={ref} className={cn('px-5 py-3 text-xs sm:text-sm font-extrabold text-[#414141] uppercase tracking-wide whitespace-nowrap', className)} style={{ paddingTop: 'var(--table-head-py)', paddingBottom: 'var(--table-head-py)', paddingLeft: 'var(--table-head-px)', paddingRight: 'var(--table-head-px)', ...style }} {...props}>
      {children}
    </th>
  )
);
TableHead.displayName = 'TableHead';

// Celda de Datos (td)
export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  className?: string;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ children, className, style, ...props }, ref) => (
    <td ref={ref} className={cn('px-5 py-3 text-sm sm:text-base font-light text-[#414141]', className)} style={{ paddingTop: 'var(--table-cell-py)', paddingBottom: 'var(--table-cell-py)', paddingLeft: 'var(--table-cell-px)', paddingRight: 'var(--table-cell-px)', ...style }} {...props}>
      {children}
    </td>
  )
);
TableCell.displayName = 'TableCell';