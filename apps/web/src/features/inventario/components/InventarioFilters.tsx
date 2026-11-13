import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Search,
  RotateCw,
  PackagePlus,
  ArrowLeftRight,
  ClipboardList,
  Bell,
  MoreVertical,
  X
} from 'lucide-react';
import { Categoria, Almacen } from '@goldcontinent/shared/types/inventario';
import { FilterCard, FilterGrid } from '@/components/ui/FilterCard';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';

interface InventarioFiltersProps {
  categorias?: Categoria[];
  almacenes?: Almacen[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCategoria: string;
  onCategoriaChange: (value: string) => void;
  selectedUbicacion: string;
  onUbicacionChange: (value: string) => void;
  selectedStockEstado: string;
  onStockEstadoChange: (value: string) => void;
  onAgregarProducto: () => void;
  onMovimiento?: () => void;
  onTransferencia?: () => void;
  onKardex?: () => void;
  onAlertas?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  metaLoading?: boolean;
  alertasCount?: number;
}

export function InventarioFilters({
  categorias = [],
  almacenes = [],
  searchValue,
  onSearchChange,
  selectedCategoria,
  onCategoriaChange,
  selectedUbicacion,
  onUbicacionChange,
  selectedStockEstado,
  onStockEstadoChange,
  onAgregarProducto,
  onMovimiento,
  onTransferencia,
  onKardex,
  onAlertas,
  onRefresh,
  loading = false,
  metaLoading = false,
  alertasCount = 0,
}: InventarioFiltersProps) {
  const metaDisabled = loading || metaLoading;
  const { can } = usePermissions();
  const canEdit = can('productos', 'edicion');

  const tieneFiltrosActivos = Boolean(
    selectedCategoria ||
    selectedUbicacion ||
    selectedStockEstado ||
    searchValue
  );

  const categoriaOptions = categorias.map((cat) => ({
    label: cat.nombre_categoria,
    value: cat.id_categoria.toString(),
  }));

  const almacenOptions = almacenes.map((alm) => ({
    label: alm.nombre,
    value: alm.id_almacen.toString(),
  }));

  const stockEstadoOptions = [
    { label: 'Todos', value: '' },
    { label: 'Stock Bajo', value: 'bajo' },
    { label: 'Stock Suficiente', value: 'disponible' },
    { label: 'Agotado', value: 'agotado' },
  ];

  const menuItems: DropdownMenuItem[] = [
    {
      key: 'refresh',
      label: 'Actualizar lista',
      icon: <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />,
      onClick: () => onRefresh?.(),
      disabled: loading,
    },
    ...(canEdit && onMovimiento
      ? [
        {
          key: 'movimiento',
          label: 'Nuevo Movimiento',
          icon: <PackagePlus className="w-4 h-4" />,
          onClick: onMovimiento,
        },
      ]
      : []),
    ...(canEdit && onTransferencia
      ? [
        {
          key: 'transferencia',
          label: 'Transferencia Global',
          icon: <ArrowLeftRight className="w-4 h-4" />,
          onClick: onTransferencia,
        },
      ]
      : []),
    ...(onKardex
      ? [
        {
          key: 'kardex',
          label: 'Kárdex Global',
          icon: <ClipboardList className="w-4 h-4" />,
          onClick: onKardex,
        },
      ]
      : []),
    ...(onAlertas
      ? [
        {
          key: 'alertas',
          label: 'Ver Alertas',
          icon: <Bell className="w-4 h-4" />,
          onClick: onAlertas,
          danger: true,
          dividerBefore: true,
          badge: alertasCount,
        },
      ]
      : []),
  ];

  return (
    <FilterCard className="w-full">
      <FilterGrid>
        {/* BUSCADOR Y FILTROS ALINEADOS A LA BASE */}
        {/* BUSCAR */}
        <div className="flex-[2] min-w-[240px] lg:min-w-[300px]">
          <Input
            variant="filter"
            label="BUSCAR"
            icon={<Search className="w-4 h-4 text-[#F8B602]" strokeWidth={2} />}
            placeholder="Buscar por código o descripción…"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
            aria-label="Buscar productos"
          />
        </div>

        {/* CATEGORÍA */}
        <div className="flex-1 min-w-[140px] max-w-[195px]">
          <Select
            variant="filter"
            label="CATEGORÍA"
            value={selectedCategoria}
            onChange={(e) => onCategoriaChange(String(e.target.value))}
            options={[{ label: 'Seleccionar', value: '' }, ...categoriaOptions]}
            disabled={metaDisabled}
          />
        </div>

        {/* UBICACIÓN */}
        <div className="flex-1 min-w-[140px] max-w-[195px]">
          <Select
            variant="filter"
            label="UBICACIÓN"
            value={selectedUbicacion}
            onChange={(e) => onUbicacionChange(String(e.target.value))}
            options={[{ label: 'Seleccionar', value: '' }, ...almacenOptions]}
            disabled={metaDisabled}
          />
        </div>

        {/* ESTADO STOCK */}
        <div className="flex-1 min-w-[140px] max-w-[195px]">
          <Select
            variant="filter"
            label="ESTADO STOCK"
            value={selectedStockEstado}
            onChange={(e) => onStockEstadoChange(String(e.target.value))}
            options={stockEstadoOptions}
            disabled={metaDisabled}
          />
        </div>

        {/* Acciones juntas, perfectamente alineadas a la derecha */}
        <div className="shrink-0 flex items-end gap-2 self-end">
          {canEdit && (
            <Button
              variant="primary"
              onClick={onAgregarProducto}
              className="h-9 px-4 gap-2 whitespace-nowrap shadow-xs"
            >
              <Plus className="size-4 text-white" strokeWidth={2} aria-hidden="true" />
              <span>Agregar Producto</span>
            </Button>
          )}

          <DropdownMenu
            items={menuItems}
            label="Acciones de inventario"
            triggerAriaLabel="Más opciones"
            trigger={
              <span className="relative flex items-center justify-center">
                <MoreVertical className="w-5 h-5" aria-hidden="true" />
                {alertasCount > 0 && (
                  <span className="absolute top-1 right-1 bg-danger w-2.5 h-2.5 rounded-full border-2 border-white" />
                )}
              </span>
            }
            triggerClassName="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-transparent text-brand-subtitle hover:bg-surface-muted hover:text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
        </div>
      </FilterGrid>

      {/* FILTROS ACTIVOS */}
      {tieneFiltrosActivos && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border-default mt-3">
          {selectedCategoria && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Categoría:</span>
              {categoriaOptions.find(c => c.value === selectedCategoria)?.label || selectedCategoria}
              <button
                onClick={() => onCategoriaChange('')}
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label="Remover categoría"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedUbicacion && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Ubicación:</span>
              {almacenOptions.find(a => a.value === selectedUbicacion)?.label || selectedUbicacion}
              <button
                onClick={() => onUbicacionChange('')}
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label="Remover ubicación"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedStockEstado && selectedStockEstado !== '' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Stock:</span>
              {stockEstadoOptions.find(s => s.value === selectedStockEstado)?.label || selectedStockEstado}
              <button
                onClick={() => onStockEstadoChange('')}
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label="Remover estado de stock"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {searchValue && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Búsqueda:</span>
              {searchValue.substring(0, 20)}{searchValue.length > 20 ? '...' : ''}
              <button
                onClick={() => onSearchChange('')}
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </FilterCard>
  );
}
