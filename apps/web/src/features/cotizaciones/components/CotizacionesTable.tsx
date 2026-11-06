'use client';
import { IconButton } from '@/components/ui/IconButton';

import React from 'react';
import { Pencil, Eye } from 'lucide-react';
import { CotizacionItem } from '../types/cotizacion';
import { formatCode } from '@/lib/formatters';
import { Badge, ESTADO_BADGE, TIPO_CLIENTE_BADGE, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Can } from '@/components/shared/Can';
import { cn } from '@/lib/cn';

interface CotizacionesTableProps {
    data: CotizacionItem[];
    loading?: boolean;
    onEdit?: (id: string | number) => void;
    onView?: (id: string | number) => void;
}

// Definición de columnas con anchos fluidos y comportamiento responsive
const COLUMNS = [
  { key: 'CODIGO', headerClassName: 'font-semibold', cellClassName: 'min-w-[100px] max-w-[140px] whitespace-nowrap' },
  { key: 'CLIENTE', headerClassName: '', cellClassName: 'min-w-[160px] max-w-[220px] truncate' },
  { key: 'TIPO', headerClassName: 'text-center', cellClassName: 'min-w-[80px] max-w-[100px] text-center whitespace-nowrap' },
  { key: 'FECHA', headerClassName: 'text-center', cellClassName: 'min-w-[100px] max-w-[120px] text-center whitespace-nowrap' },
  { key: 'TOTAL', headerClassName: 'text-right', cellClassName: 'min-w-[100px] max-w-[120px] text-right whitespace-nowrap tabular-nums' },
  { key: 'ESTADO', headerClassName: 'text-center', cellClassName: 'min-w-[100px] max-w-[120px] text-center whitespace-nowrap' },
  { key: 'ACCIONES', headerClassName: 'text-right', cellClassName: 'min-w-[100px] max-w-[120px] text-right' },
] as const;

export const CotizacionesTable: React.FC<CotizacionesTableProps> = ({
    data,
    loading = false,
    onEdit,
    onView,
}) => {
    if (loading) {
        return (
            <div className="w-full bg-surface rounded-2xl border border-border-default shadow-card p-12 text-center text-brand-options font-sans">
                Cargando cotizaciones...
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full bg-surface rounded-2xl border border-border-default shadow-card p-12 text-center text-brand-options font-sans">
                No se encontraron cotizaciones.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {COLUMNS.map((col) => (
                        <TableHead
                            key={col.key}
                            className={cn(
                                col.headerClassName,
                                col.cellClassName,
                            )}
                        >
                            {col.key}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((item, index) => {
                    const isBorrador = item.estado === 'BORRADOR';
                    /* ESTADO BADGE SEGURO: validar que el estado sea un valor conocido para prevenir XSS */
                    const safeEstado = item.estado &&
                      Object.values(ESTADO_BADGE).includes(ESTADO_BADGE[item.estado as keyof typeof ESTADO_BADGE])
                        ? item.estado
                        : 'BORRADOR';

                    return (
                        <TableRow key={item.id_cotizacion || item.id || index}>
                            {/* CODIGO */}
                            <TableCell className={cn('font-normal text-zinc-600 uppercase', COLUMNS[0].cellClassName)}>
                                {formatCode(item.codigo)}
                            </TableCell>

                            {/* CLIENTE */}
                            <TableCell
                                className={cn('font-light text-zinc-700 truncate', COLUMNS[1].cellClassName)}
                                title={typeof item.cliente === 'string'
                                    ? item.cliente
                                    : (item.cliente as any)?.nombre || (item.cliente as any)?.nombre_cliente || '-'}
                            >
                                {typeof item.cliente === 'string'
                                    ? item.cliente
                                    : (item.cliente as any)?.nombre || (item.cliente as any)?.nombre_cliente || '-'}
                            </TableCell>

                            {/* TIPO BADGE */}
                            <TableCell className={cn('', COLUMNS[2].cellClassName)}>
                                <Badge variant={TIPO_CLIENTE_BADGE[String(item.tipo).toLowerCase()] ?? 'brand'} size="estado">
                                    {item.tipo}
                                </Badge>
                            </TableCell>

                            {/* FECHA */}
                            <TableCell className={cn('font-light text-zinc-700', COLUMNS[3].cellClassName)}>
                                {item.fecha}
                            </TableCell>

                            {/* TOTAL */}
                            <TableCell className={cn('font-light text-estado-aprobado-text tabular-nums', COLUMNS[4].cellClassName)}>
                                S/ {item.total}
                            </TableCell>

                            {/* ESTADO BADGE SEGURO */}
                            <TableCell className={cn('', COLUMNS[5].cellClassName)}>
                                <Badge variant={ESTADO_BADGE[safeEstado as keyof typeof ESTADO_BADGE] ?? 'neutral'} size="estado">
                                    {safeEstado === 'PARCIALMENTE_PAGADA' ? 'PARCIAL' : safeEstado}
                                </Badge>
                            </TableCell>

                            {/* ACCIONES */}
                            <TableCell className={COLUMNS[6].cellClassName}>
                                <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                    {/* Lápiz (Editar): Activo solo en BORRADOR, protegido con Can */}
                                    <Can modulo="cotizaciones" nivel="edicion">
                                        <IconButton icon={Pencil} label={isBorrador ? 'Editar cotización' : 'No editable'} onClick={() => onEdit?.(item.id_cotizacion || item.id)} disabled={!isBorrador}  />
                                    </Can>
                                    {/* Ojo (Ver): Protegido con Can nivel lectura */}
                                    <Can modulo="cotizaciones" nivel="lectura">
                                        <IconButton icon={Eye} label={!isBorrador ? 'Ver documento' : 'No disponible en borrador'} onClick={() => onView?.(item.id_cotizacion || item.id)} disabled={isBorrador}  />
                                    </Can>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};
