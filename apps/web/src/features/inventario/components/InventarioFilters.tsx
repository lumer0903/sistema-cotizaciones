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
} from 'lucide-react';
import { Categoria, Almacen } from '@goldcontinent/shared/types/inventario';
import { FilterCard } from '@/components/ui/FilterCard';
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
  selectedActivo: string;
  onActivoChange: (value: string) => void;
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
  selectedActivo,
  onActivoChange,
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
    <FilterCard>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(160px,1fr)_repeat(4,minmax(115px,0.65fr))_auto] items-end gap-3 w-full">
        {/* BUSCADOR Y FILTROS ALINEADOS A LA BASE */}
        <div className="contents">
          {/* BUSCAR */}
          <div className="min-w-0 sm:col-span-2 xl:col-span-1">
            <Input
              label="BUSCAR"
              icon={<Search className="w-4 h-4" />}
              placeholder="Buscar..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
              aria-label="Buscar productos"
            />
          </div>

          {/* CATEGORÍA */}
          <div className="min-w-0">
            <Select
              label="CATEGORÍA"
              value={selectedCategoria}
              onChange={(e) => onCategoriaChange(String(e.target.value))}
              options={[{ label: 'Seleccionar', value: '' }, ...categoriaOptions]}
              disabled={metaDisabled}
            />
          </div>

          {/* UBICACIÓN */}
          <div className="min-w-0">
            <Select
              label="UBICACIÓN"
              value={selectedUbicacion}
              onChange={(e) => onUbicacionChange(String(e.target.value))}
              options={[{ label: 'Seleccionar', value: '' }, ...almacenOptions]}
              disabled={metaDisabled}
            />
          </div>
          {/* ESTADO STOCK */}
          <div className="min-w-0">
            <Select
              label="ESTADO STOCK"
              value={selectedStockEstado}
              onChange={(e) => onStockEstadoChange(String(e.target.value))}
              options={stockEstadoOptions}
              disabled={metaDisabled}
            />
          </div>
        </div>

        {/* BOTONES Y ACCIONES (MISMA ALTURA EXACTA h-10) */}
        <div className="flex items-center justify-end gap-2 h-9">
          {canEdit && <Button
            variant="primary"
            onClick={onAgregarProducto}
            className="gap-1.5 whitespace-nowrap shadow-sm"
          >
            <span>+ Agregar Producto</span>
          </Button>}

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
            triggerClassName="h-9 w-9 flex items-center justify-center rounded-xl bg-transparent text-brand-subtitle hover:bg-zinc-100 hover:text-accent-ink transition-colors"
          />
        </div>
      </div>
    </FilterCard>
  );
}