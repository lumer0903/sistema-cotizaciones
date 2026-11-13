'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
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
import type {
  PuntoMensual,
  ConteoPorEstado,
  AlertaStockBajo,
  TopProductoItem,
  VentaCanalItem,
  RowSpan,
} from '../../types/dashboard';
import { formatCode } from '@/lib/formatters';

export function getChartHeight(rowSpan: RowSpan = 2): number {
  switch (rowSpan) {
    case 1:
      return 75;
    case 2:
      return 210;
    case 3:
      return 355;
    case 4:
      return 500;
    default:
      return 210;
  }
}

const AXIS_TICK = { fontSize: 12, fill: '#737373', fontFamily: 'var(--font-sans)' };
const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '0.5rem',
  fontSize: 12,
  fontFamily: 'var(--font-sans)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

export const COLOR_COTIZADO = '#F8B602';
export const COLOR_VENDIDO = '#C2410C';
export const COLOR_DISTRIBUIDOR = '#C2410C';
export const COLOR_TIENDA = '#F8B602';

export const ESTADO_DOTS: Record<string, string> = {
  aprobada: 'bg-emerald-500',
  enviada: 'bg-amber-500',
  borrador: 'bg-blue-500',
  rechazada: 'bg-rose-500',
  parcialmente_pagada: 'bg-purple-500',
  parcial: 'bg-purple-500',
};

export const ESTADO_COLORS: Record<string, string> = {
  aprobada: '#10B981',
  enviada: '#F59E0B',
  borrador: '#3B82F6',
  rechazada: '#EF4444',
  parcialmente_pagada: '#8B5CF6',
  parcial: '#8B5CF6',
};

export const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  parcialmente_pagada: 'Parcial',
  parcial: 'Parcial',
};

