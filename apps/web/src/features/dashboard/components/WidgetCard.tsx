'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Minus, Plus, MoreHorizontal } from 'lucide-react';
import type {
  WidgetConfig,
  ChartType,
  DashboardGraficos,
  AlertaStockBajo,
  ColSpan,
  RowSpan,
} from '../types/dashboard';
import {
  CotizadoVsVendidoChart,
  CotizadoVsVendidoArea,
  VentasCanalDonut,
  VentasCanalBar,
  TopProductosBar,
  TopProductosTable,
  CotizacionesEstadoDonut,
  CotizacionesEstadoBar,
  CotizacionesEstadoTable,
  StockBajoTable,
  StockBajoBar,
  MOCK_PUNTOS_MENSUALES,
  MOCK_VENTAS_CANAL,
  MOCK_TOP_PRODUCTOS,
  MOCK_ESTADOS,
  MOCK_STOCK_BAJO,
} from './charts/DashboardCharts';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatSoles } from './charts/DashboardCharts';
import { useCardResize, COL_SPAN_CLASSES, ROW_SPAN_CLASSES } from '../hooks/useCardResize';

const WIDGET_ALLOWED_TYPES: Record<string, Array<{ type: ChartType; label: string }>> = {
  cotizadoVsVendido: [
    { type: 'bar', label: 'Barras' },
    { type: 'line', label: 'Línea' },
    { type: 'donut', label: 'Dona' },
    { type: 'table', label: 'Tabla' },
  ],
  ventasCanal: [
    { type: 'donut', label: 'Dona' },
    { type: 'bar', label: 'Barras' },
    { type: 'line', label: 'Línea' },
    { type: 'table', label: 'Tabla' },
  ],
  topProductos: [
    { type: 'bar', label: 'Barras' },
    { type: 'donut', label: 'Dona' },
    { type: 'table', label: 'Tabla' },
  ],
  cotizacionesPorEstado: [
    { type: 'donut', label: 'Dona' },
    { type: 'bar', label: 'Barras' },
    { type: 'table', label: 'Tabla' },
  ],
  stockBajo: [
    { type: 'table', label: 'Tabla' },
    { type: 'bar', label: 'Barras' },
  ],
};

interface WidgetCardProps {
  widget: WidgetConfig;
  graficos?: DashboardGraficos;
  stockBajo?: AlertaStockBajo[];
  onChartTypeChange: (id: string, type: ChartType) => void;
  onResizeWidget?: (id: string, colSpan: ColSpan, rowSpan: RowSpan) => void;
}

