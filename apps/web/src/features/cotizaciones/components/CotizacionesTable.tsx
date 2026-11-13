'use client';
import { IconButton } from '@/components/ui/IconButton';

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
  TableBadge,
  type TableBadgeVariant,
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

// Mapeos a TableBadgeVariant
const TIPO_BADGE_VARIANT: Record<string, TableBadgeVariant> = {
  distribuidor: 'terracota',
  tienda: 'blue',
};

const ESTADO_BADGE_VARIANT: Record<string, TableBadgeVariant> = {
  BORRADOR: 'neutral',
  ENVIADO: 'info',
  ENVIADA: 'info',
  APROBADO: 'success',
  APROBADA: 'success',
  ACEPTADO: 'success',
  ACEPTADA: 'success',
  RECHAZADO: 'danger',
  RECHAZADA: 'danger',
  PARCIALMENTE_PAGADA: 'neutral',
  PARCIAL: 'neutral',
};

// Definición de columnas con anchos fluidos y comportamiento responsive
const COLUMNS = [
  { key: 'Código', headerClassName: '', cellClassName: 'min-w-[100px] max-w-[140px] whitespace-nowrap' },
  { key: 'Cliente', headerClassName: '', cellClassName: 'min-w-[160px] max-w-[220px] truncate' },
  { key: 'TIPO', headerClassName: 'text-center', cellClassName: 'min-w-[80px] max-w-[110px] text-center whitespace-nowrap' },
  { key: 'FECHA', headerClassName: 'text-center', cellClassName: 'min-w-[100px] max-w-[120px] text-center whitespace-nowrap' },
  { key: 'TOTAL', headerClassName: 'text-right', cellClassName: 'min-w-[100px] max-w-[120px] text-right whitespace-nowrap tabular-nums' },
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
          const rawEstado = String(item.estado || 'BORRADOR').toUpperCase();
          const estadoVariant = ESTADO_BADGE_VARIANT[rawEstado] ?? 'neutral';

          const rawTipo = String(item.tipo || '').toLowerCase();
          const tipoVariant = TIPO_BADGE_VARIANT[rawTipo] ?? 'neutral';

          return (
            <TableRow key={item.id_cotizacion || item.id || index}>
              {/* CODIGO */}
              <TableCell className={cn('font-normal text-[#575757] whitespace-nowrap', COLUMNS[0].cellClassName)}>
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

              {/* TIPO BADGE */}
              <TableCell className={cn(COLUMNS[2].cellClassName)}>
                <TableBadge variant={tipoVariant}>
                  {item.tipo}
                </TableBadge>
              </TableCell>

              {/* FECHA */}
              <TableCell className={cn('whitespace-nowrap', COLUMNS[3].cellClassName)}>
                {item.fecha}
              </TableCell>

              {/* TOTAL */}
              <TableCell className={cn('tabular-nums whitespace-nowrap', COLUMNS[4].cellClassName)}>
                S/ {item.total}
              </TableCell>

              {/* ESTADO BADGE SEGURO */}
              <TableCell className={cn(COLUMNS[5].cellClassName)}>
                <TableBadge variant={estadoVariant}>
                  {rawEstado === 'PARCIALMENTE_PAGADA' ? 'PARCIAL' : rawEstado}
                </TableBadge>
              </TableCell>

              {/* ACCIONES */}
              <TableCell className={COLUMNS[6].cellClassName}>
                <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  {/* Lápiz (Editar): Activo solo en BORRADOR, protegido con Can */}
                  <Can modulo="cotizaciones" nivel="edicion">
                    <IconButton
                      icon={Pencil}
                      label={isBorrador ? 'Editar cotización' : 'No editable'}
                      onClick={() => onEdit?.(item.id_cotizacion || item.id)}
                      disabled={!isBorrador}
                      className="h-8 w-8"
                    />
                  </Can>
                  {/* Ojo (Ver): Protegido con Can nivel lectura */}
                  <Can modulo="cotizaciones" nivel="lectura">
                    <IconButton
                      icon={Eye}
                      label={!isBorrador ? 'Ver documento' : 'No disponible en borrador'}
                      onClick={() => onView?.(item.id_cotizacion || item.id)}
                      disabled={isBorrador}
                      className="h-8 w-8"
                    />
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
