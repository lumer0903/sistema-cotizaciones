'use client';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, FilterCard } from '@/components/ui';

interface CotizadoVsVendidoProps {
  data: Array<{ mes: string; cotizado: number; vendido: number }>;
}

export function CotizadoVsVendido({ data }: CotizadoVsVendidoProps) {
  return (
    <FilterCard>
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Cotizado vs vendido (6 meses)</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mes</TableHead>
            <TableHead>Cotizado</TableHead>
            <TableHead>Vendido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.mes}>
              <TableCell>{row.mes}</TableCell>
              <TableCell>{row.cotizado}</TableCell>
              <TableCell>{row.vendido}</TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-zinc-500">
                Sin datos en los últimos 6 meses
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </FilterCard>
  );
}
