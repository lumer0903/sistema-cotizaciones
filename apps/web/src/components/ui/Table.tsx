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
  /** Slot para paginación o acciones inferiores dentro del mismo contenedor con borde */
  footer?: React.ReactNode;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    { children, className, wrapperClassName, scrollLabel = 'Tabla', footer, ...props },
    ref
  ) => (
    <div
      className={cn(
        'w-full rounded-2xl border-2 border-[#E5E7EB] bg-white overflow-hidden',
        wrapperClassName
      )}
      role="region"
      aria-label={scrollLabel}
      tabIndex={0}
    >
      <div className="w-full overflow-x-auto">
        <table ref={ref} className={cn('w-full border-collapse text-left', className)} {...props}>
          {children}
        </table>
      </div>
      {footer && (
        <div className="border-t border-[#E5E7EB] bg-white px-6 py-3.5">
          {footer}
        </div>
      )}
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
    <thead ref={ref} className={cn('bg-[#E5E7EB]/60 border-b border-[#E5E7EB]', className)} {...props}>
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
      className={cn('h-14 bg-white hover:bg-neutral-50/80 transition-colors', className)}
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
      className={cn(
        'h-14 px-6 text-xs sm:text-sm font-extrabold text-[#414141] uppercase tracking-wide whitespace-nowrap align-middle',
        className
      )}
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
    <td
      ref={ref}
      className={cn(
        'px-6 py-3 text-sm sm:text-base font-light text-[#414141] align-middle',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
);
TableCell.displayName = 'TableCell';

// Footer opcional de tabla para totales o sumarios en tfoot
export interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children?: React.ReactNode;
  className?: string;
}

export const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ children, className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('border-t border-[#E5E7EB] bg-white font-medium text-[#414141]', className)}
      {...props}
    >
      {children}
    </tfoot>
  )
);
TableFooter.displayName = 'TableFooter';

// Badge de estado y tipo unificado para tablas Figma
export type TableBadgeVariant = 'terracota' | 'blue' | 'info' | 'success' | 'danger' | 'neutral';

export interface TableBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TableBadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const tableBadgeVariantStyles: Record<TableBadgeVariant, string> = {
  terracota: 'border-[#9D3A19] text-[#9D3A19] bg-transparent',
  blue: 'border-[#1F41AF] text-[#1F41AF] bg-transparent',
  info: 'border-[#006EFF] text-[#006EFF] bg-transparent',
  success: 'border-[#0CC200] text-[#0CC200] bg-transparent',
  danger: 'border-[#7B1C1C] text-[#7B1C1C] bg-transparent',
  neutral: 'border-[#E4E4E4] bg-[#F3F4F6]/50 text-[#575757]',
};

export const TableBadge: React.FC<TableBadgeProps> = ({
  variant = 'neutral',
  children,
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[104px] px-3 py-1 rounded-lg border text-xs sm:text-sm font-bold uppercase tracking-wide whitespace-nowrap',
        tableBadgeVariantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
