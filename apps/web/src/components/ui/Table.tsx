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
        'w-full rounded-xl border border-border-default shadow-card overflow-x-auto select-text bg-surface',
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
        'bg-surface-muted/80 border-b border-border-default uppercase tracking-wider [&_tr]:hover:bg-transparent',
        sticky && '[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10 [&>tr>th]:bg-surface-muted',
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
    <tbody ref={ref} className={cn('divide-y divide-border-default', className)} {...props}>
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
              if (e.defaultPrevented || e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                (onClick as unknown as React.KeyboardEventHandler<HTMLTableRowElement>)(e);
              }
            }
          : undefined
      }
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'group transition-colors duration-100 ease-in-out hover:bg-surface-muted/50',
        onClick && 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
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
  ({ children, className, style, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('text-xs font-semibold text-brand-options align-middle', className)}
      style={{
        paddingTop: 'var(--table-head-py)',
        paddingBottom: 'var(--table-head-py)',
        paddingLeft: 'var(--table-head-px)',
        paddingRight: 'var(--table-head-px)',
        ...style,
      }}
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
  ({ children, className, style, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('align-middle', className)}
      style={{
        paddingTop: 'var(--table-cell-py)',
        paddingBottom: 'var(--table-cell-py)',
        paddingLeft: 'var(--table-cell-px)',
        paddingRight: 'var(--table-cell-px)',
        ...style,
      }}
      {...props}
    >
      {children}
    </td>
  )
);
TableCell.displayName = 'TableCell';
