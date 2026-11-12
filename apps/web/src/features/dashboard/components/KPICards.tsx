'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  DollarSign,
  Store,
  Award,
  Wallet,
  FileText,
  Package,
  Minus,
  Plus,
} from 'lucide-react';
import type { DashboardKpis, AlertaStockBajo, KpiConfig, ColSpan, RowSpan } from '../types/dashboard';
import { SemanticBadge } from './charts/DashboardCharts';
import { useCardResize, COL_SPAN_CLASSES, ROW_SPAN_CLASSES } from '../hooks/useCardResize';

interface KPICardsProps {
  kpis?: DashboardKpis;
  cotizacionesPorEstadoTotal?: number;
  stockBajo?: AlertaStockBajo[];
  kpiConfigs: KpiConfig[];
  loading?: boolean;
  onResizeKpi?: (id: string, colSpan: ColSpan, rowSpan: RowSpan) => void;
}

export function SortableKpiItem({
  kpi,
  kpis,
  cotizacionesPorEstadoTotal,
  stockBajo,
  onResize,
}: {
  kpi: KpiConfig;
  kpis?: DashboardKpis;
  cotizacionesPorEstadoTotal?: number;
  stockBajo?: AlertaStockBajo[];
  onResize?: (colSpan: ColSpan, rowSpan: RowSpan) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: kpi.id });

  const {
    isResizing,
    activeColSpan,
    activeRowSpan,
    handlePointerDown,
    stepSize,
  } = useCardResize({
    colSpan: kpi.colSpan ?? 4,
    rowSpan: kpi.rowSpan ?? 1,
    onResize: (c, r) => onResize?.(c, r),
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : isResizing ? 25 : 1,
    opacity: isDragging ? 0.7 : 1,
  };

  const isCompact = activeColSpan <= 3 || activeRowSpan === 1;
  const hideIcon = activeColSpan <= 2;

  const renderKpiContent = () => {
    switch (kpi.id) {
      case 'totalVentas': {
        const val = kpis?.ventasTotales
          ? `S/ ${kpis.ventasTotales.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`
          : 'S/ 72,387';
        return (
          <div className="flex flex-col justify-between flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-neutral-500 truncate block">Total Ventas</span>
                <p className={`${isCompact ? 'text-xl' : 'text-2xl'} font-bold text-neutral-900 tnum mt-0.5 truncate`}>
                  {val}
                </p>
              </div>
              {!hideIcon && (
                <div className="p-2 rounded-xl bg-orange-50 text-orange-700 shrink-0" aria-hidden="true">
                  <DollarSign className="size-4.5 strokeWidth={1.5}" />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5 truncate">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                +12.4%
              </span>
              <span className="text-[11px] text-neutral-500 truncate">vs. mes anterior</span>
            </div>
          </div>
        );
      }

      case 'ventasCanal': {
        return (
          <div className="flex flex-col justify-between flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-neutral-500 truncate block">Ventas por Canal</span>
                <p className="text-xs font-bold text-neutral-900 tnum mt-0.5 truncate">
                  Dist: S/ 48,500 <span className="font-normal text-neutral-500">(67%)</span>
                </p>
                <p className="text-[11px] font-medium text-neutral-700 tnum truncate">
                  Tienda: S/ 23,887 <span className="font-normal text-neutral-500">(33%)</span>
                </p>
              </div>
              {!hideIcon && (
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 shrink-0" aria-hidden="true">
                  <Store className="size-4.5 strokeWidth={1.5}" />
                </div>
              )}
            </div>
            <div className="mt-1.5">
              <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden flex">
                <div className="bg-orange-700 h-full" style={{ width: '67%' }} />
                <div className="bg-[#F8B602] h-full" style={{ width: '33%' }} />
              </div>
            </div>
          </div>
        );
      }

      case 'topProducto': {
        return (
          <div className="flex flex-col justify-between flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-neutral-500 truncate block">Top Producto</span>
                <p className="text-xs font-bold text-neutral-900 mt-0.5 truncate" title="FUG-10 · Plato Porcelana 33cm">
                  FUG-10 · Plato Porcelana 33cm
                </p>
              </div>
              {!hideIcon && (
                <div className="p-2 rounded-xl bg-amber-50 text-[#F8B602] shrink-0" aria-hidden="true">
                  <Award className="size-4.5 strokeWidth={1.5}" />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-600 truncate">
              <span className="font-semibold text-neutral-900 tnum">340 unid.</span>
              <span>·</span>
              <span className="font-semibold text-neutral-900 tnum">S/ 16,524</span>
            </div>
          </div>
        );
      }

      case 'porCobrar': {
        return (
          <div className="flex flex-col justify-between flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-neutral-500 truncate block">Total por Cobrar</span>
                <p className={`${isCompact ? 'text-xl' : 'text-2xl'} font-bold text-neutral-900 tnum mt-0.5 truncate`}>
                  S/ 38,286
                </p>
              </div>
              {!hideIcon && (
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700 shrink-0" aria-hidden="true">
                  <Wallet className="size-4.5 strokeWidth={1.5}" />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-600 truncate">
              <span className="text-rose-700 font-semibold tnum truncate">S/ 11,400 vencido</span>
              <span>·</span>
              <span className="text-neutral-700 font-medium tnum truncate">S/ 26,886 vigente</span>
            </div>
          </div>
        );
      }

      case 'cotizacionesConversion': {
        const total = cotizacionesPorEstadoTotal ?? 44;
        const tasa = kpis?.tasaConversion ?? 68;
        return (
          <div className="flex flex-col justify-between flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-neutral-500 truncate block">Cotizaciones</span>
                <p className={`${isCompact ? 'text-xl' : 'text-2xl'} font-bold text-neutral-900 tnum mt-0.5 truncate`}>
                  {total} docs
                </p>
              </div>
              {!hideIcon && (
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700 shrink-0" aria-hidden="true">
                  <FileText className="size-4.5 strokeWidth={1.5}" />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5 truncate">
              <SemanticBadge label={`${tasa}% cierre`} dotColor="bg-emerald-500" />
            </div>
          </div>
        );
      }

      case 'stockBajo': {
        const count = stockBajo?.length ?? 30;
        return (
          <div className="flex flex-col justify-between flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-neutral-500 truncate block">Stock Bajo</span>
                <p className={`${isCompact ? 'text-xl' : 'text-2xl'} font-bold text-red-700 tnum mt-0.5 truncate`}>
                  {count} prods
                </p>
              </div>
              {!hideIcon && (
                <div className="p-2 rounded-xl bg-red-50 text-red-700 shrink-0" aria-hidden="true">
                  <Package className="size-4.5 strokeWidth={1.5}" />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5 truncate">
              <SemanticBadge label="Reposición" dotColor="bg-rose-500" />
            </div>
          </div>
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
      className={`${COL_SPAN_CLASSES[activeColSpan]} ${ROW_SPAN_CLASSES[activeRowSpan]} bg-white border border-stone-200 rounded-2xl ${isCompact ? 'p-3.5' : 'p-4'
        } shadow-sm hover:shadow transition-shadow flex flex-col justify-between relative group select-none overflow-hidden`}
    >
      {/* Indicador flotante durante el redimensionado */}
      {isResizing && (
        <div className="absolute top-2 right-12 z-40 bg-neutral-900 text-white text-[11px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none">
          {activeColSpan}×{activeRowSpan}
        </div>
      )}

      {/* Controles de cabecera: Asa y botones de tamaño rápido */}
      <div className="flex items-center justify-between mb-1 -mt-1 -mx-1">
        <button
          type="button"
          className="text-stone-400 hover:text-neutral-700 cursor-grab active:cursor-grabbing p-1 rounded focus:outline-none"
          aria-label={`Arrastrar KPI ${kpi.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5 strokeWidth={1.5} text-stone-400" />
        </button>

        {/* Botones rápidos de tamaño - y + */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-stone-100 border border-stone-200 rounded px-0.5 py-0.5">
          <button
            type="button"
            onClick={() => stepSize('smaller')}
            className="p-0.5 text-stone-500 hover:text-neutral-900 rounded hover:bg-white focus:outline-none"
            title="Reducir tamaño"
          >
            <Minus className="size-3 strokeWidth={1.5}" />
          </button>
          <button
            type="button"
            onClick={() => stepSize('larger')}
            className="p-0.5 text-stone-500 hover:text-neutral-900 rounded hover:bg-white focus:outline-none"
            title="Ampliar tamaño"
          >
            <Plus className="size-3 strokeWidth={1.5}" />
          </button>
        </div>
      </div>

      {/* Contenido adaptable */}
      {renderKpiContent()}

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

export function KPICards({
  kpis,
  cotizacionesPorEstadoTotal,
  stockBajo,
  kpiConfigs,
  loading,
  onResizeKpi,
}: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 auto-rows-[132px] grid-flow-dense gap-4 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="col-span-1 md:col-span-3 xl:col-span-4 row-span-1 bg-white border border-stone-200 rounded-2xl p-4 animate-pulse min-h-[132px]"
          >
            <div className="h-4 w-28 bg-zinc-200 rounded mb-2" />
            <div className="h-7 w-20 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const activeKpis = kpiConfigs.filter((k) => k.isActive);

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 auto-rows-[132px] grid-flow-dense gap-4 mb-6"
      aria-label="Tarjetas KPI del Dashboard"
    >
      {activeKpis.map((kpi) => (
        <SortableKpiItem
          key={kpi.id}
          kpi={kpi}
          kpis={kpis}
          cotizacionesPorEstadoTotal={cotizacionesPorEstadoTotal}
          stockBajo={stockBajo}
          onResize={(colSpan, rowSpan) => onResizeKpi?.(kpi.id, colSpan, rowSpan)}
        />
      ))}
    </div>
  );
}

export function IndicadoresTesis({ kpis }: { kpis?: DashboardKpis; view?: string }) {
  if (!kpis) return null;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-neutral-900 mb-3">Indicadores Clave de Eficiencia</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3 rounded-xl bg-zinc-50 border border-stone-200">
          <span className="text-xs text-neutral-500">Tasa de Conversión</span>
          <p className="text-lg font-bold text-neutral-900 mt-1">{kpis.tasaConversion}%</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 border border-stone-200">
          <span className="text-xs text-neutral-500">Efectividad Sugerencias IA</span>
          <p className="text-lg font-bold text-neutral-900 mt-1">{kpis.efectividadIA}%</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 border border-stone-200">
          <span className="text-xs text-neutral-500">Tiempo Promedio Cotización</span>
          <p className="text-lg font-bold text-neutral-900 mt-1">{kpis.tiempoPromedioCotizacion} min</p>
        </div>
      </div>
    </div>
  );
}
