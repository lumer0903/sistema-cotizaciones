'use client';

import React from 'react';
import {
  Search,
  RotateCw,
  PackagePlus,
  ArrowLeftRight,
  ClipboardList,
  Bell,
  Plus,
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

  const categoriaOptions = categorias.map((cat) => ({
    label: cat.nombre_categoria,
    value: cat.id_categoria.toString(),
  }));

  const almacenOptions = almacenes.map((alm) => ({
    label: alm.nombre,
    value: alm.id_almacen.toString(),
  }));

  const menuItems: DropdownMenuItem[] = [
    {
      key: 'refresh',
      label: 'Actualizar lista',
      icon: <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />,
      onClick: () => onRefresh?.(),
      disabled: loading,
    },
    ...(onMovimiento
      ? [
          {
            key: 'movimiento',
            label: 'Nuevo Movimiento',
            icon: <PackagePlus className="w-4 h-4" />,
            onClick: onMovimiento,
          },
        ]
      : []),
    ...(onTransferencia
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
      <div className="flex flex-wrap items-end justify-between gap-3 w-full">
        {/* BUSCADOR Y FILTROS ALINEADOS A LA BASE */}
        <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[280px]">
          {/* BUSCADOR */}
          <div className="flex-1 min-w-[180px] sm:min-w-[220px]">
            <Input
              label="Buscar"
              icon={<Search className="w-4 h-4" />}
              placeholder="Buscar..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Buscar productos"
            />
          </div>

          {/* CATEGORÍA */}
          <div className="w-full sm:w-44">
            <Select
              label="Categoría"
              value={selectedCategoria}
              onChange={(e) => onCategoriaChange(String(e.target.value))}
              options={[{ label: 'Seleccionar', value: '' }, ...categoriaOptions]}
              disabled={metaDisabled}
            />
          </div>

          {/* UBICACIÓN */}
          <div className="w-full sm:w-44">
            <Select
              label="Ubicación"
              value={selectedUbicacion}
              onChange={(e) => onUbicacionChange(String(e.target.value))}
              options={[{ label: 'Seleccionar', value: '' }, ...almacenOptions]}
              disabled={metaDisabled}
            />
          </div>
        </div>

        {/* BOTONES Y ACCIONES (MISMA ALTURA EXACTA h-10) */}
        <div className="flex items-center gap-2 sm:ml-auto h-9">
          <Button
            variant="primary"
            onClick={onAgregarProducto}
            className="gap-1.5 whitespace-nowrap shadow-sm"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
            <span>Agregar Producto</span>
          </Button>

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
            triggerClassName="h-9 w-9 flex items-center justify-center rounded-xl bg-transparent text-brand-subtitle hover:bg-zinc-100 hover:text-brand-ink transition-colors"
          />
        </div>
      </div>
    </FilterCard>
  );
}