export function SortableWidgetCard({
  widget,
  graficos,
  stockBajo,
  onChartTypeChange,
  onResizeWidget,
}: WidgetCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const {
    isResizing,
    activeColSpan,
    activeRowSpan,
    handlePointerDown,
    stepSize,
    stepWidth,
    stepHeight,
  } = useCardResize({
    colSpan: widget.colSpan ?? 6,
    rowSpan: widget.rowSpan ?? 2,
    onResize: (c, r) => onResizeWidget?.(widget.id, c, r),
  });

  const isCompactWidth = activeColSpan <= 4;
  const isCompactHeight = activeRowSpan === 1;

  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const toggleMoreOptions = () => setMoreOptionsOpen((prev) => !prev);
  const moreOptionsRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : isResizing ? 25 : moreOptionsOpen ? 20 : 1,
    opacity: isDragging ? 0.7 : 1,
  };

  const [selectedDetail, setSelectedDetail] = useState<{
    label: string;
    value: string;
    extra?: string;
  } | null>(null);

  useEffect(() => {
    if (!moreOptionsOpen) return;
    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        moreOptionsRef.current &&
        !moreOptionsRef.current.contains(e.target as Node)
      ) {
        setMoreOptionsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [moreOptionsOpen]);

  const allowedTypes = WIDGET_ALLOWED_TYPES[widget.id] ?? [
    { type: 'bar', label: 'Barras' },
    { type: 'table', label: 'Tabla' },
  ];

  const handleSelect = (item: { label: string; value: string; extra?: string }) => {
    setSelectedDetail(item);
  };

  const renderWidgetPopoverDetail = () => {
    switch (widget.id) {
      case 'cotizadoVsVendido':
        return (
          <div className="space-y-1 text-xs text-neutral-600">
            <p className="font-semibold text-neutral-900">Cotizado: S/ 258,000</p>
            <p className="font-semibold text-neutral-900">Vendido: S/ 194,500</p>
            <p className="text-emerald-700 font-medium">Meta trimestral: 75.4% completado</p>
          </div>
        );
      case 'ventasCanal':
        return (
          <div className="space-y-1 text-xs text-neutral-600">
            <p className="font-semibold text-neutral-900">Distribuidor: S/ 48,500 (67%)</p>
            <p className="font-semibold text-neutral-900">Tienda: S/ 23,887 (33%)</p>
            <p className="text-[11px] text-neutral-500">Total facturado: S/ 72,387</p>
          </div>
        );
      case 'topProductos':
        return (
          <div className="space-y-1 text-xs text-neutral-600">
            <p className="font-semibold text-neutral-900">Top 5 productos del mes</p>
            <p className="text-[11px] text-neutral-500">Concentran el 78% de la rotación en inventario.</p>
          </div>
        );
      case 'cotizacionesPorEstado':
        return (
          <div className="space-y-1 text-xs text-neutral-600">
            <p className="font-semibold text-neutral-900">Aprobadas: 24 · Pendientes: 12 · Rechazadas: 8</p>
            <p className="text-emerald-700 font-medium">Tasa de conversión: 68% de cierre</p>
          </div>
        );
      case 'stockBajo':
        return (
          <div className="space-y-1.5 text-xs text-neutral-600">
            <p className="font-bold text-red-700">30 productos con stock mínimo o crítico</p>
            <Link
              href="/inventario"
              className="text-xs font-semibold text-orange-700 hover:underline inline-flex items-center gap-1"
            >
              Ver inventario completo →
            </Link>
          </div>
        );
      default:
        return null;
    }
  };

  const renderContent = (isCompact: boolean, isCompactHeight: boolean) => {
    switch (widget.id) {
      case 'cotizadoVsVendido': {
        const data = graficos?.cotizadoVsVendido?.length
          ? graficos.cotizadoVsVendido
          : MOCK_PUNTOS_MENSUALES;
        if (widget.chartType === 'line') {
          return isCompact || isCompactHeight ? (
            <CotizadoVsVendidoArea
              data={data}
              rowSpan={activeRowSpan}
              onItemClick={handleSelect}
              compact={isCompact || isCompactHeight}
            />
          ) : (
            <CotizadoVsVendidoArea data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} />
          );
        }
        if (widget.chartType === 'donut') {
          const totalCotizado = data.reduce((s, p) => s + p.cotizado, 0);
          const totalVendido = data.reduce((s, p) => s + p.vendido, 0);
          return (
            <VentasCanalDonut
              data={[
                {
                  canal: 'Cotizado',
                  monto: totalCotizado,
                  porcentaje: Math.round((totalCotizado / (totalCotizado + totalVendido || 1)) * 100),
                },
                {
                  canal: 'Vendido',
                  monto: totalVendido,
                  porcentaje: Math.round((totalVendido / (totalCotizado + totalVendido || 1)) * 100),
                },
              ]}
              rowSpan={activeRowSpan}
              onItemClick={handleSelect}
              compact={isCompact || isCompactHeight}
            />
          );
        }
        if (widget.chartType === 'table') {
          const limit = activeRowSpan === 1 ? 2 : activeRowSpan === 2 ? 5 : 9;
          const displayData = data.slice(0, limit);
          return isCompact || isCompactHeight ? (
            <div className="w-full">
              <Table
                scrollLabel="Cotizado vs. Vendido"
                className="w-full"
              >
                <TableHeader>
                  <TableRow className="bg-neutral-50 border-b border-stone-200">
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-left">
                      Mes
                    </TableHead>
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
                      Vendido
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100">
                  {displayData.map((p) => (
                    <TableRow key={p.mes} className="hover:bg-stone-50/80 transition-colors">
                      <TableCell className="py-2.5 px-3 text-xs font-medium text-neutral-900 whitespace-nowrap">
                        {p.mes}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-xs font-semibold text-neutral-900 text-right tabular-nums whitespace-nowrap">
                        {formatSoles(p.vendido)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="w-full">
              <Table scrollLabel="Cotizado vs. Vendido" className="w-full">
                <TableHeader>
                  <TableRow className="bg-neutral-50 border-b border-stone-200">
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-left">
                      Mes
                    </TableHead>
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
                      Cotizado
                    </TableHead>
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
                      Vendido
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100">
                  {displayData.map((p) => (
                    <TableRow key={p.mes} className="hover:bg-stone-50/80 transition-colors">
                      <TableCell className="py-2.5 px-3 text-xs font-medium text-neutral-900 whitespace-nowrap">
                        {p.mes}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-xs text-neutral-700 text-right tabular-nums whitespace-nowrap">
                        {formatSoles(p.cotizado)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-xs font-semibold text-neutral-900 text-right tabular-nums whitespace-nowrap">
                        {formatSoles(p.vendido)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        }
        return <CotizadoVsVendidoChart data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} compact={isCompact || isCompactHeight} />;
      }

      case 'ventasCanal': {
        const data = graficos?.ventasPorCanal?.length
          ? graficos.ventasPorCanal
          : MOCK_VENTAS_CANAL;
        if (widget.chartType === 'bar') {
          return isCompact || isCompactHeight ? (
            <VentasCanalBar data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} compact={isCompact || isCompactHeight} />
          ) : (
            <VentasCanalBar data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} />
          );
        }
        if (widget.chartType === 'line') {
          return isCompact || isCompactHeight ? (
            <CotizadoVsVendidoArea rowSpan={activeRowSpan} onItemClick={handleSelect} compact={isCompact || isCompactHeight} />
          ) : (
            <CotizadoVsVendidoArea rowSpan={activeRowSpan} onItemClick={handleSelect} />
          );
        }
        if (widget.chartType === 'table') {
          const limit = activeRowSpan === 1 ? 2 : activeRowSpan === 2 ? 5 : 9;
          const displayData = data.slice(0, limit);
          return isCompact || isCompactHeight ? (
            <div className="w-full">
              <Table
                scrollLabel="Ventas por Canal"
                className="w-full"
              >
                <TableHeader>
                  <TableRow className="bg-neutral-50 border-b border-stone-200">
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-left">
                      Canal
                    </TableHead>
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
                      Monto S/
                    </TableHead>
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
                      Participación
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100">
                  {displayData.map((c) => (
                    <TableRow key={c.canal} className="hover:bg-stone-50/80 transition-colors">
                      <TableCell className="py-2.5 px-3 text-xs font-medium text-neutral-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              c.canal === 'Distribuidor' ? 'bg-orange-700' : 'bg-[#F8B602]'
                            }`}
                          />
                          <span>{c.canal}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-xs text-neutral-900 font-semibold text-right tabular-nums whitespace-nowrap">
                        {formatSoles(c.monto)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-xs text-neutral-600 text-right tabular-nums whitespace-nowrap">
                        {c.porcentaje}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="w-full">
              <Table scrollLabel="Ventas por Canal" className="w-full">
                <TableHeader>
                  <TableRow className="bg-neutral-50 border-b border-stone-200">
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-left">
                      Canal
                    </TableHead>
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
                      Monto S/
                    </TableHead>
                    <TableHead className="py-2 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500 text-right">
                      Participación
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100">
                  {displayData.map((c) => (
                    <TableRow key={c.canal} className="hover:bg-stone-50/80 transition-colors">
                      <TableCell className="py-2.5 px-3 text-xs font-medium text-neutral-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              c.canal === 'Distribuidor' ? 'bg-orange-700' : 'bg-[#F8B602]'
                            }`}
                          />
                          <span>{c.canal}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-xs text-neutral-900 font-semibold text-right tabular-nums whitespace-nowrap">
                        {formatSoles(c.monto)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-xs text-neutral-600 text-right tabular-nums whitespace-nowrap">
                        {c.porcentaje}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        }
        return <VentasCanalDonut data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} compact={isCompact || isCompactHeight} />;
      }

      case 'topProductos': {
        const data = graficos?.topProductos?.length
          ? graficos.topProductos
          : MOCK_TOP_PRODUCTOS;
        if (widget.chartType === 'table') {
          return isCompact || isCompactHeight ? (
            <TopProductosTable
              data={data}
              rowSpan={activeRowSpan}
              compact={isCompact || isCompactHeight}
            />
          ) : (
            <TopProductosTable data={data} rowSpan={activeRowSpan} />
          );
        }
        if (widget.chartType === 'donut') {
          return (
            <VentasCanalDonut
              data={data.map((p) => ({
                canal: p.codigo,
                monto: p.total,
                porcentaje: Math.round((p.total / 58724) * 100),
              }))}
              rowSpan={activeRowSpan}
              onItemClick={handleSelect}
              compact={isCompact || isCompactHeight}
            />
          );
        }
        return <TopProductosBar data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} compact={isCompact || isCompactHeight} />;
      }

      case 'cotizacionesPorEstado': {
        const data = graficos?.cotizacionesPorEstado?.length
          ? graficos.cotizacionesPorEstado
          : MOCK_ESTADOS;
        if (widget.chartType === 'bar') {
          return isCompact || isCompactHeight ? (
            <CotizacionesEstadoBar data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} compact={isCompact || isCompactHeight} />
          ) : (
            <CotizacionesEstadoBar data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} />
          );
        }
        if (widget.chartType === 'table') {
          return isCompact || isCompactHeight ? (
            <CotizacionesEstadoTable
              data={data}
              rowSpan={activeRowSpan}
              compact={isCompact || isCompactHeight}
            />
          ) : (
            <CotizacionesEstadoTable data={data} rowSpan={activeRowSpan} />
          );
        }
        return <CotizacionesEstadoDonut data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} compact={isCompact || isCompactHeight} />;
      }

      case 'stockBajo': {
        const data = stockBajo?.length ? stockBajo : MOCK_STOCK_BAJO;
        if (widget.chartType === 'bar') {
          return isCompact || isCompactHeight ? (
            <StockBajoBar data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} compact={isCompact || isCompactHeight} />
          ) : (
            <StockBajoBar data={data} rowSpan={activeRowSpan} onItemClick={handleSelect} />
          );
        }
        return (
          <StockBajoTable
            data={data}
            totalCount={stockBajo?.length ?? 30}
            rowSpan={activeRowSpan}
            compact={isCompact || isCompactHeight}
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-bento-card="true"
      className={`${COL_SPAN_CLASSES[activeColSpan]} ${ROW_SPAN_CLASSES[activeRowSpan]} bg-white border border-stone-200 rounded-2xl shadow-sm hover:shadow transition-shadow flex flex-col overflow-hidden relative select-none`}
    >
      {/* Indicador flotante durante el redimensionado */}
      {isResizing && (
        <div className="absolute top-2 right-12 z-40 bg-neutral-900 text-white text-[11px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none">
          {activeColSpan}×{activeRowSpan}
        </div>
      )}

      {/* Cabecera del widget */}
      <header className="px-4 py-2.5 border-b border-stone-200 flex items-center justify-between gap-2 bg-zinc-50/50 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            className="text-stone-400 hover:text-neutral-700 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded focus:outline-none"
            aria-label={`Arrastrar widget ${widget.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4 text-stone-400" strokeWidth={1.5} />
          </button>
          <h3 className={isCompactWidth ? 'text-xs sm:text-sm font-semibold text-neutral-900 truncate' : 'text-xs sm:text-sm font-semibold text-neutral-900 truncate'} title={widget.title}>
            {isCompactWidth ? (
              <span className="truncate">{widget.title}</span>
            ) : (
              widget.title
            )}
          </h3>
        </div>

        <div className={isCompactWidth ? 'hidden' : 'flex items-center gap-1.5 shrink-0'}>
          {/* Selector segmentado */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-stone-200 gap-0.5 shrink-0"
            role="group"
            aria-label={`Tipo de gráfico para ${widget.title}`}
          >
            {allowedTypes.map(({ type, label }) => {
              const isActive = widget.chartType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChartTypeChange(widget.id, type)}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none ${
                    isActive
                      ? 'bg-orange-700 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Botones rápidos de tamaño - y + */}
          <div className={isCompactWidth ? 'hidden' : 'opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-stone-100 border border-stone-200 rounded px-0.5 py-0.5'}>
            <button
              type="button"
              onClick={() => stepSize('smaller')}
              className="p-0.5 text-stone-500 hover:text-neutral-900 rounded hover:bg-white focus:outline-none"
              title="Reducir tamaño"
            >
              <Minus className="size-3" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => stepSize('larger')}
              className="p-0.5 text-stone-500 hover:text-neutral-900 rounded hover:bg-white focus:outline-none"
              title="Ampliar tamaño"
            >
              <Plus className="size-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Botón More opciones modo compacto */}
        {isCompactWidth && (
          <button
            ref={moreOptionsRef}
            type="button"
            className="inline-flex items-center justify-center size-7 rounded-md border border-stone-200 bg-white text-neutral-700 hover:bg-neutral-100 focus:outline-none p-0 shrink-0"
            aria-label="Más opciones"
            onClick={toggleMoreOptions}
          >
            <MoreHorizontal className="size-4" strokeWidth={1.5} />
          </button>
        )}
      </header>

      {/* Popover de opciones More */}
      {moreOptionsOpen && (
        <div
          ref={popoverRef}
          className="absolute top-10 right-3 z-30 w-56 rounded-md bg-white border border-stone-200 p-3 shadow-md space-y-3"
        >
          {/* Cambiar visualización */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block mb-1.5">
              Visualización
            </span>
            <div className="grid grid-cols-2 gap-1">
              {allowedTypes.map(({ type, label }) => {
                const isActive = widget.chartType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      onChartTypeChange(widget.id, type);
                    }}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors text-left focus:outline-none ${
                      isActive
                        ? 'bg-orange-700 text-white font-semibold shadow-xs'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ajustar tamaño */}
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
              Ajustar tamaño
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-medium">Ancho (cols)</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => stepWidth('smaller')}
                  className="size-6 inline-flex items-center justify-center rounded border border-stone-200 bg-stone-50 hover:bg-white text-stone-600 focus:outline-none"
                  title="Reducir ancho"
                >
                  <Minus className="size-3" strokeWidth={1.5} />
                </button>
                <span className="w-5 text-center font-bold text-neutral-900 tnum">{activeColSpan}</span>
                <button
                  type="button"
                  onClick={() => stepWidth('larger')}
                  className="size-6 inline-flex items-center justify-center rounded border border-stone-200 bg-stone-50 hover:bg-white text-stone-600 focus:outline-none"
                  title="Ampliar ancho"
                >
                  <Plus className="size-3" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-medium">Alto (filas)</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => stepHeight('smaller')}
                  className="size-6 inline-flex items-center justify-center rounded border border-stone-200 bg-stone-50 hover:bg-white text-stone-600 focus:outline-none"
                  title="Reducir alto"
                >
                  <Minus className="size-3" strokeWidth={1.5} />
                </button>
                <span className="w-5 text-center font-bold text-neutral-900 tnum">{activeRowSpan}</span>
                <button
                  type="button"
                  onClick={() => stepHeight('larger')}
                  className="size-6 inline-flex items-center justify-center rounded border border-stone-200 bg-stone-50 hover:bg-white text-stone-600 focus:outline-none"
                  title="Ampliar alto"
                >
                  <Plus className="size-3" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Detalle completo */}
          <div className="pt-2 border-t border-stone-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block mb-1">
              Detalle
            </span>
            {renderWidgetPopoverDetail()}
          </div>
        </div>
      )}

      {/* Contenido del widget */}
      <div className={`
        p-3.5 flex-1 flex flex-col justify-center min-h-0 min-w-0 overflow-hidden ${isCompactWidth ? 'pb-8' : 'pb-3'}
      `}>
        {renderContent(isCompactWidth, isCompactHeight)}

        {/* Mini detalle interactivo al hacer clic */}
        {selectedDetail && (
          <div className="mt-2 p-2 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-between gap-2 text-xs shrink-0">
            <div className="min-w-0 truncate">
              <span className="font-semibold text-orange-950">{selectedDetail.label}: </span>
              <span className="text-orange-900 font-medium">{selectedDetail.value}</span>
              {selectedDetail.extra && (
                <span className="text-orange-700 ml-1">· {selectedDetail.extra}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="p-0.5 text-orange-700 hover:text-orange-950 rounded focus:outline-none shrink-0"
              aria-label="Cerrar detalle"
            >
              <X className="size-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {/* Tirador visual de redimensionado en la esquina inferior derecha */}
      <div
        onPointerDown={handlePointerDown}
        className="absolute bottom-1 right-1 z-30 cursor-nwse-resize text-stone-300 hover:text-orange-700 p-1 rounded transition-colors touch-none select-none"
        title="Arrastra para redimensionar"
        aria-label="Redimensionar tarjeta"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="opacity-60 hover:opacity-100"
        >
          <path d="M9 2L2 9M9 6L6 9" />
        </svg>
      </div>
    </div>
  );
}

export function WidgetCard(props: WidgetCardProps) {
  return <SortableWidgetCard {...props} />;
}
