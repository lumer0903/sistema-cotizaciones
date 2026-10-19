'use client';

import { Package } from 'lucide-react';
import { Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, FilterCard } from '@/components/ui';
import type { DetalleReporte } from '@/features/reportes/types';

interface AlertasStockTableProps {
  alertasStock: DetalleReporte['alertasStock'];
}

export function AlertasStockTable({ alertasStock }: AlertasStockTableProps) {
  return (
    <FilterCard>
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-accent-ink" />
        <h2 className="text-lg font-semibold text-zinc-900">Alertas de stock activas</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Almacén</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Mínimo</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alertasStock.map((alerta) => (
            <TableRow key={alerta.id_alerta}>
              <TableCell className="font-mono text-xs">{alerta.codigo}</TableCell>
              <TableCell>{alerta.descripcion}</TableCell>
              <TableCell>{alerta.almacen_nombre}</TableCell>
              <TableCell>{alerta.stock_actual}</TableCell>
              <TableCell>{alerta.stock_minimo}</TableCell>
              <TableCell>
                <Badge variant={alerta.estado === 'activa' ? 'danger' : 'neutral'}>{alerta.estado}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {alertasStock.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500">
                No hay alertas de stock activas
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </FilterCard>
  );
}