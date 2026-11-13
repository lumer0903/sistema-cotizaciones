'use client';

import React from 'react';
import { Pencil, Eye } from 'lucide-react';
import { CotizacionItem } from '../types/cotizacion';
import { formatCode } from '@/lib/formatters';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  CotizacionStatusBadge,
  ClienteTipoTag,
} from '@/components/ui';
import { Can } from '@/components/shared/Can';
import { cn } from '@/lib/cn';
interface CotizacionesTableProps {
  data: CotizacionItem[];
  loading?: boolean;
  onEdit?: (id: string | number) => void;
  onView?: (id: string | number) => void;
  footer?: React.ReactNode;
}

// Definición de columnas con anchos fluidos y comportamiento responsive
// REGLA CRÍTICA: Mantener exactamente las 7 columnas intactas
const COLUMNS = [
  { key: 'CÓDIGO', headerClassName: '', cellClassName: 'min-w-[120px] max-w-[160px] whitespace-nowrap font-semibold text-slate-900 tabular-nums' },
  { key: 'CLIENTE', headerClassName: '', cellClassName: 'min-w-[160px] max-w-[220px] truncate text-slate-700' },
  { key: 'TIPO', headerClassName: 'text-center', cellClassName: 'min-w-[80px] max-w-[110px] text-center whitespace-nowrap' },
  { key: 'FECHA', headerClassName: 'text-center', cellClassName: 'min-w-[100px] max-w-[120px] text-center whitespace-nowrap text-slate-500 tabular-nums' },
  { key: 'TOTAL', headerClassName: 'text-right', cellClassName: 'min-w-[100px] max-w-[120px] text-right whitespace-nowrap tabular-nums font-medium text-slate-900' },
  { key: 'ESTADO', headerClassName: 'text-center', cellClassName: 'min-w-[100px] max-w-[130px] text-center whitespace-nowrap' },
  { key: 'ACCIONES', headerClassName: 'text-right', cellClassName: 'min-w-[100px] max-w-[120px] text-right' },
] as const;

export const CotizacionesTable: React.FC<CotizacionesTableProps> = ({
  data,
  loading = false,
  onEdit,
  onView,
  footer,
}) => {
  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border-2 border-[#E5E7EB] p-12 text-left text-sm text-[#414141]">
        Cargando tabla...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border-2 border-[#E5E7EB] p-12 text-left text-sm text-[#414141]">
        No se encontraron cotizaciones.
      </div>
    );
  }

  return (
    <Table footer={footer}>
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
          const rawEstado = String(item.estado || 'BORRADOR');

          return (
            <TableRow key={item.id_cotizacion || item.id || index}>
              {/* CÓDIGO — identificador principal */}
              <TableCell className={cn(COLUMNS[0].cellClassName)}>
                {formatCode(item.codigo)}
              </TableCell>

              {/* CLIENTE */}
              <TableCell
                className={cn('truncate', COLUMNS[1].cellClassName)}
                title={
                  typeof item.cliente === 'string'
                    ? item.cliente
                    : (item.cliente as any)?.nombre || (item.cliente as any)?.nombre_cliente || '-'
                }
              >
                {typeof item.cliente === 'string'
                  ? item.cliente
                  : (item.cliente as any)?.nombre || (item.cliente as any)?.nombre_cliente || '-'}
              </TableCell>

              {/* TIPO (CategoryTag rectangular) */}
              <TableCell className={cn(COLUMNS[2].cellClassName)}>
                <ClienteTipoTag tipo={String(item.tipo || '')} />
              </TableCell>

              {/* FECHA */}
              <TableCell className={cn('whitespace-nowrap', COLUMNS[3].cellClassName)}>
                {item.fecha}
              </TableCell>

              {/* TOTAL */}
              <TableCell className={cn('tabular-nums whitespace-nowrap', COLUMNS[4].cellClassName)}>
                S/ {item.total}
              </TableCell>

              {/* ESTADO (StatusBadge con píldora neutra y punto de color) */}
              <TableCell className={cn(COLUMNS[5].cellClassName)}>
                <CotizacionStatusBadge estado={rawEstado} />
              </TableCell>

              {/* ACCIONES — botones táctiles compactos size-7 con hover específico */}
              <TableCell className={COLUMNS[6].cellClassName}>
                <div className="flex items-center justify-end gap-1">
                  {/* Lápiz (Editar): Activo solo en BORRADOR, protegido con Can */}
<Can modulo="cotizaciones" nivel="edicion">
                      <button
                        type="button"
                        onClick={() => onEdit?.(item.id_cotizacion || item.id)}
                        disabled={!isBorrador}
                        title={isBorrador ? 'Editar cotización' : 'No editable'}
                        aria-label={isBorrador ? 'Editar cotización' : 'No editable'}
                        className="size-7 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200/15 hover:text-[#F8B600] text-[#F8B600]"
                      >
                        <Pencil className="size-4 text-[#F8B600]" strokeWidth={1.75} />
                      </button>
                    </Can>
                    {/* Ojo (Ver): Protegido con Can nivel lectura */}
                    <Can modulo="cotizaciones" nivel="lectura">
                      <button
                        type="button"
                        onClick={() => onView?.(item.id_cotizacion || item.id)}
                        disabled={isBorrador}
                        title={!isBorrador ? 'Ver documento' : 'No disponible en borrador'}
                        aria-label={!isBorrador ? 'Ver documento' : 'No disponible en borrador'}
                        className="size-7 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200/15 hover:text-[#F8B600] text-[#F8B600]"
                      >
                        <Eye className="size-4 text-[#F8B600]" strokeWidth={1.75} />
                      </button>
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
