'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, RotateCw, Settings2 } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';
import { apiClient } from '@/lib/apiClient';
import { getUsuarios, type UsuarioLista } from '@/features/usuarios/api/usuariosApi';
import type { Almacen } from '@goldcontinent/shared/types/inventario';
import { FilterCard } from '@/components/ui/FilterCard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface DashboardFiltersBarProps {
  filters: {
    fechaInicio?: string;
    fechaFin?: string;
    idVendedor?: number;
    idAlmacen?: number;
  };
  onChange: (filters: {
    fechaInicio?: string;
    fechaFin?: string;
    idVendedor?: number;
    idAlmacen?: number;
  }) => void;
  isAdmin: boolean;
}

interface AlmacenOption {
  label: string;
  value: number;
}

interface VendedorOption {
  label: string;
  value: number;
}

export function DashboardFiltersBar({ filters, onChange, isAdmin }: DashboardFiltersBarProps) {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [vendedores, setVendedores] = useState<UsuarioLista[]>([]);
  const [loadingMetas, setLoadingMetas] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const { setCustomizing } = useDashboardStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [resAlm, resUsu] = await Promise.all([
          apiClient('/almacenes?activo=true&limit=100').catch(() => ({ data: [] })),
          getUsuarios({ limit: 100 }).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setAlmacenes(Array.isArray(resAlm?.data) ? resAlm.data : []);
        const usuarios = Array.isArray(resUsu?.data) ? resUsu.data : [];
        setVendedores(usuarios.filter((u) => u.rol === 'vendedor' && u.activo));
      } catch (e) {
        console.error('Error cargando metadatos de filtros:', e);
      } finally {
        if (!cancelled) setLoadingMetas(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const handleChange = useCallback(
    (key: string, value: string | number | undefined) => {
      onChange({ ...filters, [key]: value as any });
    },
    [filters, onChange],
  );

  const tieneFiltros = Boolean(
    filters.fechaInicio || 
    filters.fechaFin || 
    filters.idVendedor || 
    filters.idAlmacen || 
    (filters as any).idCliente
  );

  const almacenOptions: AlmacenOption[] = almacenes.map((a) => ({ label: a.nombre, value: a.id_almacen }));
  const vendedorOptions: VendedorOption[] = vendedores.map((v) => ({ label: v.nombre, value: v.id_usuario }));

  return (
    <FilterCard>
      <div className="flex flex-wrap items-end justify-between gap-3 w-full">
        {/* FILTROS ALINEADOS A LA BASE */}
        <div className="flex flex-wrap items-end gap-3 flex-1 min-w-0">
          {/* FECHA INICIO */}
          <div className="w-full sm:w-44">
            <Input
              label="Fecha inicio"
              type="date"
              value={filters.fechaInicio ?? ''}
              onChange={(e) => handleChange('fechaInicio', e.target.value || undefined)}
              placeholder="DD/MM/YYYY"
              disabled={loadingMetas}
              aria-label="Fecha de inicio del rango"
              className="w-full"
            />
          </div>

          {/* FECHA FIN */}
          <div className="w-full sm:w-44">
            <Input
              label="Fecha fin"
              type="date"
              value={filters.fechaFin ?? ''}
              onChange={(e) => handleChange('fechaFin', e.target.value || undefined)}
              placeholder="DD/MM/YYYY"
              disabled={loadingMetas}
              aria-label="Fecha de fin del rango"
              className="w-full"
            />
          </div>

          {/* VENDEDOR (solo admin) */}
          {isAdmin && (
            <div className="w-full sm:w-56">
              <Select
                label="Vendedor"
                value={filters.idVendedor ? String(filters.idVendedor) : ''}
                onChange={(e) => handleChange('idVendedor', e.target.value ? Number(e.target.value) : undefined)}
                options={[
                  { label: 'Todos los vendedores', value: '' },
                  ...vendedorOptions,
                ]}
                disabled={loadingMetas}
                placeholder="Todos los vendedores"
                className="w-full"
              />
            </div>
          )}

          {/* ALMACÉN */}
          <div className="w-full sm:w-56">
            <Select
              label="Almacén"
              value={filters.idAlmacen ? String(filters.idAlmacen) : ''}
              onChange={(e) => handleChange('idAlmacen', e.target.value ? Number(e.target.value) : undefined)}
              options={[
                { label: 'Todos los almacenes', value: '' },
                ...almacenOptions,
              ]}
              disabled={loadingMetas}
              placeholder="Todos los almacenes"
              className="w-full"
            />
          </div>
        </div>

        {/* BOTONES Y ACCIONES (MISMA ALTURA h-9) */}
        <div className="flex items-center gap-2 sm:ml-auto h-9">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoadingMetas(true);
              setRefreshTick((t) => t + 1);
            }}
            disabled={loadingMetas}
            className="gap-1.5 whitespace-nowrap h-9"
            aria-label="Actualizar opciones de filtro"
          >
            <RotateCw className={`w-4 h-4 ${loadingMetas ? 'animate-spin' : ''}`} aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({})}
            disabled={!tieneFiltros}
            className="gap-1.5 whitespace-nowrap h-9"
            aria-label="Limpiar filtros"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCustomizing(true)}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-transparent text-brand-subtitle hover:bg-zinc-100 hover:text-accent-ink transition-colors"
            aria-label="Personalizar dashboard"
          >
            <Settings2 className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* FILTROS ACTIVOS */}
      {tieneFiltros && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-200 mt-3">
          {(filters.fechaInicio || filters.fechaFin) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Rango:</span>
              {filters.fechaInicio ? filters.fechaInicio.split('-').reverse().join('/') : '...'} - {filters.fechaFin ? filters.fechaFin.split('-').reverse().join('/') : '...'}
              <button 
                onClick={() => onChange({ ...filters, fechaInicio: undefined, fechaFin: undefined })} 
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors" 
                aria-label="Remover rango de fechas"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.idVendedor && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Vendedor:</span>
              {vendedorOptions.find(v => v.value === filters.idVendedor)?.label || filters.idVendedor}
              <button 
                onClick={() => handleChange('idVendedor', undefined)} 
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors" 
                aria-label="Remover vendedor"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.idAlmacen && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Almacén:</span>
              {almacenOptions.find(a => a.value === filters.idAlmacen)?.label || filters.idAlmacen}
              <button 
                onClick={() => handleChange('idAlmacen', undefined)} 
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors" 
                aria-label="Remover almacén"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(filters as any).idCliente && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
              <span className="font-bold">Cliente:</span>
              {(filters as any).idCliente}
              <button 
                onClick={() => handleChange('idCliente', undefined)} 
                className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors" 
                aria-label="Remover cliente"
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