export function SemanticBadge({
  label,
  dotColor,
}: {
  label: string;
  dotColor: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-stone-200 px-2.5 py-0.5 text-xs font-medium text-neutral-900">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export const formatSoles = (v: unknown) => {
  const raw = Array.isArray(v) ? v[0] : v;
  const n = Number(raw);
  return `S/ ${Number.isFinite(n) ? n.toLocaleString('es-PE', { maximumFractionDigits: 0 }) : String(raw ?? '')}`;
};

export const MOCK_PUNTOS_MENSUALES: PuntoMensual[] = [
  { mes: 'Ene', cotizado: 54000, vendido: 42000 },
  { mes: 'Feb', cotizado: 62000, vendido: 48500 },
  { mes: 'Mar', cotizado: 59000, vendido: 45000 },
  { mes: 'Abr', cotizado: 71000, vendido: 58000 },
  { mes: 'May', cotizado: 82000, vendido: 67000 },
  { mes: 'Jun', cotizado: 91000, vendido: 72387 },
];

export const MOCK_VENTAS_CANAL: VentaCanalItem[] = [
  { canal: 'Distribuidor', monto: 48500, porcentaje: 67 },
  { canal: 'Tienda', monto: 23887, porcentaje: 33 },
];

export const MOCK_TOP_PRODUCTOS: TopProductoItem[] = [
  { codigo: 'FUG-10', nombre: 'Plato Porcelana 33cm', unidades: 340, total: 16524 },
  { codigo: 'VAS-02', nombre: 'Vaso Vidrio Templado 300ml', unidades: 280, total: 8960 },
  { codigo: 'COP-05', nombre: 'Copa Vino Cristal 450ml', unidades: 210, total: 11550 },
  { codigo: 'PLA-12', nombre: 'Plato Hondo Cerámica 24cm', unidades: 195, total: 7410 },
  { codigo: 'CUB-01', nombre: 'Set Cubiertos Acero Inox (24 pzas)', unidades: 140, total: 14280 },
];

export const MOCK_ESTADOS: ConteoPorEstado[] = [
  { estado: 'aprobada', cantidad: 30 },
  { estado: 'enviada', cantidad: 8 },
  { estado: 'borrador', cantidad: 3 },
  { estado: 'parcialmente_pagada', cantidad: 2 },
  { estado: 'rechazada', cantidad: 1 },
];

export const MOCK_STOCK_BAJO: AlertaStockBajo[] = [
  {
    id_alerta: 1,
    id_producto: 101,
    codigo: 'PLT-01',
    descripcion: 'Plato Tendido Porcelana 27cm',
    id_almacen: 1,
    almacen_nombre: 'Central Lima',
    stock_actual: 5,
    stock_minimo: 20,
    estado: 'critico',
    created_at: new Date().toISOString(),
  },
  {
    id_alerta: 2,
    id_producto: 102,
    codigo: 'COP-08',
    descripcion: 'Copa Martini Cristal 250ml',
    id_almacen: 1,
    almacen_nombre: 'Central Lima',
    stock_actual: 0,
    stock_minimo: 15,
    estado: 'agotado',
    created_at: new Date().toISOString(),
  },
  {
    id_alerta: 3,
    id_producto: 103,
    codigo: 'VAS-14',
    descripcion: 'Vaso Old Fashioned 320ml',
    id_almacen: 2,
    almacen_nombre: 'Almacén Callao',
    stock_actual: 12,
    stock_minimo: 30,
    estado: 'bajo',
    created_at: new Date().toISOString(),
  },
  {
    id_alerta: 4,
    id_producto: 104,
    codigo: 'BOL-03',
    descripcion: 'Bowl Ensaladera Vidrio 22cm',
    id_almacen: 1,
    almacen_nombre: 'Central Lima',
    stock_actual: 8,
    stock_minimo: 25,
    estado: 'critico',
    created_at: new Date().toISOString(),
  },
  {
    id_alerta: 5,
    id_producto: 105,
    codigo: 'JAR-02',
    descripcion: 'Jarra Vidrio Bar 1.5L',
    id_almacen: 2,
    almacen_nombre: 'Almacén Callao',
    stock_actual: 10,
    stock_minimo: 20,
    estado: 'bajo',
    created_at: new Date().toISOString(),
  },
];

// 1. COTIZADO VS VENDIDO
export function CotizadoVsVendidoChart({
  data = MOCK_PUNTOS_MENSUALES,
  rowSpan = 2,
  onItemClick,
  compact = false,
}: {
  data?: PuntoMensual[];
  rowSpan?: RowSpan;
  onItemClick?: (item: { label: string; value: string; extra?: string }) => void;
  compact?: boolean;
}) {
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  const handleLegendClick = (entry: { dataKey?: string | number }) => {
    if (!entry.dataKey) return;
    const key = String(entry.dataKey);
    setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showLegend = !compact && rowSpan > 1;

  return (
    <ResponsiveContainer width="100%" height={getChartHeight(rowSpan)}>
      <BarChart
        data={data}
        margin={{ top: compact ? 4 : rowSpan === 1 ? 4 : 12, right: 8, bottom: 0, left: 0 }}
        onClick={(state: unknown) => {
          const s = state as { activePayload?: Array<{ payload?: PuntoMensual }> } | null;
          if (s?.activePayload?.[0]?.payload && onItemClick) {
            const p = s.activePayload[0].payload;
            onItemClick({
              label: `Mes ${p.mes}`,
              value: `Vendido: ${formatSoles(p.vendido)}`,
              extra: `Cotizado: ${formatSoles(p.cotizado)}`,
            });
          }
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={compact ? 'transparent' : '#F3F4F6'}
          vertical={false}
        />
        <XAxis
          dataKey="mes"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={4}
        />
        <YAxis
          hide={compact || rowSpan === 1}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatSoles}
          tickMargin={4}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={formatSoles}
          labelFormatter={(l: unknown) => `Mes: ${String(l ?? '')}`}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: compact ? 10 : 12, paddingTop: compact ? 2 : 6, cursor: 'pointer' }}
            onClick={(e) => handleLegendClick(e as unknown as { dataKey?: string | number })}
          />
        )}
        <Bar
          dataKey="cotizado"
          name="Cotizado"
          fill={COLOR_COTIZADO}
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
          hide={hiddenSeries['cotizado']}
          cursor="pointer"
        />
        <Bar
          dataKey="vendido"
          name="Vendido"
          fill={COLOR_VENDIDO}
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
          hide={hiddenSeries['vendido']}
          cursor="pointer"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CotizadoVsVendidoArea({
  data = MOCK_PUNTOS_MENSUALES,
  rowSpan = 2,
  onItemClick,
  compact = false,
}: {
  data?: PuntoMensual[];
  rowSpan?: RowSpan;
  onItemClick?: (item: { label: string; value: string; extra?: string }) => void;
  compact?: boolean;
}) {
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  const handleLegendClick = (entry: { dataKey?: string | number }) => {
    if (!entry.dataKey) return;
    const key = String(entry.dataKey);
    setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ResponsiveContainer width="100%" height={getChartHeight(rowSpan)}>
      <AreaChart
        data={data}
        margin={{ top: rowSpan === 1 ? 4 : 12, right: 12, bottom: 0, left: 0 }}
        onClick={(state: unknown) => {
          const s = state as { activePayload?: Array<{ payload?: PuntoMensual }> } | null;
          if (s?.activePayload?.[0]?.payload && onItemClick) {
            const p = s.activePayload[0].payload;
            onItemClick({
              label: `Mes ${p.mes}`,
              value: `Vendido: ${formatSoles(p.vendido)}`,
              extra: `Cotizado: ${formatSoles(p.cotizado)}`,
            });
          }
        }}
      >
        <defs>
          <linearGradient id="gradCotizado" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLOR_COTIZADO} stopOpacity={compact ? 0.2 : 0.4} />
            <stop offset="95%" stopColor={COLOR_COTIZADO} stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="gradVendido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLOR_VENDIDO} stopOpacity={0.4} />
            <stop offset="95%" stopColor={COLOR_VENDIDO} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={compact ? "transparent" : "#F3F4F6"} vertical={false} />
        <XAxis dataKey="mes" tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={compact ? 4 : 8} />
        <YAxis hide={compact || rowSpan === 1} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={formatSoles} tickMargin={compact ? 4 : 8} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatSoles} labelFormatter={(l: unknown) => `Mes: ${String(l ?? '')}`} />
        {rowSpan > 1 && !compact && (
          <Legend
            wrapperStyle={{ fontSize: compact ? 10 : 12, paddingTop: compact ? 2 : 6, cursor: 'pointer' }}
            onClick={(e) => handleLegendClick(e as unknown as { dataKey?: string | number })}
          />
        )}
        <Area
          type="monotone"
          dataKey="cotizado"
          name="Cotizado"
          stroke={COLOR_COTIZADO}
          strokeWidth={compact ? 2 : 2.5}
          fill="url(#gradCotizado)"
          hide={hiddenSeries['cotizado']}
          cursor="pointer"
        />
        <Area
          type="monotone"
          dataKey="vendido"
          name="Vendido"
          stroke={COLOR_VENDIDO}
          strokeWidth={compact ? 2 : 2.5}
          fill="url(#gradVendido)"
          hide={hiddenSeries['vendido']}
          cursor="pointer"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// 2. VENTAS POR CANAL: DISTRIBUIDOR VS TIENDA
export function VentasCanalDonut({
  data = MOCK_VENTAS_CANAL,
  rowSpan = 2,
  onItemClick,
  compact = false,
}: {
  data?: VentaCanalItem[];
  rowSpan?: RowSpan;
  onItemClick?: (item: { label: string; value: string; extra?: string }) => void;
  compact?: boolean;
}) {
  const isCompact = compact || rowSpan === 1;
  const colors: Record<string, string> = {
    Distribuidor: COLOR_DISTRIBUIDOR,
    Tienda: COLOR_TIENDA,
  };

  const innerRadius = isCompact ? 25 : rowSpan === 2 ? 65 : 85;
  const outerRadius = isCompact ? 38 : rowSpan === 2 ? 95 : 120;

  return (
    <ResponsiveContainer width="100%" height={getChartHeight(rowSpan)}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          dataKey="monto"
          nameKey="canal"
          cursor="pointer"
          onClick={(entry: unknown) => {
            const e = (entry as { payload?: VentaCanalItem })?.payload ?? (entry as VentaCanalItem);
            if (e && onItemClick) {
              onItemClick({
                label: `Canal ${e.canal}`,
                value: formatSoles(e.monto),
                extra: `${e.porcentaje}% del total`,
              });
            }
          }}
        >
          {data.map((entry) => (
            <Cell key={entry.canal} fill={colors[entry.canal] ?? '#737373'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: unknown) => [formatSoles(v), 'Venta']}
        />
        {rowSpan > 1 && !isCompact && (
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
            formatter={(value: string) => {
              const item = data.find((d) => d.canal === value);
              return `${value}: ${formatSoles(item?.monto ?? 0)} (${item?.porcentaje ?? 0}%)`;
            }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

export function VentasCanalBar({
  data = MOCK_VENTAS_CANAL,
  rowSpan = 2,
  onItemClick,
  compact = false,
}: {
  data?: VentaCanalItem[];
  rowSpan?: RowSpan;
  onItemClick?: (item: { label: string; value: string; extra?: string }) => void;
  compact?: boolean;
}) {
  const isCompact = compact || rowSpan === 1;
  return (
    <ResponsiveContainer width="100%" height={getChartHeight(rowSpan)}>
      <BarChart
        data={data}
        margin={{ top: isCompact ? 4 : 12, right: 12, bottom: 0, left: 0 }}
        onClick={(state: unknown) => {
          const s = state as { activePayload?: Array<{ payload?: VentaCanalItem }> } | null;
          if (s?.activePayload?.[0]?.payload && onItemClick) {
            const item = s.activePayload[0].payload;
            onItemClick({
              label: `Canal ${item.canal}`,
              value: formatSoles(item.monto),
              extra: `${item.porcentaje}% de participación`,
            });
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={isCompact ? "transparent" : "#F3F4F6"} vertical={false} />
        <XAxis dataKey="canal" tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={isCompact ? 4 : 8} />
        <YAxis hide={isCompact} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={formatSoles} tickMargin={isCompact ? 4 : 8} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [formatSoles(v), 'Total']} />
        <Bar dataKey="monto" radius={[4, 4, 0, 0]} maxBarSize={48} cursor="pointer">
          {data.map((entry) => (
            <Cell
              key={entry.canal}
              fill={entry.canal === 'Distribuidor' ? COLOR_DISTRIBUIDOR : COLOR_TIENDA}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 3. TOP 5 PRODUCTOS MÁS VENDIDOS
export function TopProductosBar({
  data = MOCK_TOP_PRODUCTOS,
  rowSpan = 2,
  onItemClick,
  compact = false,
}: {
  data?: TopProductoItem[];
  rowSpan?: RowSpan;
  onItemClick?: (item: { label: string; value: string; extra?: string }) => void;
  compact?: boolean;
}) {
  const isCompact = compact || rowSpan === 1;
  const displayData = rowSpan === 1 ? data.slice(0, 2) : data;

  return (
    <ResponsiveContainer width="100%" height={getChartHeight(rowSpan)}>
      <BarChart
        data={displayData}
        layout="vertical"
        margin={{ top: 4, right: isCompact ? 8 : 16, bottom: 0, left: isCompact ? 4 : 12 }}
        onClick={(state: unknown) => {
          const s = state as { activePayload?: Array<{ payload?: TopProductoItem }> } | null;
          if (s?.activePayload?.[0]?.payload && onItemClick) {
            const item = s.activePayload[0].payload;
            onItemClick({
              label: `${item.codigo} · ${item.nombre}`,
              value: `${item.unidades} unidades`,
              extra: `Total: ${formatSoles(item.total)}`,
            });
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
        <XAxis hide={isCompact} type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={4} />
        <YAxis
          type="category"
          dataKey="codigo"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={isCompact ? 48 : 65}
          tickMargin={4}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: unknown) => [`${v} unidades`, 'Vendidos']}
          labelFormatter={(codigo: unknown) => {
            const prod = data.find((d) => d.codigo === String(codigo));
            return `${String(codigo)} - ${prod?.nombre ?? ''}`;
          }}
        />
        <Bar dataKey="unidades" name="Unidades" fill={COLOR_VENDIDO} radius={[0, 4, 4, 0]} maxBarSize={28} cursor="pointer" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopProductosTable({
  data = MOCK_TOP_PRODUCTOS,
  rowSpan = 2,
  compact = false,
}: {
  data?: TopProductoItem[];
  rowSpan?: RowSpan;
  compact?: boolean;
}) {
  const isCompact = compact || rowSpan === 1;
  const limit = rowSpan === 1 ? 2 : rowSpan === 2 ? 5 : 9;
  const displayData = data.slice(0, limit);

  return (
    <div className="w-full">
      <Table scrollLabel="Top 5 productos más vendidos" className="w-full">
        <TableHeader>
          <TableRow className="bg-neutral-50 border-b border-stone-200">
            <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-left">
              Producto
            </TableHead>
            {!isCompact && (
              <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
                Unidades
              </TableHead>
            )}
            <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
              Total S/
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-zinc-100">
          {displayData.map((item) => (
            <TableRow key={item.codigo} className="hover:bg-stone-50/80 transition-colors">
              <TableCell className="py-2.5 px-3 text-left">
                <p className="text-xs font-medium text-neutral-900 truncate max-w-[220px]" title={item.nombre}>
                  {item.nombre}
                </p>
                <p className="text-[11px] text-stone-500 whitespace-nowrap mt-0.5">
                  {formatCode(item.codigo)}
                </p>
              </TableCell>
              {!isCompact && (
                <TableCell className="py-2.5 px-3 text-xs font-semibold text-neutral-900 text-right tabular-nums whitespace-nowrap">
                  {item.unidades}
                </TableCell>
              )}
              <TableCell className="py-2.5 px-3 text-xs font-semibold text-neutral-900 text-right tabular-nums whitespace-nowrap">
                {formatSoles(item.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// 4. COTIZACIONES POR ESTADO
export function CotizacionesEstadoDonut({
  data = MOCK_ESTADOS,
  rowSpan = 2,
  onItemClick,
  compact = false,
}: {
  data?: ConteoPorEstado[];
  rowSpan?: RowSpan;
  onItemClick?: (item: { label: string; value: string; extra?: string }) => void;
  compact?: boolean;
}) {
  const isCompact = compact || rowSpan === 1;
  const total = data.reduce((acc, curr) => acc + curr.cantidad, 0);
  const innerRadius = isCompact ? 25 : rowSpan === 2 ? 65 : 85;
  const outerRadius = isCompact ? 38 : rowSpan === 2 ? 95 : 120;

  return (
    <ResponsiveContainer width="100%" height={getChartHeight(rowSpan)}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          dataKey="cantidad"
          nameKey="estado"
          cursor="pointer"
          onClick={(entry: unknown) => {
            const e = (entry as { payload?: ConteoPorEstado })?.payload ?? (entry as ConteoPorEstado);
            if (e && onItemClick) {
              const label = ESTADO_LABELS[e.estado] ?? e.estado;
              const pct = total > 0 ? ((e.cantidad / total) * 100).toFixed(1) : '0';
              onItemClick({
                label: `Estado ${label}`,
                value: `${e.cantidad} documentos`,
                extra: `${pct}% del total`,
              });
            }
          }}
        >
          {data.map((entry) => (
            <Cell
              key={entry.estado}
              fill={ESTADO_COLORS[entry.estado] ?? '#737373'}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: unknown) => [`${v} cotizaciones`, 'Cantidad']}
          labelFormatter={(e: unknown) => ESTADO_LABELS[String(e ?? '')] ?? String(e ?? '')}
        />
        {rowSpan > 1 && !isCompact && (
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
            formatter={(estado: string) => {
              const item = data.find((d) => d.estado === estado);
              const label = ESTADO_LABELS[estado] ?? estado;
              return `${label}: ${item?.cantidad ?? 0}`;
            }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CotizacionesEstadoBar({
  data = MOCK_ESTADOS,
  rowSpan = 2,
  onItemClick,
  compact = false,
}: {
  data?: ConteoPorEstado[];
  rowSpan?: RowSpan;
  onItemClick?: (item: { label: string; value: string; extra?: string }) => void;
  compact?: boolean;
}) {
  const isCompact = compact || rowSpan === 1;
  return (
    <ResponsiveContainer width="100%" height={getChartHeight(rowSpan)}>
      <BarChart
        data={data}
        margin={{ top: isCompact ? 4 : 12, right: 12, bottom: 0, left: 0 }}
        onClick={(state: unknown) => {
          const s = state as { activePayload?: Array<{ payload?: ConteoPorEstado }> } | null;
          if (s?.activePayload?.[0]?.payload && onItemClick) {
            const item = s.activePayload[0].payload;
            const label = ESTADO_LABELS[item.estado] ?? item.estado;
            onItemClick({
              label: `Estado ${label}`,
              value: `${item.cantidad} documentos`,
            });
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="estado"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={4}
          tickFormatter={(e: string) => ESTADO_LABELS[e] ?? e}
        />
        <YAxis hide={isCompact} tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={4} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: unknown) => [`${v} cotizaciones`, 'Cantidad']}
          labelFormatter={(e: unknown) => ESTADO_LABELS[String(e ?? '')] ?? String(e ?? '')}
        />
        <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} maxBarSize={40} cursor="pointer">
          {data.map((entry) => (
            <Cell
              key={entry.estado}
              fill={ESTADO_COLORS[entry.estado] ?? '#737373'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CotizacionesEstadoTable({
  data = MOCK_ESTADOS,
  rowSpan = 2,
  compact = false,
}: {
  data?: ConteoPorEstado[];
  rowSpan?: RowSpan;
  compact?: boolean;
}) {
  const isCompact = compact || rowSpan === 1;
  const total = data.reduce((acc, curr) => acc + curr.cantidad, 0);
  const limit = rowSpan === 1 ? 2 : rowSpan === 2 ? 5 : 9;
  const displayData = data.slice(0, limit);

  return (
    <div className="w-full">
      <Table scrollLabel="Cotizaciones por estado" className="w-full">
        <TableHeader>
          <TableRow className="bg-neutral-50 border-b border-stone-200">
            <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-left">
              Estado
            </TableHead>
            <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
              Cantidad
            </TableHead>
            {!isCompact && (
              <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
                Porcentaje
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-zinc-100">
          {displayData.map((item) => {
            const label = ESTADO_LABELS[item.estado] ?? item.estado;
            const dot = ESTADO_DOTS[item.estado] ?? 'bg-zinc-400';
            const pct = total > 0 ? ((item.cantidad / total) * 100).toFixed(1) : '0';
            return (
              <TableRow key={item.estado} className="hover:bg-stone-50/80 transition-colors">
                <TableCell className="py-2.5 px-3 text-left whitespace-nowrap">
                  <SemanticBadge label={label} dotColor={dot} />
                </TableCell>
                <TableCell className="py-2.5 px-3 text-xs font-semibold text-neutral-900 text-right tabular-nums whitespace-nowrap">
                  {item.cantidad}
                </TableCell>
                {!isCompact && (
                  <TableCell className="py-2.5 px-3 text-xs text-neutral-600 text-right tabular-nums whitespace-nowrap">
                    {pct}%
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// 5. PRODUCTOS CON STOCK BAJO
export function StockBajoTable({
  data = MOCK_STOCK_BAJO,
  totalCount,
  rowSpan = 2,
  compact = false,
}: {
  data?: AlertaStockBajo[];
  totalCount?: number;
  rowSpan?: RowSpan;
  compact?: boolean;
}) {
  const isCompact = compact || rowSpan === 1;
  const limit = rowSpan === 1 ? 2 : rowSpan === 2 ? 5 : 9;
  const displayItems = data.slice(0, limit);
  const total = totalCount ?? (data.length >= 6 ? 30 : data.length);

  return (
    <div className="w-full flex flex-col justify-between h-full">
      <Table scrollLabel="Productos con stock bajo" className="w-full">
        <TableHeader>
          <TableRow className="bg-neutral-50 border-b border-stone-200">
            <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-left">
              Producto
            </TableHead>
            <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
              Stock / Mín.
            </TableHead>
            {!isCompact && (
              <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
                Estado
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-zinc-100">
          {displayItems.map((item) => {
            const esAgotado = item.stock_actual === 0;
            const esCritico = item.stock_actual > 0 && item.stock_actual <= item.stock_minimo / 2;
            const estadoLabel = esAgotado ? 'Agotado' : esCritico ? 'Crítico' : 'Stock bajo';
            const dotColor = esAgotado || esCritico ? 'bg-rose-500' : 'bg-amber-500';
            const pct = Math.min(
              100,
              Math.max(0, Math.round((item.stock_actual / (item.stock_minimo || 1)) * 100))
            );

            return (
              <TableRow key={item.id_alerta} className="hover:bg-stone-50/80 transition-colors">
                <TableCell className="py-2.5 px-3 text-left">
                  <p
                    className="text-xs font-medium text-neutral-900 truncate max-w-[220px]"
                    title={item.descripcion}
                  >
                    {item.descripcion}
                  </p>
                  <p className="text-[11px] text-stone-500 whitespace-nowrap mt-0.5">
                    {formatCode(item.codigo)} · {item.almacen_nombre}
                  </p>
                </TableCell>
                <TableCell className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1 text-xs whitespace-nowrap">
                    <span className="font-semibold text-rose-600">{item.stock_actual}</span>
                    <span className="text-stone-400">/ {item.stock_minimo}</span>
                  </div>
                  <div className="w-14 h-1 rounded-full bg-stone-200 ml-auto mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        esCritico || esAgotado ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </TableCell>
                {!isCompact && (
                  <TableCell className="py-2.5 px-3 text-right whitespace-nowrap">
                    <SemanticBadge label={estadoLabel} dotColor={dotColor} />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pie de tarjeta */}
      {!isCompact && (
        <div className="pt-3 px-1 flex items-center justify-between text-xs text-neutral-500 mt-2 border-t border-stone-100">
          <span>Mostrando {displayItems.length} de {total} productos</span>
          <Link
            href="/inventario"
            className="text-xs font-medium text-orange-700 hover:underline inline-flex items-center gap-0.5"
          >
            Ver inventario →
          </Link>
        </div>
      )}
    </div>
  );
}

export function StockBajoBar({
  data = MOCK_STOCK_BAJO,
  rowSpan = 2,
  onItemClick,
  compact = false,
}: {
  data?: AlertaStockBajo[];
  rowSpan?: RowSpan;
  onItemClick?: (item: { label: string; value: string; extra?: string }) => void;
  compact?: boolean;
}) {
  const isCompact = compact || rowSpan === 1;
  const displayData = rowSpan === 1 ? data.slice(0, 3) : data;

  return (
    <ResponsiveContainer width="100%" height={getChartHeight(rowSpan)}>
      <BarChart
        data={displayData}
        margin={{ top: isCompact ? 4 : 12, right: 12, bottom: 0, left: 0 }}
        onClick={(state: unknown) => {
          const s = state as { activePayload?: Array<{ payload?: AlertaStockBajo }> } | null;
          if (s?.activePayload?.[0]?.payload && onItemClick) {
            const item = s.activePayload[0].payload;
            onItemClick({
              label: `${item.codigo} - ${item.descripcion}`,
              value: `Stock: ${item.stock_actual} unid. (Mín: ${item.stock_minimo})`,
              extra: `Almacén: ${item.almacen_nombre}`,
            });
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="codigo" tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={4} />
        <YAxis hide={isCompact} tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={4} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: unknown) => [`${v} unidades`, 'Stock Actual']}
          labelFormatter={(codigo: unknown) => {
            const item = data.find((d) => d.codigo === String(codigo));
            return `${String(codigo)} - ${item?.descripcion ?? ''}`;
          }}
        />
        <Bar dataKey="stock_actual" name="Stock Actual" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={36} cursor="pointer" />
      </BarChart>
    </ResponsiveContainer>
  );
}
