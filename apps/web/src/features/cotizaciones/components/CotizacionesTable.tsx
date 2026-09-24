'use client';

import React from 'react';
import { Pencil, Eye } from 'lucide-react';
import { CotizacionItem } from '../types/cotizacion';
import { formatCode } from '@/lib/formatters';
import { Badge, ESTADO_BADGE, TIPO_CLIENTE_BADGE, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

interface CotizacionesTableProps {
    data: CotizacionItem[];
    loading?: boolean;
    onEdit?: (id: string | number) => void;
    onView?: (id: string | number) => void;
}

export const CotizacionesTable: React.FC<CotizacionesTableProps> = ({
    data,
    loading = false,
    onEdit,
    onView,
}) => {
    if (loading) {
        return (
            <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-neutral-500 font-['DM_Sans']">
                Cargando cotizaciones...
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-neutral-500 font-['DM_Sans']">
                No se encontraron cotizaciones.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>CODIGO</TableHead>
                    <TableHead className="w-36">CLIENTE</TableHead>
                    <TableHead className="w-28 text-center">TIPO</TableHead>
                    <TableHead className="w-28 text-center">FECHA</TableHead>
                    <TableHead className="w-28 text-center">TOTAL</TableHead>
                    <TableHead className="w-28 text-center">ESTADO</TableHead>
                    <TableHead className="w-32 text-right">ACCIONES</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((item, index) => {
                    const isBorrador = item.estado === 'BORRADOR';

                    return (
                        <TableRow key={item.id_cotizacion || item.id || index}>
                            {/* CODIGO */}
                            <TableCell className="w-36 font-normal text-zinc-600 whitespace-nowrap uppercase">
                                {formatCode(item.codigo)}
                            </TableCell>

                            {/* CLIENTE */}
                            <TableCell className="min-w-[200px] font-light text-neutral-700 whitespace-nowrap">
                                {typeof item.cliente === 'string'
                                    ? item.cliente
                                    : (item.cliente as any)?.nombre || (item.cliente as any)?.nombre_cliente || '-'}
                            </TableCell>

                            {/* TIPO BADGE */}
                            <TableCell className="w-28 text-center whitespace-nowrap">
                                <Badge variant={TIPO_CLIENTE_BADGE[String(item.tipo).toLowerCase()] ?? 'brand'} size="sm">
                                    {item.tipo}
                                </Badge>
                            </TableCell>

                            {/* FECHA */}
                            <TableCell className="w-28 text-center font-light text-neutral-700 whitespace-nowrap">
                                {item.fecha}
                            </TableCell>

                            {/* TOTAL */}
                            <TableCell className="w-28 text-center font-light text-estado-aprobado-text whitespace-nowrap">
                                S/{item.total}
                            </TableCell>

                            {/* ESTADO BADGE */}
                            <TableCell className="w-28 text-center whitespace-nowrap">
                                <Badge variant={ESTADO_BADGE[item.estado] ?? 'neutral'} size="sm">
                                    {item.estado}
                                </Badge>
                            </TableCell>

                            {/* ACCIONES */}
                            <TableCell className="w-32 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-3">
                                    {/* Lápiz (Editar): Activo solo en BORRADOR */}
                                    <button
                                        type="button"
                                        disabled={!isBorrador}
                                        onClick={() => onEdit?.(item.id_cotizacion || item.id)}
                                        className={`p-1 transition-colors ${isBorrador
                                                ? 'text-brand-primary hover:text-brand-hover cursor-pointer'
                                                : 'text-gray-200 cursor-not-allowed'
                                            }`}
                                        title={isBorrador ? 'Editar (borrador)' : 'No editable'}
                                    >
                                        <Pencil className="w-5 h-5" />
                                    </button>

                                    {/* Ojo (Ver): Activo si NO es BORRADOR */}
                                    <button
                                        type="button"
                                        disabled={isBorrador}
                                        onClick={() => onView?.(item.id_cotizacion || item.id)}
                                        className={`p-1 transition-colors ${!isBorrador
                                                ? 'text-brand-primary hover:text-brand-hover cursor-pointer'
                                                : 'text-gray-200 cursor-not-allowed'
                                            }`}
                                        title={!isBorrador ? 'Ver documento (solo lectura)' : 'No disponible en borrador'}
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};
