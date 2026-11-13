'use client';

import React from 'react';
import { Modal, Button } from '@/components/ui';
import { Checkbox } from '@/components/ui/Checkbox';
import { RotateCcw } from 'lucide-react';
import type { KpiConfig, WidgetConfig } from '../types/dashboard';

interface DashboardCustomizerProps {
  open: boolean;
  onClose: () => void;
  kpis: KpiConfig[];
  widgets: WidgetConfig[];
  onToggleKpi: (id: string) => void;
  onToggleWidget: (id: string) => void;
  onReset: () => void;
}

export function DashboardCustomizer({
  open,
  onClose,
  kpis,
  widgets,
  onToggleKpi,
  onToggleWidget,
  onReset,
}: DashboardCustomizerProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personalizar Dashboard"
      maxWidth="md"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={onReset}
            type="button"
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1.5"
          >
            <RotateCcw className="size-3.5" strokeWidth={1.5} />
            Restaurar diseño
          </Button>
          <Button variant="primary" onClick={onClose} type="button" className="text-xs">
            Listo
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-xs text-neutral-500">
          Selecciona los indicadores y widgets que deseas visualizar en tu pantalla. Puedes arrastrarlos directamente en la vista para reordenarlos.
        </p>

        {/* Sección Tarjetas KPI */}
        <div>
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
            Métricas y Tarjetas KPI
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {kpis.map((kpi) => (
              <label
                key={kpi.id}
                htmlFor={`kpi-${kpi.id}`}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  kpi.isActive
                    ? 'border-stone-300 bg-white shadow-xs'
                    : 'border-stone-200 bg-zinc-50 opacity-60'
                }`}
              >
                <span className="text-xs font-medium text-neutral-900 leading-tight">
                  {kpi.title}
                </span>
                <Checkbox
                  id={`kpi-${kpi.id}`}
                  checked={kpi.isActive}
                  onChange={() => onToggleKpi(kpi.id)}
                  aria-label={`Mostrar ${kpi.title}`}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Sección Widgets Gráficos */}
        <div>
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
            Widgets Gráficos y Tablas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {widgets.map((widget) => (
              <label
                key={widget.id}
                htmlFor={`widget-${widget.id}`}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  widget.isActive
                    ? 'border-stone-300 bg-white shadow-xs'
                    : 'border-stone-200 bg-zinc-50 opacity-60'
                }`}
              >
                <span className="text-xs font-medium text-neutral-900 leading-tight">
                  {widget.title}
                </span>
                <Checkbox
                  id={`widget-${widget.id}`}
                  checked={widget.isActive}
                  onChange={() => onToggleWidget(widget.id)}
                  aria-label={`Mostrar widget ${widget.title}`}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
