'use client';

import React from 'react';
import { Pencil, Eye } from 'lucide-react';
import { CotizacionItem } from '../types/cotizacion';
import { formatCode } from '@/lib/formatters';

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
        <div className="w-full bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200/60 text-neutral-700 text-xs font-extrabold font-['DM_Sans'] uppercase tracking-wider">
                            <th className="py-3 px-4">CODIGO</th>
                            <th className="py-3 px-4 w-36">CLIENTE</th>
                            <th className="py-3 px-4 w-28 text-center">TIPO</th>
                            <th className="py-3 px-4 w-28 text-center">FECHA</th>
                            <th className="py-3 px-4 w-28 text-center">TOTAL</th>
                            <th className="py-3 px-4 w-28 text-center">ESTADO</th>
                            <th className="py-3 px-4 w-32 text-right">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm font-['DM_Sans']">
                        {data.map((item, index) => {
                            const isBorrador = item.estado === 'BORRADOR';

                            return (
                                <tr key={item.id_cotizacion || item.id || index} className="hover:bg-gray-50/60 transition-colors">
                                    {/* CODIGO */}
                                    <td className="py-3 px-4 w-36 font-normal text-zinc-600 whitespace-nowrap uppercase">
                                        {formatCode(item.codigo)}
                                    </td>

                                    {/* CLIENTE */}
                                    <td className="py-3 px-4 flex-1 min-w-[200px] font-light text-neutral-700 whitespace-nowrap">
                                        {typeof item.cliente === 'string'
                                            ? item.cliente
                                            : (item.cliente as any)?.nombre || (item.cliente as any)?.nombre_cliente || '-'}
                                    </td>

                                    {/* TIPO BADGE */}
                                    <td className="py-3 px-4 w-28 text-center whitespace-nowrap">
                                        <span
                                            className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${item.tipo === 'DISTRIBUIDOR'
                                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                                : 'border-blue-300 bg-blue-50 text-blue-800'
                                            }`}
                                        >
                                            {item.tipo}
                                        </span>
                                    </td>

                                    {/* FECHA */}
                                    <td className="py-3 px-4 w-28 text-center font-light text-neutral-700 whitespace-nowrap">
                                        {item.fecha}
                                    </td>

                                    {/* TOTAL */}
                                    <td className="py-3 px-4 w-28 text-center font-light text-emerald-600 whitespace-nowrap">
                                        S/{item.total}
                                    </td>

                                    {/* ESTADO BADGE */}
                                    <td className="py-3 px-4 w-28 text-center whitespace-nowrap">
                                        <span
                                            className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${item.estado === 'BORRADOR'
                                                ? 'border-neutral-200 text-neutral-300 bg-gray-50'
                                                : item.estado === 'APROBADO'
                                                    ? 'border-emerald-300 text-emerald-600 bg-emerald-50'
                                                    : item.estado === 'ENVIADO'
                                                        ? 'border-blue-300 text-blue-600 bg-blue-50'
                                                        : 'border-rose-300 text-rose-800 bg-rose-50'
                                            }`}
                                        >
                                            {item.estado}
                                        </span>
                                    </td>

                                    {/* ACCIONES */}
                                    <td className="py-3 px-4 w-32 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-3">
                                            {/* Lápiz (Editar): Activo solo en BORRADOR */}
                                            <button
                                                type="button"
                                                disabled={!isBorrador}
                                                onClick={() => onEdit?.(item.id_cotizacion || item.id)}
                                                className={`p-1 transition-colors ${isBorrador
                                                        ? 'text-yellow-500 hover:text-yellow-600 cursor-pointer'
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
                                                        ? 'text-yellow-500 hover:text-yellow-600 cursor-pointer'
                                                        : 'text-gray-200 cursor-not-allowed'
                                                    }`}
                                                title={!isBorrador ? 'Ver documento (solo lectura)' : 'No disponible en borrador'}
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};