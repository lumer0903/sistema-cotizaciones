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
    <div
      className={cn(
        'w-full rounded-xl border border-gray-100 shadow-card overflow-x-auto select-text bg-white',
        wrapperClassName
      )}
      role="region"
      aria-label={scrollLabel}
      tabIndex={0}
    >
      <table
        ref={ref}
        className={cn('w-full text-left text-sm text-brand-subtitle tnum', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
);
Table.displayName = 'Table';

// Cabecera Contenedora (thead)
export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ children, className, sticky = false, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        'bg-gray-50/80 border-b border-gray-200 uppercase tracking-wider [&_tr]:hover:bg-transparent',
        sticky && '[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10 [&>tr>th]:bg-gray-50',
        className
      )}
      {...props}
    >
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
    <tbody ref={ref} className={cn('divide-y divide-gray-100', className)} {...props}>
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
    <tr
      ref={ref}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                (onClick as unknown as React.KeyboardEventHandler<HTMLTableRowElement>)(e);
              }
            }
          : undefined
      }
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      className={cn(
        'group transition-colors duration-150 ease-in-out hover:bg-gray-50',
        onClick && 'cursor-pointer',
        className
      )}
      {...props}
    >
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
  ({ children, className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('py-3.5 px-4 text-xs font-semibold text-gray-600 align-middle', className)}
      {...props}
    >
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
  ({ children, className, ...props }, ref) => (
    <td ref={ref} className={cn('py-3 px-4 align-middle', className)} {...props}>
      {children}
    </td>
  )
);
TableCell.displayName = 'TableCell';
