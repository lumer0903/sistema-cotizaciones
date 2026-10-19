'use client';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import type { PuntoMensual, ConteoPorEstado } from '../../types/dashboard';

const AXIS_TICK = { fontSize: 12, fill: 'var(--color-brand-options)', fontFamily: 'var(--font-sans)' };
const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border-default)',
  borderRadius: '0.75rem',
  fontSize: 12,
  fontFamily: 'var(--font-sans)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

export const ESTADO_COLORS: Record<string, string> = {
  borrador: 'var(--color-status-borrador-text)',
  enviada: 'var(--color-status-enviado)',
  aprobada: 'var(--color-status-aprobado)',
  rechazada: 'var(--color-status-rechazado)',
  parcialmente_pagada: 'var(--color-status-advertencia-text)',
};

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  parcialmente_pagada: 'Parcial',
};

const formatSoles = (v: unknown) => {
  const raw = Array.isArray(v) ? v[0] : v;
  const n = Number(raw);
  return `S/ ${Number.isFinite(n) ? n.toLocaleString('es-PE', { maximumFractionDigits: 0 }) : String(raw ?? '')}`;
};

export function CotizadoVsVendidoChart({
  data,
  accent = 'var(--color-accent-primary)',
}: {
  data: PuntoMensual[];
  accent?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-muted)" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatSoles}
          tickMargin={8}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={formatSoles}
          labelFormatter={(label) => `Mes: ${label}`}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
        <Bar
          dataKey="cotizado"
          name="Cotizado"
          fill={accent}
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          dataKey="vendido"
          name="Vendido"
          fill="var(--color-status-aprobado)"
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CotizadoVsVendidoArea({
  data,
  accent = 'var(--color-accent-primary)',
}: {
  data: PuntoMensual[];
  accent?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradCotizado" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={accent} stopOpacity={0.35} />
            <stop offset="95%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradVendido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-status-aprobado)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-status-aprobado)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-muted)" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatSoles}
          tickMargin={8}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={formatSoles}
          labelFormatter={(label) => `Mes: ${label}`}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
        <Area
          type="monotone"
          dataKey="cotizado"
          name="Cotizado"
          stroke={accent}
          strokeWidth={2.5}
          fill="url(#gradCotizado)"
        />
        <Area
          type="monotone"
          dataKey="vendido"
          name="Vendido"
          stroke="var(--color-status-aprobado)"
          strokeWidth={2.5}
          fill="url(#gradVendido)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PieCustomLabel(props: Record<string, unknown>) {
  const { estado, cantidad, percent } = props as { estado: string; cantidad: number; percent?: number };
  const pct = percent ?? 0;
  return (
    <span className="text-xs font-medium text-zinc-700">
      {ESTADO_LABELS[estado] ?? estado}: {cantidad} ({(pct * 100).toFixed(1)}%)
    </span>
  );
}

export function EstadoDonutChart({
  data,
}: {
  data: ConteoPorEstado[];
}) {
  const COLORS = [
    ESTADO_COLORS.aprobada,
    ESTADO_COLORS.enviada,
    ESTADO_COLORS.borrador,
    ESTADO_COLORS.rechazada,
    ESTADO_COLORS.parcialmente_pagada,
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={95}
          paddingAngle={3}
          dataKey="cantidad"
          nameKey="estado"
          label={<PieCustomLabel />}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          // @ts-expect-error Recharts formatter type is overly strict
          formatter={(value: number) => [value, 'cotizaciones']}
          // @ts-expect-error Recharts labelFormatter type is overly strict
          labelFormatter={(estado: string) => ESTADO_LABELS[estado] ?? estado}
        />
        <Legend
          wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
          formatter={(estado: string) => (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: ESTADO_COLORS[estado] ?? 'var(--color-brand-options)',
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: ESTADO_COLORS[estado] ?? 'var(--color-brand-options)',
                    display: 'inline-block',
                  }}
                />
                {ESTADO_LABELS[estado] ?? estado}
              </span>
            </>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function EstadoBarChart({
  data,
}: {
  data: ConteoPorEstado[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-muted)" vertical={false} />
        <XAxis
          dataKey="estado"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          tickFormatter={(estado: string) => ESTADO_LABELS[estado] ?? estado}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: 'var(--color-surface-muted)' }}
          // @ts-expect-error Recharts formatter
          formatter={(value: number) => [value, 'Cotizaciones']}
          // @ts-expect-error Recharts labelFormatter
          labelFormatter={(estado: string) => ESTADO_LABELS[estado] ?? estado}
        />
        <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={ESTADO_COLORS[entry.estado] ?? 'var(--color-brand-options)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AlertasPorAlmacenChart({
  data,
  accent = 'var(--color-accent-primary)',
}: {
  data: Array<{ almacen: string; cantidad: number }>;
  accent?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-muted)" horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v}
          tickMargin={8}
        />
        <YAxis
          type="category"
          dataKey="almacen"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={140}
          tickMargin={8}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          // @ts-expect-error Recharts formatter type is overly strict
          formatter={(value: number) => [value, 'alertas']}
          // @ts-expect-error Recharts labelFormatter type is overly strict
          labelFormatter={(almacen: string) => almacen}
        />
        <Bar
          dataKey="cantidad"
          name="Alertas"
          fill={accent}
          radius={[0, 6, 6, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VentasPorTipoChart({
  data,
}: {
  data: PuntoMensual[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradMayorista" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-role-distribuidor)" stopOpacity={0.9} />
            <stop offset="95%" stopColor="var(--color-role-distribuidor)" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="gradMinorista" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-role-tienda)" stopOpacity={0.9} />
            <stop offset="95%" stopColor="var(--color-role-tienda)" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-muted)" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatSoles}
          tickMargin={8}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={formatSoles}
          labelFormatter={(label) => `Mes: ${label}`}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
        <Bar
          dataKey="cotizado"
          name="Mayorista / Distribuidor"
          fill="url(#gradMayorista)"
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          dataKey="vendido"
          name="Minorista / Tienda"
          fill="url(#gradMinorista)"
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompactTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <Table scrollLabel="Resumen del dashboard">
        <TableHeader>
          <TableRow className="bg-zinc-50/80 border-b border-zinc-100 uppercase tracking-wider">
            {headers.map((h, i) => (
              <TableHead
                key={i}
                className="py-3 px-4 text-[11px] font-semibold text-zinc-500 text-left"
                style={{ minWidth: i === 1 ? '200px' : '100px' }}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-zinc-100">
          {rows.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className="transition-colors hover:bg-zinc-50/50"
            >
              {row.map((cell, cellIndex) => (
                <TableCell
                  key={cellIndex}
                  className="py-2.5 px-4 align-middle"
                  style={{ minWidth: cellIndex === 1 ? '200px' : '100px' }}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );
}