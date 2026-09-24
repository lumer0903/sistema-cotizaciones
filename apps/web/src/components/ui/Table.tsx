'use client';

import React from 'react';

// Componente Contenedor de la Tabla
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    children?: React.ReactNode;
    className?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
    ({ children, className = '', ...props }, ref) => (
        <div className="w-full rounded-xl border border-gray-100 shadow-sm overflow-x-auto bg-white">
            <table
                ref={ref}
                className={`w-full text-left text-sm text-brand-subtitle ${className}`}
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
}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
    ({ children, className = '', ...props }, ref) => (
        <thead
            ref={ref}
            className={`bg-gray-50/80 border-b border-gray-200 uppercase tracking-wider ${className}`}
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
    ({ children, className = '', ...props }, ref) => (
        <tbody
            ref={ref}
            className={`divide-y divide-gray-100 ${className}`}
            {...props}
        >
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
    ({ children, className = '', onClick, ...props }, ref) => (
        <tr
            ref={ref}
            onClick={onClick}
            className={`transition-colors hover:bg-brand-soft ${onClick ? 'cursor-pointer' : ''
                } ${className}`}
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
    ({ children, className = '', ...props }, ref) => (
        <th ref={ref} className={`py-3.5 px-4 text-xs font-semibold text-gray-600 align-middle ${className}`} {...props}>
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
    ({ children, className = '', ...props }, ref) => (
        <td ref={ref} className={`py-3 px-4 align-middle ${className}`} {...props}>
            {children}
        </td>
    )
);
TableCell.displayName = 'TableCell';