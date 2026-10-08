'use client';

import React from 'react';
import { Pencil, Eye } from 'lucide-react';
import { CotizacionItem } from '../types/cotizacion';
import { formatCode } from '@/lib/formatters';
import { Badge, ESTADO_BADGE, TIPO_CLIENTE_BADGE, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button } from '@/components/ui';
import { Can } from '@/components/shared/Can';

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
            <div className="w-full bg-white rounded-2xl border border-zinc-100 shadow-sm p-12 text-center text-zinc-500 font-sans">
                Cargando cotizaciones...
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full bg-white rounded-2xl border border-zinc-100 shadow-sm p-12 text-center text-zinc-500 font-sans">
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
                    <TableHead className="w-32 text-right sticky right-0 bg-zinc-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">ACCIONES</TableHead>
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
                            <TableCell className="w-36 font-normal text-zinc-600 whitespace-nowrap uppercase">
                                {formatCode(item.codigo)}
                            </TableCell>

                            {/* CLIENTE */}
                            <TableCell
                                className="min-w-[160px] max-w-[220px] truncate font-light text-zinc-700"
                                title={typeof item.cliente === 'string'
                                    ? item.cliente
                                    : (item.cliente as any)?.nombre || (item.cliente as any)?.nombre_cliente || '-'}
                            >
                                {typeof item.cliente === 'string'
                                    ? item.cliente
                                    : (item.cliente as any)?.nombre || (item.cliente as any)?.nombre_cliente || '-'}
                            </TableCell>

                            {/* TIPO BADGE */}
                            <TableCell className="w-28 text-center whitespace-nowrap">
                                <Badge variant={TIPO_CLIENTE_BADGE[String(item.tipo).toLowerCase()] ?? 'brand'} size="estado">
                                    {item.tipo}
                                </Badge>
                            </TableCell>

                            {/* FECHA */}
                            <TableCell className="w-28 text-center font-light text-zinc-700 whitespace-nowrap">
                                {item.fecha}
                            </TableCell>

                            {/* TOTAL */}
                            <TableCell className="w-28 text-center font-light text-estado-aprobado-text whitespace-nowrap tabular-nums">
                                S/{item.total}
                            </TableCell>

                            {/* ESTADO BADGE SEGURO */}
                            <TableCell className="w-28 text-center whitespace-nowrap">
                                <Badge variant={ESTADO_BADGE[safeEstado as keyof typeof ESTADO_BADGE] ?? 'neutral'} size="estado">
                                    {safeEstado === 'PARCIALMENTE_PAGADA' ? 'PARCIAL' : safeEstado}
                                </Badge>
                            </TableCell>

                            {/* ACCIONES */}
                            <TableCell className="w-32 text-right whitespace-nowrap sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                                <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                    {/* Lápiz (Editar): Activo solo en BORRADOR, protegido con Can */}
                                    <Can modulo="cotizaciones" nivel="edicion">
                                        <Button
                                            variant="ghost"
                                            disabled={!isBorrador}
                                            onClick={() => onEdit?.(item.id_cotizacion || item.id)}
                                            className={`min-h-11 min-w-11 p-0 ${isBorrador
                                                ? 'text-brand-ink hover:text-brand-primary cursor-pointer'
                                                : 'text-zinc-300 cursor-not-allowed'}
                                            }`}
                                            title={isBorrador ? 'Editar (borrador)' : 'No editable'}
                                            aria-label={isBorrador ? 'Editar cotización' : 'No editable'}
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </Button>
                                    </Can>
                                    {/* Ojo (Ver): Protegido con Can nivel lectura */}
                                    <Can modulo="cotizaciones" nivel="lectura">
                                        <Button
                                            variant="ghost"
                                            disabled={isBorrador}
                                            onClick={() => onView?.(item.id_cotizacion || item.id)}
                                            className={`min-h-11 min-w-11 p-0 ${!isBorrador
                                                ? 'text-brand-ink hover:text-brand-primary cursor-pointer'
                                                : 'text-zinc-300 cursor-not-allowed'}
                                            }`}
                                            title={!isBorrador ? 'Ver documento (solo lectura)' : 'No disponible en borrador'}
                                            aria-label={!isBorrador ? 'Ver documento' : 'No disponible en borrador'}
                                        >
                                            <Eye className="w-5 h-5" />
                                        </Button>
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