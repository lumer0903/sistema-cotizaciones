'use client';

import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ChartType, DashboardView, WidgetConfig } from '../store/useDashboardStore';

const CHART_TYPES: Array<{ value: ChartType; label: string }> = [
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Área' },
  { value: 'donut', label: 'Dona' },
  { value: 'table', label: 'Tabla' },
];

interface DashboardCustomizerProps {
  open: boolean;
  onClose: () => void;
  view: DashboardView;
  widgets: WidgetConfig[];
  onToggleWidget: (view: DashboardView, id: string) => void;
  onChartTypeChange: (view: DashboardView, id: string, type: ChartType) => void;
  onReset: () => void;
}

/**
 * Modal de personalización: activar/desactivar widgets y elegir el tipo de
 * representación visual (barras, área, dona, tabla) para cada uno.
 */
export function DashboardCustomizer({
  open,
  onClose,
  view,
  widgets,
  onToggleWidget,
  onChartTypeChange,
  onReset,
}: DashboardCustomizerProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personalizar Dashboard"
      maxWidth="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onReset} type="button">
            Restablecer
          </Button>
          <Button variant="primary" onClick={onClose} type="button">
            Listo
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-brand-options">
          Activa o desactiva los indicadores y elige cómo se visualizan.
        </p>

        <ul className="space-y-3">
          {widgets.map((widget) => (
            <li
              key={widget.id}
              className={cn(
                'rounded-xl border p-4 transition-colors',
                widget.isActive ? 'border-zinc-200 bg-white' : 'border-zinc-100 bg-zinc-50/60'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor={`widget-${widget.id}`}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <span className="text-sm font-semibold text-brand-subtitle">
                    {widget.title}
                  </span>
                </label>
                <input
                  id={`widget-${widget.id}`}
                  type="checkbox"
                  checked={widget.isActive}
                  onChange={() => onToggleWidget(view, widget.id)}
                  className="size-4 shrink-0 cursor-pointer accent-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  aria-label={`Activar widget ${widget.title}`}
                />
              </div>

              {widget.isActive && (
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Tipo de gráfico para ${widget.title}`}>
                  {CHART_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => onChartTypeChange(view, widget.id, type.value)}
                      aria-pressed={widget.chartType === type.value}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                        widget.chartType === type.value
                          ? 'border-accent-primary bg-accent-soft text-accent-ink'
                          : 'border-zinc-200 bg-white text-brand-options hover:border-zinc-300'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
