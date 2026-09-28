'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const metaDisabled = loading || metaLoading;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categoriaOptions = categorias.map((cat) => ({
    label: cat.nombre_categoria,
    value: cat.id_categoria.toString(),
  }));

  const almacenOptions = almacenes.map((alm) => ({
    label: alm.nombre,
    value: alm.id_almacen.toString(),
  }));

  return (
    <FilterCard>
      <div className="flex flex-wrap items-end justify-between gap-3 w-full">
        {/* BUSCADOR Y FILTROS ALINEADOS A LA BASE */}
        <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[280px]">
          {/* BUSCADOR */}
          <div className="flex-1 min-w-[180px] sm:min-w-[220px]">
            <Input
              label="BUSCAR"
              icon={<Search className="w-4 h-4 text-[#8E8E8E]" />}
              placeholder="Buscar..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* CATEGORÍA */}
          <div className="w-full sm:w-44">
            <Select
              label="CATEGORÍA"
              value={selectedCategoria}
              onChange={(e) => onCategoriaChange(String(e.target.value))}
              options={[{ label: 'Seleccionar', value: '' }, ...categoriaOptions]}
              disabled={metaDisabled}
            />
          </div>

          {/* UBICACIÓN */}
          <div className="w-full sm:w-44">
            <Select
              label="UBICACIÓN"
              value={selectedUbicacion}
              onChange={(e) => onUbicacionChange(String(e.target.value))}
              options={[{ label: 'Seleccionar', value: '' }, ...almacenOptions]}
              disabled={metaDisabled}
            />
          </div>
        </div>

        {/* BOTONES Y ACCIONES (ALINEADOS A LA MISMA ALTURA EXACTA h-10) */}
        <div className="flex items-center gap-2 sm:ml-auto h-10">

          {/* BOTÓN PRINCIPAL (+ AGREGAR PRODUCTO) */}
          <Button
            variant="primary"
            onClick={onAgregarProducto}
            className="h-10 px-4 gap-1.5 whitespace-nowrap shadow-sm text-white font-bold"
          >
            <Plus className="w-5 h-5 stroke-[2.5] text-white" />
            <span className="text-white">Agregar Producto</span>
          </Button>

          {/* BOTÓN DESPLEGABLE TRES PUNTOS (SIN BORDE / GHOST) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="Más opciones"
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-transparent text-[#414141] hover:bg-[#FFF8E7] hover:text-[#F8B602] active:scale-95 transition-all focus:outline-none relative"
            >
              <MoreVertical className="w-5 h-5" />
              {alertasCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#7B1C1C] w-2.5 h-2.5 rounded-full border-2 border-white" />
              )}
            </button>

            {/* MENÚ FLOTANTE */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E4E4E4] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                {onRefresh && (
                  <button
                    onClick={() => {
                      onRefresh();
                      setIsMenuOpen(false);
                    }}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-[#414141] hover:bg-[#FFF8E7] hover:text-[#F8B602] transition-colors disabled:opacity-50"
                  >
                    <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Actualizar lista</span>
                  </button>
                )}

                {onMovimiento && (
                  <button
                    onClick={() => {
                      onMovimiento();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-[#414141] hover:bg-[#FFF8E7] hover:text-[#F8B602] transition-colors"
                  >
                    <PackagePlus className="w-4 h-4" />
                    <span>Nuevo Movimiento</span>
                  </button>
                )}

                {onTransferencia && (
                  <button
                    onClick={() => {
                      onTransferencia();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-[#414141] hover:bg-[#FFF8E7] hover:text-[#F8B602] transition-colors"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Transferencia Global</span>
                  </button>
                )}

                {onKardex && (
                  <button
                    onClick={() => {
                      onKardex();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-[#414141] hover:bg-[#FFF8E7] hover:text-[#F8B602] transition-colors"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Kárdex Global</span>
                  </button>
                )}

                {onAlertas && (
                  <>
                    <div className="my-1.5 border-t border-[#E4E4E4]" />
                    <button
                      onClick={() => {
                        onAlertas();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-[#7B1C1C] hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-[#7B1C1C]" />
                        <span>Ver Alertas</span>
                      </div>
                      {alertasCount > 0 && (
                        <span className="bg-[#7B1C1C] text-white text-[10px] font-bold h-4 px-1.5 rounded-full flex items-center justify-center">
                          {alertasCount > 9 ? '9+' : alertasCount}
                        </span>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </FilterCard>
  );
}