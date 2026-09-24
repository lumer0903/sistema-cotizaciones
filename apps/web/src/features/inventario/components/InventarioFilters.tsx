'use client';

import React from 'react';
import { Search, RotateCw, PackagePlus, ArrowLeftRight, ClipboardList, Bell, Plus } from 'lucide-react';
import { Categoria, Almacen } from '@goldcontinent/shared/types/inventario';
import { FilterCard } from '@/components/ui/FilterCard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

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

  return (
    <FilterCard className="p-4">
      <div className="flex flex-wrap lg:flex-nowrap items-end gap-4 w-full">
        {/* BUSCADOR */}
        <div className="flex-1 min-w-[240px]">
          <Input
            label="BUSCAR"
            icon={<Search className="w-4 h-4" />}
            placeholder="Buscar"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* CATEGORÍA */}
        <div className="w-40">
          <Select
            label="CATEGORÍA"
            value={selectedCategoria}
            onChange={(e) => onCategoriaChange(String(e.target.value))}
            options={[{ label: 'Seleccionar', value: '' }, ...categoriaOptions]}
            disabled={metaDisabled}
          />
        </div>

        {/* UBICACIÓN */}
        <div className="w-40">
          <Select
            label="UBICACIÓN"
            value={selectedUbicacion}
            onChange={(e) => onUbicacionChange(String(e.target.value))}
            options={[{ label: 'Seleccionar', value: '' }, ...almacenOptions]}
            disabled={metaDisabled}
          />
        </div>

        {/* BLOQUE DE ACCIONES */}
        <div className="flex items-center gap-2 h-10 ml-auto">
          {/* Refrescar */}
          <Button
            variant="yellowOutline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title="Actualizar lista"
            className="h-10 w-10 p-0"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Movimiento */}
          {onMovimiento && (
            <Button
              variant="yellowOutline"
              size="sm"
              onClick={onMovimiento}
              title="Nuevo Movimiento Global"
              className="h-10 w-10 p-0"
            >
              <PackagePlus className="w-4 h-4" />
            </Button>
          )}

          {/* Transferencia */}
          {onTransferencia && (
            <Button
              variant="yellowOutline"
              size="sm"
              onClick={onTransferencia}
              title="Transferencia Global"
              className="h-10 w-10 p-0"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          )}

          {/* Kardex */}
          {onKardex && (
            <Button
              variant="yellowOutline"
              size="sm"
              onClick={onKardex}
              title="Kárdex Global"
              className="h-10 w-10 p-0"
            >
              <ClipboardList className="w-4 h-4" />
            </Button>
          )}

          {/* Alertas */}
          {onAlertas && (
            <Button
              variant="danger"
              size="sm"
              onClick={onAlertas}
              title="Ver Alertas de Stock"
              className="h-10 px-3 gap-1.5 relative"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Alertas</span>
              {alertasCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {alertasCount > 9 ? '9+' : alertasCount}
                </span>
              )}
            </Button>
          )}

          {/* BOTÓN AGREGAR */}
          <Button
            variant="primary"
            size="sm"
            onClick={onAgregarProducto}
            className="h-10 px-4 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Agregar Producto</span>
          </Button>
        </div>
      </div>
    </FilterCard>
  );
}